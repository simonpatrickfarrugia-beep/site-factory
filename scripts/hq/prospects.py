#!/usr/bin/env python3
"""Prospecting engine, part 1: score every (segment x region) target per brand.

Reads hq/prospect-playbook.json plus each site's own data (Vic town search demand,
Search Console impressions per page, Trade Admin trades) and writes
hq/prospect-targets.json. The IMN HQ Worker (workers/hq) adds live CRM coverage
on top and ranks "where to prospect next".

Base score 0-100 = segment weight x region weight, where region weight comes from
search demand (people looking for that place or trade) plus a boost when Google is
already showing our page for it (a link there moves a page that is close to ranking).

Run: python3 scripts/hq/prospects.py
"""
import json
import math
import os
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def load(path, fallback):
    try:
        with open(os.path.join(ROOT, path)) as f:
            return json.load(f)
    except (OSError, ValueError):
        return fallback


def impressions_by_prefix(stats, prefix):
    total = 0
    for p in stats.get("pages", []):
        path = p.get("path", "")
        if path == prefix or path.startswith(prefix + "/"):
            total += p.get("gscImpressions") or 0
    return total


def vic_regions():
    towns = [t for t in load("data/vic/towns.json", []) if t.get("published")]
    stats = load("data/vic/stats.json", {})
    if not towns:
        return []
    top = max(math.log10((t.get("volume") or 0) + 10) for t in towns)
    out = []
    for t in towns:
        demand = math.log10((t.get("volume") or 0) + 10) / top
        imp = impressions_by_prefix(stats, "/" + t["slug"])
        boost = 0.3 * min(1.0, imp / 50)
        # Inner-city suburbs rarely have their own tourism groups; keep them but lower.
        kind = 0.5 if t.get("kind") == "suburb" else 1.0
        why = f"{t.get('volume') or 0:,} searches/mo"
        if imp:
            why += f", {imp} Google impressions on our page"
        out.append({
            "key": t["slug"],
            "label": t["name"],
            "weight": round(demand * (1 + boost) * kind, 4),
            "why": why,
            "page": f"https://victours.com.au/{t['slug']}",
        })
    return out


def trade_regions():
    data = load("data/trade-admin/trades.json", {})
    trades = data.get("trades", []) if isinstance(data, dict) else []
    stats = load("data/trade-admin/stats.json", {})
    by_trade = {}
    for t in trades:
        name = t["trade"]
        imp = impressions_by_prefix(stats, "/" + t["slug"])
        cur = by_trade.setdefault(name, {"imp": 0, "slug": t["slug"]})
        cur["imp"] += imp
    out = []
    for name, v in sorted(by_trade.items()):
        boost = 0.3 * min(1.0, v["imp"] / 50)
        why = "template page live"
        if v["imp"]:
            why += f", {v['imp']} Google impressions"
        out.append({
            "key": name.lower(),
            "label": name,
            "weight": round(1.0 * (1 + boost), 4),
            "why": why,
            "page": f"https://tradeadmin.com.au/{v['slug']}",
        })
    return out


def main():
    playbook = load("hq/prospect-playbook.json", {"brands": {}})
    targets = []
    for brand, cfg in playbook["brands"].items():
        src = cfg.get("regionSource")
        if src == "vic-towns":
            regions = vic_regions()
        elif src == "trades":
            regions = trade_regions()
        else:
            regions = [dict(r, why="set in playbook") for r in cfg.get("regions", [])]
        if not regions:
            continue
        top = max(s["weight"] for s in cfg["segments"]) * max(r["weight"] for r in regions)
        for seg in cfg["segments"]:
            for r in regions:
                fill = lambda s: s.replace("{region}", r["label"])
                base = 100 * seg["weight"] * r["weight"] / top if top else 0
                targets.append({
                    "brand": brand,
                    "key": f"{seg['key']}:{r['key']}",
                    "segment": seg["key"],
                    "segmentLabel": seg["label"],
                    "region": r["key"],
                    "regionLabel": r["label"],
                    "base": round(base, 1),
                    "why": r.get("why", ""),
                    "page": r.get("page") or seg.get("page") or cfg.get("site"),
                    "offer": fill(seg["offer"]),
                    "evidence": fill(seg["evidence"]),
                    "search": [fill(q) for q in seg.get("search", [])],
                })
    brands = {
        b: {
            "name": c["name"],
            "active": c.get("active", False),
            "weeklyCap": c.get("weeklyCap", 10),
            "perTargetCap": c.get("perTargetCap", 3),
            "site": c.get("site"),
            "mailReady": c.get("mailReady", False),
            "from": c.get("from"),
            "segments": {s["key"]: s["label"] for s in c["segments"]},
        }
        for b, c in playbook["brands"].items()
    }
    targets.sort(key=lambda t: (t["brand"], -t["base"]))
    out = {
        "_about": "Generated by scripts/hq/prospects.py from hq/prospect-playbook.json and site data. Do not edit by hand.",
        "generated": date.today().isoformat(),
        "brands": brands,
        "targets": targets,
    }
    with open(os.path.join(ROOT, "hq/prospect-targets.json"), "w") as f:
        json.dump(out, f, indent=1)
        f.write("\n")
    counts = {}
    for t in targets:
        counts[t["brand"]] = counts.get(t["brand"], 0) + 1
    print("prospect targets:", counts)


if __name__ == "__main__":
    main()
