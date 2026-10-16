#!/usr/bin/env bash
# Runs a command in CI. On failure, turns the last lines of output into a
# GitHub annotation so the error is readable without downloading logs.
# Usage: scripts/ci-run.sh "<title>" <command...>
title=$1; shift
set -o pipefail
if ! "$@" 2>&1 | tee /tmp/ci-step.log; then
  node -e "const l=require('fs').readFileSync('/tmp/ci-step.log','utf8').trim().split('\n').slice(-30).join('\n');console.log('::error title='+process.argv[1]+'::'+l.replace(/%/g,'%25').replace(/\r?\n/g,'%0A'))" "$title"
  exit 1
fi
