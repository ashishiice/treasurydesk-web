#!/usr/bin/env python3
"""Check github token embedded in treasurydesk-web remote."""
import json
import re
import subprocess
import urllib.request

url = subprocess.run(['git', 'remote', 'get-url', 'origin'], capture_output=True, text=True, cwd='/home/homepc/workspace/treasurydesk-web').stdout.strip()
m = re.match(r'https://([^@]+)@github\.com/', url)
token = m.group(1) if m else None
if not token:
    print('NO TOKEN IN REMOTE URL:', url)
else:
    req = urllib.request.Request('https://api.github.com/user', headers={'Authorization': f'Bearer {token}', 'User-Agent': 'hermes'})
    try:
        r = urllib.request.urlopen(req, timeout=15)
        d = json.loads(r.read())
        print('TOKEN OK — user:', d.get('login'))
    except urllib.error.HTTPError as e:
        print('TOKEN FAIL — HTTP', e.code, e.reason)
