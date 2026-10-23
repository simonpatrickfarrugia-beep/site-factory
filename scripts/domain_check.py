"""Check whether domain names are registered, via RDAP (the official WHOIS replacement).
Usage: python3 scripts/domain_check.py name1.com,name2.com.au,...   404 from RDAP = not registered (likely available).
Prices and final availability still come from Cloudflare Registrar at purchase."""
import json, sys, urllib.error, urllib.request

names = [n.strip().lower() for n in sys.argv[1].split(',') if n.strip()]
free, taken, unknown = [], [], []
for n in names:
    url = f'https://rdap.verisign.com/{n.rsplit(".", 1)[1]}/v1/domain/{n}' if n.endswith(('.com', '.net')) else f'https://rdap.org/domain/{n}'
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'accept': 'application/rdap+json'}), timeout=20) as r:
            d = json.load(r)
            ev = {e.get('eventAction'): e.get('eventDate', '')[:10] for e in d.get('events', [])}
            taken.append(f"{n} (registered {ev.get('registration', '?')}, expires {ev.get('expiration', '?')})")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            free.append(n)
            continue
        # Some registries (e.g. .au) block RDAP from cloud runners: fall back to DNS. No name servers (NXDOMAIN) = almost certainly unregistered.
        try:
            req = urllib.request.Request(f'https://cloudflare-dns.com/dns-query?name={n}&type=NS', headers={'accept': 'application/dns-json'})
            st = json.load(urllib.request.urlopen(req, timeout=15)).get('Status')
            if st == 3: free.append(f'{n} (no DNS)')
            elif st == 0: taken.append(f'{n} (has DNS)')
            else: unknown.append(f'{n} (DNS status {st})')
        except Exception as e2:
            unknown.append(f'{n} (HTTP {e.code}; DNS {str(e2)[:40]})')
    except Exception as e:
        unknown.append(f'{n} ({str(e)[:60]})')
out = ['## Domain check', '', f'**Not registered ({len(free)}):** ' + (', '.join(free) or 'none'), '', f'**Taken ({len(taken)}):**', *[f'- {t}' for t in taken], '', f'**Unknown ({len(unknown)}):** ' + (', '.join(unknown) or 'none')]
print('\n'.join(out))
open('domains.md', 'w').write('\n'.join(out) + '\n')
print('::notice title=domains::Not registered: ' + (', '.join(free) or 'none') + ' || Taken: ' + '; '.join(taken) + ' || Unknown: ' + (', '.join(unknown) or 'none'))
