"""
Backyard Wild clipper: runs on the ThinkStation next to OBS.

Watches the camera's low-res feed for movement at the bath. When something moves, it saves
OBS's Replay Buffer (the last 30 s, already cropped like the stream), asks Claude Haiku what's
in it, and then:
  - bird            -> keeps the clip and logs the visit in visits.jsonl
  - person / nothing -> deletes the clip (people are never kept)

Needs: Python 3.10+, `py -m pip install opencv-python obsws-python`,
OBS WebSocket server on, OBS Replay Buffer on (30 s), ANTHROPIC_API_KEY set.
Run:   py clipper.py        Stop: Ctrl+C
"""
import base64, datetime as dt, json, os, re, sys, threading, time, urllib.request
from pathlib import Path

# ======================= EDIT THESE (in Notepad) =======================
CAMERA_IP     = "192.168.1.xx"          # Tapo app -> camera -> Device Info
CAMERA_USER   = "backyardwildau"
CAMERA_PASS   = "PUT-YOUR-CAMERA-PASSWORD-HERE"
OBS_WS_PASS   = "PUT-YOUR-OBS-WEBSOCKET-PASSWORD-HERE"   # OBS -> Tools -> WebSocket Server Settings
API_KEY       = os.environ.get("ANTHROPIC_API_KEY", "")
FOLDER        = Path(r"C:\BackyardWild")  # clips + visits.jsonl live here
# =======================================================================

# The bath area, as fractions of the full camera picture (matches the OBS crop).
ROI = (0.24, 0.12, 0.93, 0.81)           # left, top, right, bottom
MOTION_RATIO  = 0.012                     # share of the bath area that must change
MOTION_FRAMES = 3                         # ...for this many frames in a row
AFTER_SECS    = 8                         # keep filming this long after movement before saving
COOLDOWN_SECS = 45                        # minimum gap between clips
DAY_HOURS     = (5, 21)                   # only check between 5am and 9pm (birds sleep at night)
MAX_PER_HOUR  = 12                        # caps keep the Claude bill tiny
MAX_PER_DAY   = 150
MODEL         = "claude-haiku-5-5"

SPECIES = ["superb-fairywren", "new-holland-honeyeater", "red-wattlebird", "little-wattlebird",
           "rainbow-lorikeet", "noisy-miner", "australian-magpie", "silvereye", "spotted-pardalote",
           "eastern-spinebill"]

os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp")
import cv2                     # noqa: E402
import obsws_python as obsws   # noqa: E402

FOLDER.mkdir(parents=True, exist_ok=True)
LOG = FOLDER / "visits.jsonl"


def now():
    return dt.datetime.now().astimezone()


def say(msg):
    print(f"{now():%H:%M:%S}  {msg}", flush=True)


def roi_crop(img):
    h, w = img.shape[:2]
    l, t, r, b = ROI
    return img[int(t * h):int(b * h), int(l * w):int(r * w)]


def stills(path, n=3):
    """Three frames from the later part of the clip (after the movement), as JPEG base64."""
    cap = cv2.VideoCapture(str(path))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
    out = []
    for f in [0.55, 0.7, 0.85][:n]:      # later frames = after the movement started
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(total * f))
        ok, frame = cap.read()
        if not ok:
            continue
        h, w = frame.shape[:2]
        if w > 1280:
            frame = cv2.resize(frame, (1280, int(h * 1280 / w)))
        ok, jpg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 82])
        if ok:
            out.append(base64.b64encode(jpg.tobytes()).decode())
    cap.release()
    return out


PROMPT = f"""These are 3 frames from a garden bird bath camera in Melbourne, Australia.
Answer with JSON only, no other text:
{{"person": true/false (any human or part of one visible),
  "bird": true/false,
  "species": one of {SPECIES} or "other" or "unsure",
  "species_name": common name if "other",
  "count": number of birds,
  "doing": "drinking" | "bathing" | "perching" | "visiting"}}
Only say bird=true if you can actually see a bird. Use "unsure" rather than guessing a species."""


def identify(images):
    content = [{"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": d}} for d in images]
    content.append({"type": "text", "text": PROMPT})
    body = json.dumps({"model": MODEL, "max_tokens": 200, "messages": [{"role": "user", "content": content}]}).encode()
    req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=body, headers={
        "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        text = json.load(r)["content"][0]["text"]
    m = re.search(r"\{.*\}", text, re.S)
    return json.loads(m.group(0)) if m else {}


def handle(path, at):
    try:
        imgs = stills(path)
        res = identify(imgs) if imgs else {}
    except Exception as e:  # keep the clip if the check failed; never lose a bird
        say(f"  check failed ({e}); clip kept: {path.name}")
        return
    if res.get("person"):
        path.unlink(missing_ok=True)
        say("  person in shot: clip deleted")
        return
    if not res.get("bird"):
        path.unlink(missing_ok=True)
        say("  no bird: clip deleted")
        return
    sp = res.get("species") if res.get("species") in SPECIES else (res.get("species") or "unsure")
    visit = {"id": at.strftime("%Y%m%d-%H%M%S"), "at": at.isoformat(timespec="seconds"), "species": sp,
             "speciesName": res.get("species_name"), "count": max(1, int(res.get("count") or 1)),
             "doing": res.get("doing") if res.get("doing") in ("drinking", "bathing", "perching", "visiting") else "visiting",
             "clip": path.name}
    with LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps(visit) + "\n")
    say(f"  BIRD: {sp} x{visit['count']}, {visit['doing']}  -> {path.name}")


def obs_client():
    while True:
        try:
            c = obsws.ReqClient(host="localhost", port=4455, password=OBS_WS_PASS, timeout=5)
            try:
                c.start_replay_buffer()
            except Exception:
                pass  # already running
            return c
        except Exception as e:
            say(f"waiting for OBS ({e})")
            time.sleep(15)


def save_clip(obs):
    obs.save_replay_buffer()
    time.sleep(3)  # let OBS finish writing the file
    return Path(obs.get_last_replay_buffer_replay().saved_replay_path)


def open_feed():
    url = f"rtsp://{CAMERA_USER}:{CAMERA_PASS}@{CAMERA_IP}:554/stream2"   # low-res feed, light on the PC
    while True:
        cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
        if cap.isOpened():
            say("camera connected")
            return cap
        say("camera not reachable, retrying in 10 s")
        time.sleep(10)


def main():
    if not API_KEY:
        sys.exit("Set ANTHROPIC_API_KEY first (see README).")
    obs = obs_client()
    cap = open_feed()
    bg = cv2.createBackgroundSubtractorMOG2(history=600, varThreshold=40, detectShadows=False)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    streak, last, hour_count, day_count, hour_key, day_key = 0, 0.0, 0, 0, None, None
    say("watching the bath")
    while True:
        ok, frame = cap.read()
        if not ok:
            cap.release()
            cap = open_feed()
            continue
        small = roi_crop(frame)
        small = cv2.resize(small, (320, int(small.shape[0] * 320 / small.shape[1])))
        mask = bg.apply(cv2.GaussianBlur(small, (5, 5), 0))
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
        ratio = cv2.countNonZero(mask) / mask.size
        streak = streak + 1 if ratio > MOTION_RATIO else 0

        t = now()
        if (t.hour, t.date()) != hour_key:
            hour_key, hour_count = (t.hour, t.date()), 0
        if t.date() != day_key:
            day_key, day_count = t.date(), 0
        if streak < MOTION_FRAMES or time.time() - last < COOLDOWN_SECS:
            continue
        if not (DAY_HOURS[0] <= t.hour < DAY_HOURS[1]) or hour_count >= MAX_PER_HOUR or day_count >= MAX_PER_DAY:
            continue

        streak, last = 0, time.time()
        hour_count += 1
        day_count += 1
        say(f"movement ({ratio:.1%}) - saving clip in {AFTER_SECS}s")
        time.sleep(AFTER_SECS)
        for _ in range(int(AFTER_SECS * 15)):   # drain frames we slept through
            cap.grab()
        try:
            path = save_clip(obs)
        except Exception as e:
            say(f"OBS save failed ({e}); reconnecting")
            obs = obs_client()
            continue
        threading.Thread(target=handle, args=(path, t), daemon=True).start()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        say("stopped")
