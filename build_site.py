#!/usr/bin/env python3
"""
Treasury Desk Web — live cron tracker site generator.

Reads the treasury disk (~/workspace/treasury-disk/register.json + archive/)
and regenerates the GitHub Pages site (~/workspace/treasurydesk-web/):

  index.html                        dashboard (job cards, status, recent activity)
  runs/<job-slug>/index.html        per-job archive: all runs in the 7-day window
  runs/<job-slug>/<ts>-<STATUS>.html  individual run page with full timestamped output

Only commits + pushes when the generated content changed (new runs since last deploy).
Prunes run pages older than KEEP_DAYS (full history stays in the local treasury disk).
"""
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
    """'2026-08-09 07:48:40' -> '09 Aug 2026, 07:48:40 IST'"""
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


def page_shell(title, body, run_path=None):
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
    # strip the leading header lines the archive adds
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
    return page_shell(title, body_html), f"runs/{slug}/{os.path.splitext(os.path.basename(fname))[0]}.html"


def job_archive_page(job, jid, slug, runs):
    rows = ""
    for d, ts, st, rel in runs:
        rows += f"<tr><td><span class='st {st}'>{st}</span></td><td>{fmt_ts(ts)}</td><td><a href='{esc(rel)}'>open output →</a></td></tr>"
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
  <table><tr><th>Status</th><th>Timestamp (IST)</th><th></th></tr>{rows}</table>
</div>"""
    return page_shell(f"{job['name']} — runs", body_html)


def build():
    reg = json.load(open(REG))
    jobs = reg["jobs"]
    now = dt.datetime.now(IST)
    cutoff = (now - dt.timedelta(days=KEEP_DAYS)).strftime("%Y%m%d")

    # --- 1. collect run files in window, prune old ones ---
    all_runs = {}  # jid -> [(d, ts, st, fname, arch_file)]
    os.makedirs(RUNS, exist_ok=True)
    for jid, j in jobs.items():
        arch_dir = os.path.join(ARCH, jid)
        if not os.path.isdir(arch_dir):
            continue
        entries = []
        for f in sorted(glob.glob(os.path.join(arch_dir, "*.txt"))):
            p = parse_run_file(f)
            if not p:
                continue
            d, ts, st = p
            if d >= cutoff:
                entries.append((d, ts, st, f))
        if entries:
            all_runs[jid] = entries

    # prune repo runs/ files older than window
    for slug_dir in glob.glob(os.path.join(RUNS, "*")):
        if not os.path.isdir(slug_dir):
            continue
        for f in glob.glob(os.path.join(slug_dir, "*.html")):
            base = os.path.basename(f)
            m = re.match(r"(\d{8})_", base)
            if m and m.group(1) < cutoff:
                os.remove(f)
        # drop empty job dirs (but keep the slug->job index regenerated below)

    # --- 2. write run pages + job archive pages ---
    job_meta = {}  # slug -> (jid, job)
    written = []
    for jid, j in jobs.items():
        entries = all_runs.get(jid, [])
        slug = slugify(j["name"], jid)
        job_meta[slug] = (jid, j)
        if not entries:
            continue
        jdir = os.path.join(RUNS, slug)
        os.makedirs(jdir, exist_ok=True)
        run_links = []
        for d, ts, st, f in entries:
            out, rel = run_page(j, jid, slug, os.path.basename(f), f)
            if out is None:
                continue
            with open(os.path.join(jdir, os.path.basename(rel)), "w") as fh:
                fh.write(out)
            run_links.append((d, ts, st, rel))
        # archive index (newest first)
        run_links_sorted = sorted(run_links, key=lambda r: r[1], reverse=True)
        page = job_archive_page(j, jid, slug, run_links_sorted)
        with open(os.path.join(jdir, "index.html"), "w") as fh:
            fh.write(page)
        written.append((jid, j, slug, run_links_sorted))

    # --- 3. index.html ---
    runs_today = 0
    ok_today = 0
    fail_today = 0
    today = now.strftime("%Y-%m-%d")
    for a in reg.get("recent_activity", []):
        if (a.get("ts") or "").startswith(today):
            runs_today += 1
            if a.get("status") == "OK":
                ok_today += 1
            elif a.get("status") == "FAIL":
                fail_today += 1
    runs_7d = sum(len(v) for v in all_runs.values())
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
            sections += f'<div class="dim small" style="text-transform:uppercase;letter-spacing:1px;margin:12px 0 6px">{esc(grp)}</div>'
            for jid, j in sorted(groups[grp], key=lambda x: x[1]["name"].lower()):
                slug = slugify(j["name"], jid)
                st = j.get("last_status", "UNKNOWN")
                last = fmt_ts(j.get("last_run_at", "—"))
                prev = esc(j.get("last_output_preview", ""))[:200]
                n_runs = len(all_runs.get(jid, []))
                link = f'<a href="runs/{esc(slug)}/index.html">all runs ({n_runs} in {KEEP_DAYS}d) →</a>' if n_runs else "no runs in window"
                sections += f"""
<div class="card">
  <div class="job-h">
    <a href="runs/{esc(slug)}/index.html" style="font-weight:700;font-size:16px">{esc(j['name'])}</a>
    <span class="st {st}">{st}</span>
    <span class="dim small">{esc(j.get('schedule_display','?'))} · {esc(j.get('deliver','?'))}</span>
  </div>
  <div class="dim small" style="margin-top:6px">Last run: {last} · {j.get('runs_total',0)} all-time ({j.get('runs_ok',0)} OK / {j.get('runs_failed',0)} failed) · {link}</div>
  <div class="dim small" style="margin-top:8px;border-top:1px dashed var(--line);padding-top:8px">{prev}</div>
</div>"""

    act = ""
    for a in reg.get("recent_activity", [])[:40]:
        jid = a.get("job_id", "")
        j = jobs.get(jid, {})
        slug = slugify(j.get("name", jid), jid)
        st = a.get("status", "UNKNOWN")
        ts_disp = a.get("ts", "")
        d_part, t_part = (ts_disp[:10], ts_disp[11:]) if len(ts_disp) > 10 else (ts_disp, "")
        # find run page link for this exact ts
        rp = ""
        for d2, ts2, st2, rel in all_runs.get(jid, []):
            if ts2 == ts_disp:
                rp = rel
                break
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
<div class="dim small" style="margin-top:16px">Every run of every scheduled job (agent + script, active + retired) is archived with its timestamped output. Click a job heading for the full 7-day run history, click <b>output →</b> for the complete delivered text. Full permanent history lives on the local treasury disk (~/workspace/treasury-disk/archive).</div>"""
    with open(os.path.join(REPO, "index.html"), "w") as fh:
        fh.write(page_shell("Treasury Desk — Live Cron Tracker", body))

    return written


def git_sync():
    """Commit + push only if the working tree changed."""
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
    n = build()
    print(f"site built: {len(n)} jobs with runs, index.html regenerated")
    if git_sync():
        print("deploy ok")
    else:
        print("no changes — nothing to push")
