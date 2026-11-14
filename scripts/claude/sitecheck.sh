#!/usr/bin/env bash
# Site check report card now. Usage: sitecheck.sh <site id|all> [nolive]   (ids in hq/sitecheck.json)
# Then git pull and read hq/reports/sitecheck/<id>.md. ~US$0.01 per site with the live Google check.
live=true; [ "$2" = "nolive" ] && live=false
exec "$(dirname "$0")/_dispatch.sh" sitecheck.yml sitecheck -f "inputs[site]=$1" -f "inputs[live]=$live"
