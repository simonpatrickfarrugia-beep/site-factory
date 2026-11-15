#!/usr/bin/env bash
# Run once, right after the repo is transferred to the IMN GitHub organisation (to-do imn-setup-nov).
# Rewrites every hard-coded "<old-owner>/site-factory" reference to the new owner, so scripts,
# workers and skills stop relying on GitHub's redirect.
# Usage: scripts/claude/repo-moved.sh <new-owner> [old-owner]
#   e.g. scripts/claude/repo-moved.sh imnetwork
# Then: review `git diff`, commit, push, wait for Check build, and reconnect Workers Builds
# (checklist in the claude.ai Project doc claude/IMN-SETUP.md).
set -euo pipefail
NEW=${1:?usage: repo-moved.sh <new-owner> [old-owner]}
OLD=${2:-simonpatrickfarrugia-beep}
cd "$(git rev-parse --show-toplevel)"
files=$(git grep -l "$OLD/site-factory" -- . ':!data' ':!backups' ':!hq/reports' || true)
[ -z "$files" ] && { echo "Nothing references $OLD/site-factory."; exit 0; }
for f in $files; do sed -i "s#$OLD/site-factory#$NEW/site-factory#g" "$f"; echo "updated $f"; done
left=$(git grep -n "$OLD" -- . ':!data' ':!backups' ':!hq/reports' || true)
[ -n "$left" ] && { echo; echo "Still mentions $OLD (check by hand; may be the workers.dev subdomain, which stays):"; echo "$left"; }
