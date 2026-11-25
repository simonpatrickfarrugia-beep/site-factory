#!/usr/bin/env bash
# Deploys one Worker folder with wrangler, then sets its secrets. Used by .github/workflows/deploy-workers.yml.
#   DIR=workers/<name>             folder holding wrangler.jsonc
#   SECRET_<NAME>=value            each one becomes Worker secret <NAME> (values are never printed)
#   CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID   read by wrangler
# Skips (exit 0, with a notice) when the folder or its code isn't in the repo yet.
#   APPLY_MIGRATIONS=true          also apply migrations/*.sql to the Worker's first D1 database first
# Order: D1 migrations (opt-in) → deploy → secrets.
set -euo pipefail
: "${DIR:?DIR is required}"
CONFIG="$DIR/wrangler.jsonc"
WRANGLER="npx --yes wrangler@4"

if [ ! -f "$CONFIG" ]; then
  echo "::notice title=deploy ${DIR#workers/}::Skipped: $CONFIG isn't in the repo yet."
  exit 0
fi

# Read name, main and the first D1 database name from the JSONC (comments stripped, strings kept intact).
read_cfg() {
  node -e '
    const src = require("fs").readFileSync(process.argv[1], "utf8");
    let out = "", i = 0, str = false;
    while (i < src.length) {
      const c = src[i], n = src[i + 1];
      if (str) { out += c; if (c === "\\") { out += n; i += 2; continue; } if (c === "\"") str = false; i++; continue; }
      if (c === "\"") { str = true; out += c; i++; continue; }
      if (c === "/" && n === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
      if (c === "/" && n === "*") { i = src.indexOf("*/", i + 2) + 2; continue; }
      out += c; i++;
    }
    const cfg = JSON.parse(out.replace(/,(\s*[}\]])/g, "$1"));
    const d1 = (cfg.d1_databases || [])[0] || {};
    console.log([cfg.name || "", cfg.main || "", d1.database_name || ""].join("|"));
  ' "$CONFIG"
}
IFS="|" read -r NAME MAIN D1NAME < <(read_cfg)
[ -n "$NAME" ] || { echo "::error title=deploy ${DIR#workers/}::No \"name\" in $CONFIG"; exit 1; }

if [ -n "$MAIN" ] && [ ! -f "$DIR/$MAIN" ]; then
  echo "::notice title=deploy $NAME::Skipped: the code ($DIR/$MAIN) isn't in the repo yet."
  exit 0
fi

# Every SECRET_* must have a value, or the Worker would go live without its key.
missing=()
while IFS= read -r var; do
  [ -n "${!var}" ] || missing+=("${var#SECRET_}")
done < <(compgen -e | grep '^SECRET_' || true)
if [ ${#missing[@]} -gt 0 ]; then
  echo "::error title=deploy $NAME::Empty GitHub secret for: ${missing[*]}. Check the repo's Actions secrets."
  exit 1
fi

if [ "${APPLY_MIGRATIONS:-false}" = true ] && [ -n "$D1NAME" ] && compgen -G "$DIR/migrations/*.sql" > /dev/null; then
  echo "Applying D1 migrations to $D1NAME"
  CI=true $WRANGLER d1 migrations apply "$D1NAME" --remote --config "$CONFIG"
fi

echo "Deploying $NAME"
log=$(mktemp)
if ! $WRANGLER deploy --config "$CONFIG" 2>&1 | tee "$log"; then
  echo "::error title=deploy $NAME::wrangler deploy failed: $(grep -m1 -iE 'error|✘' "$log" | tr -d '\r' | cut -c1-300)"
  exit 1
fi
url=$(grep -oE 'https://[a-zA-Z0-9.-]+\.workers\.dev' "$log" | head -1 || true)
version=$(grep -oE 'Current Version ID: [0-9a-f-]+' "$log" | head -1 | sed 's/.*: //' || true)

names=$(compgen -e | grep '^SECRET_' | sed 's/^SECRET_//' | paste -sd, - || true)
if [ -n "$names" ]; then
  file="${RUNNER_TEMP:-/tmp}/secrets-$NAME.json"
  trap 'rm -f "$file"' EXIT
  node -e '
    const out = {};
    for (const [k, v] of Object.entries(process.env)) if (k.startsWith("SECRET_")) out[k.slice(7)] = v;
    require("fs").writeFileSync(process.argv[1], JSON.stringify(out), { mode: 0o600 });
  ' "$file"
  echo "Setting secrets on $NAME: $names"
  $WRANGLER secret bulk "$file" --config "$CONFIG"
  rm -f "$file"
fi

echo "::notice title=deploy $NAME::Live. ${url:-custom domain only}${version:+ · version $version}${names:+ · secrets set: $names}"
