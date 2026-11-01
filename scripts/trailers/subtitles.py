#!/usr/bin/env python3
"""
Auto-generated English subtitles for a free film (sound films), with open-source Whisper (faster-whisper, CPU).
Usage: subtitles.py <slug> <audio.wav> [model]   → writes <slug>.en.vtt and <slug>.subs.json (stats)

Cleans up Whisper's known failure modes on old films: lines it invents over music or silence (high "no speech"
probability, very low confidence), the same line repeated many times in a row, and credit-style hallucinations
("Subtitles by…", "Thanks for watching"). Long lines are wrapped at 42 characters, two lines per cue at most.
"""
import json, re, sys, textwrap

from faster_whisper import WhisperModel

slug, wav = sys.argv[1], sys.argv[2]
model_name = sys.argv[3] if len(sys.argv) > 3 else 'small.en'
JUNK = re.compile(r'(subtitles? (by|provided)|thanks? for watching|transcri(bed|ption) by|amara\.org|www\.|\.com\b|please subscribe)', re.I)

model = WhisperModel(model_name, device='cpu', compute_type='int8')
segments, info = model.transcribe(wav, language='en', beam_size=1, vad_filter=True,
                                  vad_parameters={'min_silence_duration_ms': 500}, condition_on_previous_text=False)

def ts(t):
    h, rem = divmod(t, 3600); m, s = divmod(rem, 60)
    return f'{int(h):02d}:{int(m):02d}:{s:06.3f}'

cues, dropped, last, repeats = [], 0, None, 0
for seg in segments:
    text = re.sub(r'\s+', ' ', seg.text).strip()
    if not text or seg.no_speech_prob > 0.6 or seg.avg_logprob < -1.2 or JUNK.search(text):
        dropped += 1; continue
    if text == last:
        repeats += 1
        if repeats >= 2: dropped += 1; continue
    else:
        repeats = 0
    last = text
    start, end = seg.start, max(seg.end, seg.start + 0.8)
    lines = textwrap.wrap(text, 42)
    # Split long segments into cues of at most two lines, sharing the time evenly.
    chunks = [lines[i:i + 2] for i in range(0, len(lines), 2)]
    step = (end - start) / len(chunks)
    for i, ch in enumerate(chunks):
        cues.append((start + i * step, start + (i + 1) * step, '\n'.join(ch)))
    if len(cues) % 200 == 0: print(f'{len(cues)} cues, {ts(end)}', flush=True)

with open(f'{slug}.en.vtt', 'w') as f:
    f.write('WEBVTT\n\nNOTE Auto-generated English subtitles (speech recognition). movietrailer.channel\n\n')
    for i, (a, b, t) in enumerate(cues, 1):
        f.write(f'{i}\n{ts(a)} --> {ts(b)}\n{t}\n\n')
words = sum(len(t.split()) for _, _, t in cues)
stats = {'slug': slug, 'model': model_name, 'cues': len(cues), 'dropped': dropped, 'words': words,
         'duration': round(info.duration), 'last': ts(cues[-1][1]) if cues else None}
json.dump(stats, open(f'{slug}.subs.json', 'w'))
print(json.dumps(stats))
