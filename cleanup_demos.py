#!/usr/bin/env python3
"""Remove the sample demo pages from treasurydesk-web (user: no sample output on the site)."""
import os
import shutil

REPO = "/home/homepc/workspace/treasurydesk-web"
removed = []
for name in ("demos", "assets"):
    p = os.path.join(REPO, name)
    if os.path.isdir(p):
        shutil.rmtree(p)
        removed.append(name)
    elif os.path.exists(p):
        os.remove(p)
        removed.append(name)
print("removed:", removed if removed else "nothing (already clean)")
