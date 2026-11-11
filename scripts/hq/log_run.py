"""Record an AI worker's run in hq/runs.json.
Usage: python3 scripts/hq/log_run.py <worker> ok|fail "<one-line note>"
Then commit + push (message: "HQ: <worker> run [skip ci]")."""
import json, sys
from datetime import datetime, timezone
worker, status, note = sys.argv[1], sys.argv[2], (sys.argv[3] if len(sys.argv) > 3 else '')
p = 'hq/runs.json'
d = json.load(open(p))
d.setdefault('workers', {})[worker] = {
    'at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
    'ok': status == 'ok',
    'note': note[:200],
}
json.dump(d, open(p, 'w'), indent=1, ensure_ascii=False)
open(p, 'a').write('\n')
print(f"logged {worker}: {status}")
