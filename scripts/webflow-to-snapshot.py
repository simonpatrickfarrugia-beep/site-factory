"""One-off migration: turn a raw Webflow CMS export into the factory's snapshot JSON.

Usage: python3 scripts/webflow-to-snapshot.py <raw.json> data/trailers
raw.json = {"movies": [...webflow items], "buckets": [...webflow items]}
Archived items are dropped (they are not live on Webflow).
"""
import json, re, sys
from pathlib import Path

CLASSIFICATION = {
    "e3e63f33298168dad593380d3f3c31d6": "G", "7edc2349bb136f64c091ce45239577dd": "PG",
    "a4188f65553661def9071858455afda2": "PG-13", "d766ec4764f51e73b0d6343efc1783d1": "R",
    "e50b2ca7210225d7252259c9c0fc603b": "NC-17", "33abaf6108f5d61b8948730c37a6c6bd": "Not Rated",
}

def clean(s):
    s = (s or "").strip()
    return s or None

def split_list(s):
    return [p.strip() for p in (s or "").split(",") if p.strip()]

def runtime_minutes(s):
    m = re.match(r"\s*(\d+)\s*min", s or "")
    return int(m.group(1)) if m else None

raw = json.load(open(sys.argv[1]))
out = Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)

movies, id_to_slug = [], {}
for it in raw["movies"]:
    if it.get("isArchived") or it.get("isDraft"):
        continue
    f = it["fieldData"]
    embed = (f.get("trailer-embed") or {}).get("metadata") or {}
    id_to_slug[it["id"]] = f["slug"]
    movies.append({
        "id": it["id"],
        "slug": f["slug"],
        "name": f["name"].strip(),
        "year": clean(f.get("released-year")),
        "genres": split_list(f.get("genre")),
        "director": clean(f.get("director")),
        "cast": split_list(f.get("cast")),
        "runtimeMinutes": runtime_minutes(f.get("runtime")),
        "rating": CLASSIFICATION.get(f.get("classification")),
        "imdbRating": f.get("imdb-rating"),
        "boxOffice": clean(f.get("box-office")),
        "synopsis": clean(f.get("synopsis")),
        "tagline": clean(f.get("ai-tagline")),
        "summary": clean(f.get("ai-summary")),
        "youtubeId": f["youtube-trailer-id"].strip(),
        "trailerTitle": clean(embed.get("title")),
        "rentBuyUrl": clean(f.get("rent-buy-cta-url")),
        "airtableId": clean(f.get("airtable-record-id")),
        "created": it.get("createdOn"),
        "updated": it.get("lastUpdated"),
    })

collections = []
for it in raw["buckets"]:
    if it.get("isArchived") or it.get("isDraft"):
        continue
    f = it["fieldData"]
    collections.append({
        "id": it["id"],
        "slug": f["slug"],
        "name": f["name"].strip(),
        "tagline": clean(f.get("hero-tagline")),
        "introHtml": clean(f.get("hero-intro")),
        "metaDescription": clean(f.get("meta-description")),
        "featured": bool(f.get("featured")),
        "movieSlugs": [id_to_slug[i] for i in (f.get("movies-in-bucket") or []) if i in id_to_slug],
        "created": it.get("createdOn"),
        "updated": it.get("lastUpdated"),
    })

movies.sort(key=lambda m: m["name"].lower())
collections.sort(key=lambda c: c["name"].lower())
(out / "movies.json").write_text(json.dumps(movies, indent=1, ensure_ascii=False) + "\n")
(out / "collections.json").write_text(json.dumps(collections, indent=1, ensure_ascii=False) + "\n")
print(f"{len(movies)} movies, {len(collections)} collections -> {out}")
