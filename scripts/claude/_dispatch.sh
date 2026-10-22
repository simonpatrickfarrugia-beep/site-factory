#!/usr/bin/env bash
# Shared helper: dispatch a workflow, wait for its run, print the annotation with the given title.
# Usage: _dispatch.sh <workflow.yml> <annotation-title> -f inputs[x]=y ...
R=simonpatrickfarrugia-beep/site-factory; WF=$1; TITLE=$2; shift 2
before=$(gh api "repos/$R/actions/workflows/$WF/runs?per_page=1" --jq '.workflow_runs[0].id // 0')
gh api -X POST "repos/$R/actions/workflows/$WF/dispatches" -f ref=main "$@" || exit 1
id=$before; n=0
until [ "$id" != "$before" ]; do sleep 4; id=$(gh api "repos/$R/actions/workflows/$WF/runs?per_page=1" --jq '.workflow_runs[0].id // 0'); n=$((n+1)); [ $n -gt 40 ] && { echo "never started"; exit 1; }; done
n=0
until [ "$(gh api repos/$R/actions/runs/$id --jq .status)" = completed ]; do sleep 5; n=$((n+1)); [ $n -gt 120 ] && { echo "timeout: https://github.com/$R/actions/runs/$id"; exit 1; }; done
job=$(gh api "repos/$R/actions/runs/$id/jobs" --jq '.jobs[0].id')
out=$(gh api "repos/$R/check-runs/$job/annotations" --jq ".[] | select(.title==\"$TITLE\") | .message")
[ -n "$out" ] && echo "$out" || echo "$(gh api repos/$R/actions/runs/$id --jq .conclusion): no '$TITLE' output — https://github.com/$R/actions/runs/$id"
