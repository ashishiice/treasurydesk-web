#!/usr/bin/env python3
"""
Treasury Desk Web — live cron tracker site generator (v2, ledger-based).

Reads the treasury disk (~/workspace/treasury-disk/register.json + archive/ + daily/*.csv)
and regenerates the GitHub Pages site (~/workspace/treasurydesk-web/):

  index.html                        dashboard (job cards, status, recent activity)
  runs/<job-slug>/index.html        per-job archive: ALL runs in the 7-day window
  runs/<job-slug>/<ts>-<STATUS>.html  individual run page (only where the gateway
                                      stored a full output artifact; compact runs
                                      are delivered via Telegram only and are shown
                                      with an explicit "no stored output" note)

Only commits + pushes when the generated content changed (new runs since last deploy).
Prunes run pages older than KEEP_DAYS (full history stays in the local treasury disk).
"""
import argparse
import csv
import datetime as dt
import glob
import html
import json
import os
import re
import shutil
import subprocess
import sys
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")
DISK = "/home/homepc/workspace/treasury-disk"
REG = os.path.join(DISK, "register.json")
ARCH = os.path.join(DISK, "archive")
DAILY = os.path.join(DISK, "daily")
REPO = "/home/homepc/workspace/treasurydesk-web"
RUNS = os.path.join(REPO, "runs")
KEEP_DAYS = 7

CAT_ORDER = ["TREASURY", "PERSONAL"]


def esc(s):
    return html.escape(str(s or ""))


def slugify(name, jid):
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    s = re.sub(r"-+", "-", s)[:44].strip("-")
    if not s:
        s = jid
    return f"{s}-{jid[:4]}"


def fmt_ts(ts_str):
    try:
        d = dt.datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")
        return d.strftime("%d %b %Y, %H:%M:%S") + " IST"
    except Exception:
        return ts_str


def parse_run_file(fname):
    """'20260809_074840_OK.txt' -> (date_part, ts_display, status)"""
    base = os.path.basename(fname)
    m = re.match(r"(\d{8})_(\d{6})_(OK|FAIL|UNKNOWN)\.txt", base)
    if not m:
        return None
    d, t, st = m.groups()
    ts = f"{d[:4]}-{d[4:6]}-{d[6:]} {t[:2]}:{t[2:4]}:{t[4:]}"
    return (d, ts, st)


def page_shell(title, body):
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(title)} — Treasury Desk</title>
<style>
:root{{--bg:#0b0f17;--panel:#111827;--card:#151d2e;--line:#243252;--ink:#e8edf6;--dim:#8fa3bf;--gold:#d4af37;--teal:#2dd4bf;--red:#f87171;--green:#4ade80;--amber:#fbbf24;--purple:#a371f7}}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:var(--bg);color:var(--ink);font:15px/1.6 'Inter',system-ui,sans-serif;padding:28px 20px}}
.wrap{{max-width:1080px;margin:0 auto}}
a{{color:var(--teal);text-decoration:none}}a:hover{{text-decoration:underline}}
.bar{{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;border-bottom:1px solid var(--line);padding-bottom:14px;margin-bottom:20px}}
.logo{{font-size:22px;font-weight:800;letter-spacing:2px;color:var(--gold)}}
.logo small{{color:var(--dim);font-weight:400;letter-spacing:0;font-size:13px}}
.meta{{color:var(--dim);font-size:12px}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px;margin-bottom:12px}}
h2{{font-size:16px;margin-bottom:10px;color:var(--gold)}}
.st{{padding:1px 9px;border-radius:5px;font-size:11px;font-weight:700}}
.st.OK{{background:#14532d;color:#86efac}}.st.FAIL{{background:#7f1d1d;color:#fca5a5}}.st.UNKNOWN{{background:#713f12;color:#fcd34d}}
pre{{background:#0b0f17;border:1px solid var(--line);border-radius:8px;padding:16px;overflow-x:auto;font:12.5px/1.55 'JetBrains Mono',ui-monospace,monospace;color:#c9d6e8;white-space:pre-wrap;word-break:break-word}}
.back{{display:inline-block;margin-bottom:14px;color:var(--teal)}}
table{{border-collapse:collapse;width:100%;font-size:13px}}
td,th{{border:1px solid var(--line);padding:7px 10px;text-align:left}}
th{{color:var(--dim);font-weight:600;background:var(--panel)}}
.job-h{{display:flex;align-items:center;gap:12px;flex-wrap:wrap}}
.gold{{color:var(--gold)}}.purple{{color:var(--purple)}}
.dim{{color:var(--dim)}}.small{{font-size:12px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}}
.kpi{{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px;text-align:center}}
.kpi .v{{font-size:26px;font-weight:800;color:var(--gold)}}.kpi .l{{font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:1px}}
</style></head><body><div class="wrap">
{body}
</div></body></html>"""


def run_page(job, jid, slug, fname, arch_file):
    p = parse_run_file(fname)
    if not p:
        return None
    d, ts, st = p
    with open(arch_file, encoding="utf-8", errors="replace") as f:
        content = f.read()
    body = re.sub(r"^# .*?\n(# job_id.*\n)?(# run.*\n)?(# status.*\n)?\n?", "", content, flags=re.M)
    title = f"{job['name']} — {ts}"
    body_html = f"""
<a class="back" href="index.html">← All runs of {esc(job['name'])}</a>
<div class="card">
  <div class="job-h"><h1 style="font-size:19px">{esc(job['name'])}</h1>
  <span class="st {st}">{st}</span></div>
  <div class="dim small" style="margin-top:6px">
    {fmt_ts(ts)} &nbsp;·&nbsp; <span class="gold">{esc(job['category'])}</span>/{esc(job['group'])} &nbsp;·&nbsp; job {esc(jid)}
  </div>
</div>
<div class="card">
  <h2>OUTPUT — {fmt_ts(ts)}</h2>
  <pre>{esc(body)}</pre>
</div>"""
    return page_shell(title, body_html)


def job_archive_page(job, jid, slug, runs, page_map):
    """runs: list of dicts {ts, status, title}; page_map: ts -> rel run-page url"""
    rows = ""
    for r in runs:
        st = r["status"]
        rel = page_map.get(r["ts"])
        if rel:
            cell = f"<a href='{esc(rel)}'>open output →</a>"
        else:
            cell = "<span class='dim small'>no stored output (delivered via Telegram)</span>"
        rows += f"<tr><td><span class='st {st}'>{st}</span></td><td>{fmt_ts(r['ts'])}</td><td>{esc(r.get('title','')[:80])}</td><td>{cell}</td></tr>"
    body_html = f"""
<a class="back" href="../../index.html">← Treasury Desk home</a>
<div class="card">
  <div class="job-h"><h1 style="font-size:19px">{esc(job['name'])}</h1></div>
  <div class="dim small" style="margin-top:6px">
    <span class="gold">{esc(job['category'])}</span>/{esc(job['group'])} &nbsp;·&nbsp; schedule: {esc(job.get('schedule_display','?'))} &nbsp;·&nbsp; delivers to {esc(job.get('deliver','?'))} &nbsp;·&nbsp; {job.get('runs_total',0)} runs all-time ({job.get('runs_ok',0)} OK / {job.get('runs_failed',0)} failed)
  </div>
</div>
<div class="card">
  <h2>RUNS — last {KEEP_DAYS} days ({len(runs)})</h2>
  <table><tr><th>Status</th><th>Timestamp (IST)</th><th>Title</th><th></th></tr>{rows}</table>
  <div class="dim small" style="margin-top:8px">Runs without a stored output were compact messages delivered straight to Telegram — the gateway only persists full text for longer outputs. Permanent full history lives on the local treasury disk.</div>
</div>"""
    return page_shell(f"{job['name']} — runs", body_html)


def group_page(cat, grp, jobs_in_group, runs, page_map):
    """Topic page: ALL runs across every job in a group, newest first, timestamped."""
    rows = ""
    ok = sum(1 for r in runs if r["status"] == "OK")
    fail = sum(1 for r in runs if r["status"] == "FAIL")
    for r in runs:
        st = r["status"]
        jslug = r["slug"]
        rel = page_map.get(r["jid"], {}).get(r["ts"])
        job_link = f'<a href="../../runs/{esc(jslug)}/index.html">{esc(r["job_name"])}</a>'
        if rel:
            cell = f"<a href='../../{esc(rel)}'>open output →</a>"
        else:
            cell = "<span class='dim small'>no stored output (Telegram)</span>"
        rows += f"<tr><td><span class='st {st}'>{st}</span></td><td>{fmt_ts(r['ts'])}</td><td>{job_link}</td><td>{esc(r.get('title','')[:80])}</td><td>{cell}</td></tr>"
    job_links = " · ".join(
        f'<a href="../../runs/{esc(slugify(j["name"], jid))}/index.html">{esc(j["name"])}</a>'
        for jid, j in sorted(jobs_in_group.items(), key=lambda x: x[1]["name"].lower())
    )
    cls = "gold" if cat == "TREASURY" else "purple"
    body_html = f"""
<a class="back" href="../../index.html">← Treasury Desk home</a>
<div class="card">
  <div class="job-h"><h1 style="font-size:19px" class="{cls}">{esc(cat)} / {esc(grp)}</h1></div>
  <div class="dim small" style="margin-top:6px">{len(jobs_in_group)} job(s) · {len(runs)} runs in last 7 days ({ok} OK / {fail} failed) · newest first</div>
  <div class="dim small" style="margin-top:8px">Jobs: {job_links}</div>
</div>
<div class="card">
  <h2>ALL RUNS — {esc(grp)} (last 7 days)</h2>
  <table><tr><th>Status</th><th>Timestamp (IST)</th><th>Job</th><th>Title</th><th></th></tr>{rows}</table>
  <div class="dim small" style="margin-top:8px">Runs without a stored output were compact messages delivered straight to Telegram. Permanent full history lives on the local treasury disk.</div>
</div>"""
    return page_shell(f"{cat} / {grp} — runs", body_html)


def load_ledger_runs(cutoff_date):
    """Read all daily/*.csv ledgers -> {jid: [ {ts, status, title}, ... ]} within window."""
    out = {}
    for fn in sorted(glob.glob(os.path.join(DAILY, "*.csv"))):
        day = os.path.basename(fn)[:10]
        if day < cutoff_date:
            continue
        with open(fn, newline="") as f:
            for r in csv.DictReader(f):
                ts = (r.get("timestamp") or "").strip()
                jid = (r.get("job_id") or "").strip()
                if not ts or not jid:
                    continue
                if ts[:10] < cutoff_date:
                    continue
                out.setdefault(jid, []).append({
                    "ts": ts,
                    "status": r.get("status", "UNKNOWN"),
                    "title": r.get("title", ""),
                })
    for jid in out:
        out[jid].sort(key=lambda r: r["ts"])
    return out


def build():
    reg = json.load(open(REG))
    jobs = reg["jobs"]
    now = dt.datetime.now(IST)
    cutoff_d = (now - dt.timedelta(days=KEEP_DAYS)).strftime("%Y-%m-%d")
    cutoff_n = cutoff_d.replace("-", "")

    # 1. complete run list per job from daily ledgers (window)
    ledger_runs = load_ledger_runs(cutoff_d)

    # 2. run pages from archive files (full text where the gateway stored it)
    page_map = {}  # jid -> {ts: rel url}
    for jid, j in jobs.items():
        arch_dir = os.path.join(ARCH, jid)
        if not os.path.isdir(arch_dir):
            continue
        slug = slugify(j["name"], jid)
        jdir = os.path.join(RUNS, slug)
        os.makedirs(jdir, exist_ok=True)
        pm = {}
        for f in sorted(glob.glob(os.path.join(arch_dir, "*.txt"))):
            p = parse_run_file(f)
            if not p:
                continue
            d, ts, st = p
            if d < cutoff_n:
                continue
            out = run_page(j, jid, slug, os.path.basename(f), f)
            if out is None:
                continue
            rel = f"runs/{slug}/{d}_{ts[11:].replace(':','')}_{st}.html"
            with open(os.path.join(jdir, os.path.basename(rel)), "w") as fh:
                fh.write(out)
            pm[ts] = rel
        page_map[jid] = pm

    # 3. per-job archive pages (ledger list + page links)
    for jid, j in jobs.items():
        runs = ledger_runs.get(jid, [])
        if not runs:
            continue
        slug = slugify(j["name"], jid)
        page = job_archive_page(j, jid, slug, runs[::-1], page_map.get(jid, {}))
        jdir = os.path.join(RUNS, slug)
        os.makedirs(jdir, exist_ok=True)
        with open(os.path.join(jdir, "index.html"), "w") as fh:
            fh.write(page)

    # 4. topic (group) pages: all runs across every job in a group, newest first
    topics_dir = os.path.join(REPO, "topics")
    groups_meta = {}  # (cat, grp) -> {jobs: {jid: j}, runs: [...]}
    for jid, j in jobs.items():
        cat = j.get("category", "TREASURY")
        grp = j.get("group", "Other")
        key = (cat, grp)
        gm = groups_meta.setdefault(key, {"jobs": {}, "runs": []})
        gm["jobs"][jid] = j
        for r in ledger_runs.get(jid, []):
            gm["runs"].append({
                "jid": jid, "slug": slugify(j["name"], jid), "job_name": j["name"],
                "ts": r["ts"], "status": r["status"], "title": r.get("title", ""),
            })
    for (cat, grp), gm in groups_meta.items():
        gm["runs"].sort(key=lambda r: r["ts"], reverse=True)
        page = group_page(cat, grp, gm["jobs"], gm["runs"], page_map)
        gdir = os.path.join(topics_dir, cat.lower(), slugify(grp, cat.lower()[:4]))
        os.makedirs(gdir, exist_ok=True)
        with open(os.path.join(gdir, "index.html"), "w") as fh:
            fh.write(page)

    # 5. prune old run pages
    for slug_dir in glob.glob(os.path.join(RUNS, "*")):
        if not os.path.isdir(slug_dir):
            continue
        for f in glob.glob(os.path.join(slug_dir, "*.html")):
            base = os.path.basename(f)
            if base == "index.html":
                continue
            m = re.match(r"(\d{8})_", base)
            if m and m.group(1) < cutoff_n:
                os.remove(f)

    # 5. index.html
    runs_today = ok_today = fail_today = 0
    today = now.strftime("%Y-%m-%d")
    for a in reg.get("recent_activity", []):
        if (a.get("ts") or "").startswith(today):
            runs_today += 1
            if a.get("status") == "OK":
                ok_today += 1
            elif a.get("status") == "FAIL":
                fail_today += 1
    runs_7d = sum(len(v) for v in ledger_runs.values())
    active = sum(1 for j in jobs.values() if j.get("active", True))

    kpis = f"""
<div class="grid">
  <div class="kpi"><div class="v">{active}</div><div class="l">Active Jobs</div></div>
  <div class="kpi"><div class="v">{runs_today}</div><div class="l">Runs Today</div></div>
  <div class="kpi"><div class="v">{ok_today}</div><div class="l">OK Today</div></div>
  <div class="kpi"><div class="v" style="color:{'#f87171' if fail_today else 'var(--dim)'}">{fail_today}</div><div class="l">Failed Today</div></div>
  <div class="kpi"><div class="v">{runs_7d}</div><div class="l">Runs in {KEEP_DAYS} Days</div></div>
  <div class="kpi"><div class="v">{len(jobs)}</div><div class="l">Jobs Tracked</div></div>
</div>"""

    sections = ""
    for cat in CAT_ORDER:
        cats = {jid: j for jid, j in jobs.items() if j.get("category") == cat}
        if not cats:
            continue
        groups = {}
        for jid, j in cats.items():
            groups.setdefault(j.get("group", "Other"), []).append((jid, j))
        cls = "gold" if cat == "TREASURY" else "purple"
        sections += f'<h2 style="margin:26px 0 4px" class="{cls}">{cat}</h2>'
        for grp in sorted(groups):
            gslug = slugify(grp, cat.lower()[:4])
            sections += f'<div class="dim small" style="text-transform:uppercase;letter-spacing:1px;margin:12px 0 6px"><a href="topics/{cat.lower()}/{esc(gslug)}/index.html" style="color:var(--dim)">{esc(grp)} →</a></div>'
            for jid, j in sorted(groups[grp], key=lambda x: x[1]["name"].lower()):
                slug = slugify(j["name"], jid)
                st = j.get("last_status", "UNKNOWN")
                last = fmt_ts(j.get("last_run_at", "—"))
                prev = esc(j.get("last_output_preview", ""))[:200]
                if prev == "(no output artifact)":
                    prev = ""
                n_runs = len(ledger_runs.get(jid, []))
                link = f'<a href="runs/{esc(slug)}/index.html">all runs ({n_runs} in {KEEP_DAYS}d) →</a>' if n_runs else "no runs in window"
                sections += f"""
<div class="card">
  <div class="job-h">
    <a href="runs/{esc(slug)}/index.html" style="font-weight:700;font-size:16px">{esc(j['name'])}</a>
    <span class="st {st}">{st}</span>
    <span class="dim small">{esc(j.get('schedule_display','?'))} · {esc(j.get('deliver','?'))}</span>
  </div>
  <div class="dim small" style="margin-top:6px">Last run: {last} · {j.get('runs_total',0)} all-time ({j.get('runs_ok',0)} OK / {j.get('runs_failed',0)} failed) · {link}</div>
  {f'<div class="dim small" style="margin-top:8px;border-top:1px dashed var(--line);padding-top:8px">{prev}</div>' if prev else ''}
</div>"""

    act = ""
    for a in reg.get("recent_activity", [])[:40]:
        jid = a.get("job_id", "")
        j = jobs.get(jid, {})
        slug = slugify(j.get("name", jid), jid)
        st = a.get("status", "UNKNOWN")
        ts_disp = a.get("ts", "")
        d_part, t_part = (ts_disp[:10], ts_disp[11:]) if len(ts_disp) > 10 else (ts_disp, "")
        rp = page_map.get(jid, {}).get(ts_disp, "")
        link = f'<a href="runs/{esc(slug)}/index.html">{esc(j.get("name","?"))[:70]}</a>'
        rlink = f' <a href="{esc(rp)}">output →</a>' if rp else ""
        act += f"<tr><td><span class='st {st}'>{st}</span></td><td>{esc(d_part)} {esc(t_part)}</td><td>{link}</td><td>{esc(a.get('category',''))}/{esc(a.get('group',''))}</td><td>{esc(a.get('title',''))[:60]}</td><td>{rlink}</td></tr>"

    body = f"""
<div class="bar">
  <div class="logo">🏛️ TREASURY DESK <small>— live cron tracker</small></div>
  <div class="meta">Last updated {now.strftime('%d %b %Y, %H:%M:%S')} IST · regenerates automatically after every cron run · <a href="https://github.com/ashishiice/treasurydesk-web">source</a></div>
</div>
{kpis}
{sections}
<h2 style="margin:28px 0 8px">RECENT ACTIVITY (last 40 runs)</h2>
<div class="card" style="padding:8px"><table><tr><th>St</th><th>Time (IST)</th><th>Job</th><th>Area</th><th>Title</th><th></th></tr>{act}</table></div>
<div class="dim small" style="margin-top:16px">Every run of every scheduled job (agent + script, active + retired) is archived with its timestamped output. Click a job heading for the full 7-day run history; runs with a stored artifact link to the complete delivered text (compact runs are delivered via Telegram only). Permanent full history lives on the local treasury disk (~/workspace/treasury-disk/archive).</div>"""
    with open(os.path.join(REPO, "index.html"), "w") as fh:
        fh.write(page_shell("Treasury Desk — Live Cron Tracker", body))

    return ledger_runs


def git_sync():
    r = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True, cwd=REPO)
    if not r.stdout.strip():
        return False
    subprocess.run(["git", "add", "-A"], cwd=REPO, check=True)
    msg = f"treasury desk: live cron tracker update {dt.datetime.now(IST).strftime('%Y-%m-%d %H:%M:%S')} IST"
    subprocess.run(["git", "commit", "-m", msg], cwd=REPO, check=True)
    p = subprocess.run(["git", "push", "origin", "main"], cwd=REPO, capture_output=True, text=True)
    if p.returncode != 0:
        print("PUSH FAILED:", p.stderr[-500:])
        return False
    print("pushed:", msg)
    return True


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()
    lr = build()
    if not args.quiet:
        print(f"site built: {len(lr)} jobs with runs in window, index.html regenerated")
    if git_sync():
        if not args.quiet:
            print("deploy ok")
    elif not args.quiet:
        print("no changes — nothing to push")
