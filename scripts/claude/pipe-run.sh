#!/usr/bin/env bash
# Usage: pipe-run.sh <job> [dry]  — dispatches the pipeline-run workflow and prints the result annotation.
R=simonpatrickfarrugia-beep/site-factory; JOB=$1; DRY=${2:-false}
before=$(gh api "repos/$R/actions/workflows/pipeline-run.yml/runs?per_page=1" --jq '.workflow_runs[0].id')
gh api -X POST repos/$R/actions/workflows/pipeline-run.yml/dispatches -f ref=main -f "inputs[job]=$JOB" -F "inputs[dry]=$DRY" || exit 1
id=$before; n=0
until [ "$id" != "$before" ]; do id=$(gh api "repos/$R/actions/workflows/pipeline-run.yml/runs?per_page=1" --jq '.workflow_runs[0].id'); sleep 4; n=$((n+1)); [ $n -gt 40 ] && { echo "$JOB: never started"; exit 1; }; done
# The result annotation appears once the call returns; don't wait for the job wrapper to finish.
n=0
while :; do
  url=$(gh api "repos/$R/actions/runs/$id/jobs" --jq '.jobs[0].check_run_url // empty')
  [ -n "$url" ] && msg=$(gh api "$url/annotations" --jq '.[] | select(.title=="pipeline") | .annotation_level+": "+.message' 2>/dev/null) && [ -n "$msg" ] && { echo "$JOB → $msg"; exit 0; }
  s=$(gh api repos/$R/actions/runs/$id --jq '.status+" "+(.conclusion//"")'); if [[ "$s" == completed* ]]; then sleep 5; msg=$(gh api "$url/annotations" --jq '.[] | select(.title=="pipeline") | .annotation_level+": "+.message' 2>/dev/null); [ -n "$msg" ] && { echo "$JOB → $msg"; exit 0; }; echo "$JOB: $s (no result)"; exit 1; fi
  sleep 6; n=$((n+1)); [ $n -gt 80 ] && { echo "$JOB: timeout"; exit 1; }
done
