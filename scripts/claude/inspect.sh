#!/usr/bin/env bash
# Read built pages from any branch before they go live. Usage: inspect.sh <brand> <branch> "/path /path2"
exec "$(dirname "$0")/_dispatch.sh" inspect.yml inspect -f "inputs[brand]=$1" -f "inputs[ref]=$2" -f "inputs[paths]=$3"
