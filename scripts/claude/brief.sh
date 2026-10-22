#!/usr/bin/env bash
# Rebuild the daily brief now (also runs every morning) and print it. Usage: brief.sh
"$(dirname "$0")/_dispatch.sh" brief.yml brief >/dev/null
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)" && git pull -q && cat hq/brief.md
