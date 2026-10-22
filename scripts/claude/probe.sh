#!/usr/bin/env bash
# Look at live pages. Usage: probe.sh "https://a.com/x https://b.com/y" ["regex to find"]
exec "$(dirname "$0")/_dispatch.sh" probe.yml probe -f "inputs[urls]=$1" -f "inputs[find]=${2:-}"
