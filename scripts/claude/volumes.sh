#!/usr/bin/env bash
# Google monthly searches. Usage: volumes.sh "kw one|kw two|…" [location: 2840 US (default) | 2036 AU]. ~US$0.09 a run.
exec "$(dirname "$0")/_dispatch.sh" lookup.yml lookup -f "inputs[keywords]=$1" -f "inputs[location]=${2:-2840}"
