#!/usr/bin/env bash
# Live SEO audit of a whole site. Usage: seo-audit.sh https://victours.com.au
exec "$(dirname "$0")/_dispatch.sh" seo-audit.yml seo -f "inputs[site]=$1"
