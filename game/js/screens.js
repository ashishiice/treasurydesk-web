/* Screens: intro, hub, track, roster, certificates, settings */
(function () {
  const D = window.D, F = D.FIRM;
  const S = (D.screens = {});
  D.TRACKS = {
    bo: { name: 'Back Office', role: 'Settlements & Operations', icon: '📋', color: 'var(--cyan)', live: true, cert: 'Certified Back Office Treasury Professional' },
    mo: { name: 'Mid Office', role: 'Risk, ALM & Control', icon: '🛰', color: 'var(--violet)', live: false, phase: 'Phase 2' },
    fo: { name: 'Front Office', role: 'Dealing & Funding', icon: '⚡', color: 'var(--amber)', live: false, phase: 'Phase 2' },
    tr: { name: 'Treasurer', role: 'ALCO, Board & Strategy', icon: '👑', color: 'var(--gold)', live: false, phase: 'Phase 3', gate: true }
  };

  /* ---------- level logic ---------- */
  D.reqs = function (k) {
    const tp = D.tp(k), won = Object.values(tp.bosses).filter((b) => b.won).length;
    return [
      { l: 'L1 · Analyst', t: 'Complete 1 Learn drill', ok: tp.learn >= 1 },
      { l: 'L2 · Associate', t: `Pass 3 simulations or test drills at ≥70% (${Math.min(tp.simPasses, 3)}/3)`, ok: tp.simPasses >= 3 },
      { l: 'L3 · Manager', t: `Defeat 1 Black Swan (${Math.min(won, 1)}/1)`, ok: won >= 1 },
      { l: 'L4 · Senior', t: `Certification exam ≥80% (best ${tp.examBest}%)`, ok: tp.examBest >= 80 },
      { l: 'L5 · Certified', t: `Exam ≥85% + 2 Black Swans (${won}/2) + a Clean Day ${tp.cleanDay ? '✓' : '✗'}`, ok: tp.examBest >= 85 && won >= 2 && tp.cleanDay }
    ];
  };
  D.level = (k) => { const r = D.reqs(k); let n = 0; while (n < 5 && r[n].ok) n++; return n; };
  D.checkCert = function (k) {
    const p = D.me(); if (D.level(k) < 5 || p.certs.find((c) => c.track === k)) return;
    const tp = D.tp(k), T = D.TRACKS[k];
    D.certIssue(k, T.cert, `${T.role} · NBFC Treasury`, tp.examBest);
    D.addXP(1000);
    setTimeout(() => D.celebrate('CERTIFIED', 'L5', `${T.cert}. Your certificate is in the Certs tab.`), 400);
  };

  /* ---------- nav ---------- */
  function nav(on) {
    const n = D.el(`<div class="nav"><div>${[['hub', '🏛', 'Floor'], ['roster', '🏆', 'Roster'], ['certs', '🎖', 'Certs'], ['settings', '⚙', 'Settings']].map((x) => `<button data-s="${x[0]}" class="${x[0] === on ? 'on' : ''}"><span>${x[1]}</span>${x[2]}</button>`).join('')}</div></div>`);
    n.querySelectorAll('button').forEach((b) => (b.onclick = () => { D.sfx('tap'); D.stack = []; D.go(S[b.dataset.s]); }));
    return n;
  }

  /* ---------- intro / onboarding ---------- */
  S.intro = function (app) {
    app.style.setProperty('--accent', 'var(--cyan)');
    app.innerHTML = `<div class="splash"><div class="hero"><div class="brand">THE DESK</div><div class="sub">Treasury Ascent · ${F}</div></div><div class="type" id="ty"></div><div id="form" style="opacity:0;transition:opacity .6s"></div></div>`;
    const lines = [`> ${F} Treasury · 08:59:12 IST`, '> TREPS opens in 48 seconds.', '> ₹300 Cr of CP matures at 15:00.', '> The dealing room needs operators who', '  don\'t break. Settlement. Risk. Dealing.', '  And one day — the Treasurer\'s chair.', '', '> Identify yourself.'];
    const el = D.$('#ty'); let i = 0, j = 0, out = '';
    const tick = setInterval(() => {
      if (i >= lines.length) { clearInterval(tick); el.innerHTML = D.esc(out); showForm(); return; }
      if (j <= lines[i].length) { el.innerHTML = D.esc(out + lines[i].slice(0, j)) + '<span class="cur"></span>'; j++; if (j % 3 === 0) D.sfx('tick'); }
      else { out += lines[i] + '\n'; i++; j = 0; }
    }, 28);
    D.cleanup = () => clearInterval(tick);
    function showForm() {
      const f = D.$('#form');
      f.innerHTML = `<input class="in" id="nm" placeholder="Your name (as on certificate)" maxlength="40" autocomplete="off"><input class="in" id="di" placeholder="Desk / Employee ID (optional)" maxlength="20" autocomplete="off"><button class="btn pri" id="go" style="margin-top:8px">Take your seat →</button>`;
      f.style.opacity = 1;
      D.$('#go').onclick = () => { const n = D.$('#nm').value.trim(); if (n.length < 2) { D.toast('Enter your name'); D.sfx('bad'); return; } D.newProfile(n, D.$('#di').value); D.sfx('level'); D.home(); };
    }
    el.onclick = () => { clearInterval(tick); el.innerHTML = D.esc(lines.join('\n')); showForm(); };
  };

  /* ---------- hub ---------- */
  S.hub = function (app) {
    const p = D.me(), rk = D.rank(p.xp); app.style.setProperty('--accent', 'var(--cyan)');
    const done = p.daily === D.today();
    const certN = ['bo', 'mo', 'fo'].filter((k) => p.certs.find((c) => c.track === k)).length;
    app.innerHTML = `<div class="hero"><div class="brand">THE DESK</div><div class="sub">Treasury Ascent · ${F}</div></div>
      <div class="card"><div class="me"><div class="av">${D.esc(p.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase())}</div><div style="flex:1;min-width:0"><b>${D.esc(p.name)}</b><div class="mute" style="font-size:12px">${rk.name} · <span class="mono">${D.fmt(p.xp, 0)} XP</span></div><div class="bar" style="margin-top:6px"><i style="width:${rk.pct * 100}%"></i></div></div><div style="text-align:center"><div style="font-size:22px">🔥</div><b class="mono">${p.streak.n}</b></div></div></div>
      <div class="card glow tile" id="daily" style="--accent:var(--amber);min-height:0"><div class="row"><div style="flex:0 0 auto;font-size:30px">🔔</div><div><h3>Market Open · Daily 5</h3><p>${done ? 'Done for today ✓ — come back tomorrow to keep the streak.' : '5 questions · 3 minutes · confidence-weighted. Keeps your streak alive.'}</p></div></div></div>
      <div class="topic" style="margin:16px 0 4px">Career tracks</div>
      ${Object.entries(D.TRACKS).map(([k, t]) => {
        const lv = t.live ? D.level(k) : 0, locked = !t.live;
        return `<div class="card track ${locked ? 'locked' : ''}" data-k="${k}" style="--accent:${t.color}"><div class="ic">${t.icon}</div><div style="flex:1"><h3>${t.name}</h3><div class="mute" style="font-size:12px">${t.role}</div>${t.live ? `<div class="ladder">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= lv ? 'on' : ''}"></i>`).join('')}</div><div class="lv">LEVEL ${lv}/5</div>` : `<div class="lv" style="margin-top:6px">${t.gate ? `🔒 Certify BO + MO + FO (${certN}/3) · ${t.phase}` : '🔒 ' + t.phase + ' — in build'}</div>`}</div></div>`;
      }).join('')}
      <small class="note">Market levels across the game are synthetic. Regulatory references carry a status tag: VERIFIED / LIVE-VERIFY / BEST PRACTICE.</small>`;
    app.appendChild(nav('hub'));
    D.$('#daily').onclick = () => { if (done) { D.toast('Daily done — streak safe 🔥'); return; } D.sfx('tap'); D.go(S.daily); };
    D.$$('.track').forEach((c) => (c.onclick = () => { const t = D.TRACKS[c.dataset.k]; D.sfx('tap'); if (!t.live) { D.toast(t.gate ? 'The Treasurer\'s chair opens after all three certifications.' : `${t.name} arrives in ${t.phase}.`); return; } D.go(S.track, { k: c.dataset.k }); }));
  };

  /* ---------- daily ---------- */
  S.daily = function (app) {
    const qs = D.quiz.build('bo', 3, 2);
    D.quiz.run(app, { title: 'Market Open', sub: 'Daily 5 · ' + D.today(), qs, mode: 'daily', total: 180, conf: true, accent: 'var(--amber)',
      onDone(res) {
        const p = D.me(), t = D.today(), y = new Date(Date.now() - 864e5); const ys = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
        if (p.daily !== t) { p.streak.n = p.streak.last === ys ? p.streak.n + 1 : 1; p.streak.last = t; p.daily = t; }
        const xp = D.addXP(30 + Math.round(res.pct) + p.streak.n * 5); D.logEvent(`Daily 5: ${res.pct}%`);
        if (p.streak.n >= 7) D.badge('streak-7', '7-day streak'); D.save();
        return { kicker: `Streak ${p.streak.n} 🔥`, xp, after: () => D.home() };
      } });
  };

  /* ---------- track ---------- */
  S.track = function (app, { k }) {
    const T = D.TRACKS[k], tp = D.tp(k), lv = D.level(k), R = D.reqs(k), p = D.me();
    D.checkCert(k);
    app.style.setProperty('--accent', T.color);
    app.appendChild(D.top(T.name, T.role));
    const cooldown = tp.examNext && Date.now() < tp.examNext ? tp.examNext - Date.now() : 0;
    const examOpen = lv >= 2 && !cooldown;
    const b = (id) => tp.bosses[id] || {};
    const html = `
      <div class="card glow"><div class="row"><div><div class="topic">Level ${lv}/5</div><h3 style="margin-top:4px">${lv ? R[lv - 1].l.split('· ')[1] : 'Trainee'}</h3></div><div style="flex:0 0 auto;font-size:34px">${T.icon}</div></div>
        <div class="ladder">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= lv ? 'on' : ''}"></i>`).join('')}</div>
        ${R.map((r) => `<div class="req ${r.ok ? 'ok' : ''}"><b>${r.ok ? '✓' : '○'}</b><span><b style="width:auto">${r.l}</b> — ${D.esc(r.t)}</span></div>`).join('')}</div>
      <div class="topic" style="margin:14px 0 4px">Train</div>
      <div class="grid2">
        <div class="card tile" data-a="learn"><div class="em">📘</div><h3>Learn drill</h3><p>10 questions, no timer, 50:50 hints, full explanations.</p><span class="best">Done ${tp.learn}×</span></div>
        <div class="card tile" data-a="test"><div class="em">⏱</div><h3>Test drill</h3><p>15 questions · 45s each · confidence scoring.</p><span class="best">Best ${tp.quizBest}%</span></div>
      </div>
      <div class="topic" style="margin:14px 0 4px">Simulate</div>
      <div class="grid2">
        <div class="card tile" data-a="spot"><div class="em">🔍</div><h3>Spot the Break</h3><p>Match 6 live confirmations against tickets before cut-off.</p><span class="best">Best ${(tp.sims.spot || {}).best || 0} pts</span></div>
        <div class="card tile" data-a="water"><div class="em">💧</div><h3>Cash Waterfall</h3><p>Run the intraday cash position. Fund the critical path.</p><span class="best">Best ${(tp.sims.waterfall || {}).best || 0}/100</span></div>
      </div>
      <div class="topic" style="margin:14px 0 4px">Black Swans</div>
      <div class="grid2">
        ${Object.entries(D.BOSSES).filter(([, B]) => B.track === k).map(([id, B]) => `<div class="card tile boss" data-b="${id}"><div class="em">${B.icon}</div><h3>${D.esc(B.name)}</h3><p>${D.esc(B.inspired)}</p><span class="best">${b(id).won ? '✓ Defeated · ' : ''}Best ${b(id).best || 0}%</span></div>`).join('')}
      </div>
      <div class="topic" style="margin:14px 0 4px">Certify</div>
      <div class="card tile exam ${examOpen ? '' : 'dis'}" data-a="exam" style="min-height:0"><div class="row"><div style="flex:0 0 auto;font-size:30px">🎓</div><div><h3>Certification exam</h3><p>30 questions · 25 min · proctored (leaving the app = strike, 3 strikes = void) · confidence scoring. ≥80% → L4, ≥85% → L5 eligibility.</p>
        <span class="best">${lv < 2 ? '🔒 Unlocks at L2' : cooldown ? '⏳ Retake in ' + Math.ceil(cooldown / 36e5) + 'h' : 'Best ' + tp.examBest + '%'}</span></div></div></div>`;
    app.insertAdjacentHTML('beforeend', html);
    D.$$('[data-a]', app).forEach((t) => (t.onclick = () => { D.sfx('tap'); act(t.dataset.a); }));
    D.$$('[data-b]', app).forEach((t) => (t.onclick = () => { D.sfx('tap'); D.go(D.boss, { id: t.dataset.b }); }));

    function act(a) {
      if (a === 'spot') return D.go(D.spot, { k });
      if (a === 'water') return D.go(D.waterfall, { k });
      if (a === 'learn') return D.go((ap) => D.quiz.run(ap, { title: 'Learn drill', sub: T.name, qs: D.quiz.build(k, 7, 3), mode: 'learn', hints: true, accent: T.color,
        onDone(res) { const t = D.tp(k); t.learn++; const xp = D.addXP(res.right * 10 + 20); D.logEvent(`Learn drill: ${res.right}/${res.n}`); D.save(); if (t.learn === 1) setTimeout(() => D.celebrate('LEVEL UP', 'L1', 'Analyst. The desk has noticed you.'), 300); return { kicker: 'Learn drill', xp }; } }));
      if (a === 'test') return D.go((ap) => D.quiz.run(ap, { title: 'Test drill', sub: T.name, qs: D.quiz.build(k, 10, 5), mode: 'test', perQ: 45, conf: true, accent: T.color,
        onDone(res) { const t = D.tp(k); t.quizBest = Math.max(t.quizBest, res.pct); if (res.pct >= 70) t.simPasses++; const xp = D.addXP(Math.round(res.pct * 2) + 20); D.logEvent(`Test drill: ${res.pct}%`); D.save(); return { kicker: 'Test drill', xp, passMark: 70, note: 'Drills ≥70% count towards L2.' }; } }));
      if (a === 'exam') return D.confirm('Start certification exam?', '30 questions · 25 minutes · proctored. Leaving the app counts as a strike; 3 strikes voids the attempt. A score below 85% locks retakes for 24 hours.', 'Begin', () =>
        D.go((ap) => D.quiz.run(ap, { title: 'Certification exam', sub: T.name + ' · proctored', qs: D.quiz.build(k, 20, 10), mode: 'exam', total: 25 * 60, conf: true, proctor: true, accent: 'var(--gold)',
          onDone(res) {
            const t = D.tp(k); t.examAttempts = (t.examAttempts || 0) + 1; if (!res.voided) t.examBest = Math.max(t.examBest, res.pct);
            if (res.pct < 85) t.examNext = Date.now() + 24 * 36e5;
            const xp = D.addXP(res.voided ? 0 : Math.round(res.pct * 4)); D.logEvent(`Exam: ${res.voided ? 'VOID' : res.pct + '%'}`); D.save();
            if (res.pct >= 90) D.badge('exam-90-' + k, 'Distinction — exam ≥90%');
            return { kicker: 'Certification exam', xp, passMark: 85, note: D.level(k) >= 5 ? 'All L5 requirements met — certificate issued on the track screen.' : res.pct >= 85 ? 'Exam standard met. Complete the remaining L5 requirements to receive the certificate.' : 'Retake available in 24 hours. Review the explanations below.' };
          } })));
    }
  };

  /* ---------- roster ---------- */
  S.roster = function (app) {
    app.style.setProperty('--accent', 'var(--amber)');
    const ps = Object.values(D.S.profiles).sort((a, b) => b.xp - a.xp);
    app.innerHTML = `<div class="hero"><div class="brand" style="font-size:28px">ROSTER</div><div class="sub">Desk leaderboard · this device</div></div>
      ${ps.map((p, i) => `<div class="card track" data-p="${p.id}" style="--accent:${i === 0 ? 'var(--gold)' : 'var(--cyan)'}"><div class="ic mono">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1)}</div><div style="flex:1;min-width:0"><h3>${D.esc(p.name)}${p.id === D.S.active ? ' <span class="pill on">YOU</span>' : ''}</h3><div class="mute" style="font-size:12px">${D.rank(p.xp).name} · ${p.certs.length} cert(s) · 🔥${p.streak.n}${p.deskId ? ' · ' + D.esc(p.deskId) : ''}</div></div><b class="mono">${D.fmt(p.xp, 0)}</b></div>`).join('')}
      <button class="btn" id="add">＋ Add a player on this device</button><small class="note">Tap a player to switch seats. Each player's progress is stored on this device only.</small>`;
    app.appendChild(nav('roster'));
    D.$$('[data-p]', app).forEach((c) => (c.onclick = () => { if (c.dataset.p === D.S.active) return; D.S.active = c.dataset.p; D.save(); D.sfx('deal'); D.toast('Switched to ' + D.me().name); D.go(S.roster, null, true); }));
    D.$('#add').onclick = () => { D.stack = []; D.go(S.intro); };
  };

  /* ---------- certificates ---------- */
  S.certs = function (app) {
    app.style.setProperty('--accent', 'var(--gold)');
    const p = D.me();
    app.innerHTML = `<div class="hero"><div class="brand" style="font-size:28px">CERTIFICATES</div><div class="sub">${D.esc(p.name)}</div></div>
      ${p.certs.length ? '' : `<div class="card"><p class="mute" style="line-height:1.5">No certificates yet. Reach L5 in a track: exam ≥85%, two Black Swans defeated and a Clean Day in Spot the Break.</p></div>`}
      <div id="cl"></div>
      <div class="card"><div class="topic">Badges</div><div style="margin-top:6px">${p.badges.length ? p.badges.map((b) => `<span class="badge">🏅 ${D.esc((p.badgeNames || {})[b] || b)}</span>`).join('') : '<span class="mute" style="font-size:13px">None yet.</span>'}</div></div>
      <div class="card"><div class="topic">Recent activity</div>${p.log.slice(0, 12).map((l) => `<div class="stat"><span style="font-size:13px">${D.esc(l.text)}</span><span class="dim mono" style="font-size:11px">${new Date(l.t).toLocaleDateString('en-IN')}</span></div>`).join('') || '<span class="mute" style="font-size:13px">Nothing yet.</span>'}</div>`;
    const cl = D.$('#cl');
    p.certs.forEach((c) => {
      const url = D.certDraw(c);
      const card = D.el(`<div class="card"><img class="cert-img" alt="Certificate" src="${url}"><div class="row" style="margin-top:10px"><button class="btn pri amber">Share / Save</button></div><small class="note mono">ID ${c.id}</small></div>`);
      card.querySelector('button').onclick = () => D.certShare(url, 'TheDesk-' + c.track.toUpperCase() + '-' + c.id);
      cl.appendChild(card);
    });
    app.appendChild(nav('certs'));
  };

  /* ---------- settings ---------- */
  S.settings = function (app) {
    app.style.setProperty('--accent', 'var(--violet)');
    const st = D.S.settings, p = D.me();
    const all = D.content.bo.S, cnt = (s) => all.filter((q) => q.s === s).length;
    app.innerHTML = `<div class="hero"><div class="brand" style="font-size:28px">SETTINGS</div><div class="sub">v${D.VERSION}</div></div>
      <div class="card"><div class="stat"><span>Sound</span><button class="pill ${st.sound ? 'on' : ''}" data-t="sound">${st.sound ? 'ON' : 'OFF'}</button></div><div class="stat"><span>Haptics</span><button class="pill ${st.haptics ? 'on' : ''}" data-t="haptics">${st.haptics ? 'ON' : 'OFF'}</button></div></div>
      <div class="card"><div class="topic">Progress backup</div><p class="mute" style="font-size:13px">Copy your progress code to move to another device, or paste a code to restore.</p><div class="row"><button class="btn" id="ex">Export code</button><button class="btn" id="im">Import code</button></div><div id="io"></div></div>
      <div class="card"><div class="topic">Content & verification log</div>
        <div class="stat"><span>Back Office static questions</span><b>${all.length}</b></div>
        <div class="stat"><span>${D.quiz.tag('V')} substance verified</span><b>${cnt('V')}</b></div>
        <div class="stat"><span>${D.quiz.tag('LV')} requires live verification</span><b>${cnt('LV')}</b></div>
        <div class="stat"><span>${D.quiz.tag('C')} control best practice</span><b>${cnt('C')}</b></div>
        <div class="stat"><span>${D.quiz.tag('G')} generators (infinite variants)</span><b>${D.content.bo.G.length}</b></div>
        <small class="note">Items tagged LIVE-VERIFY cite rules that may have been revised (e.g. Income-tax Act 2025 section mapping from 1-Apr-2026, revised ECB directions) or whose circular number is not confirmed. Verify before relying on them operationally.</small>
        <button class="btn ghost" id="lv" style="margin-top:8px">Show LIVE-VERIFY items</button><div id="lvl"></div></div>
      <div class="card"><div class="topic">Player</div><div class="stat"><span>${D.esc(p.name)}</span><span class="mono dim">${p.id}</span></div><button class="btn red ghost" id="del" style="margin-top:8px;color:var(--red)">Delete this player</button></div>
      <small class="note">The Desk is a training game. All entities are fictional; market data is synthetic; certificates are self-assessed and not accredited qualifications.</small>`;
    app.appendChild(nav('settings'));
    D.$$('[data-t]', app).forEach((b) => (b.onclick = () => { st[b.dataset.t] = !st[b.dataset.t]; D.save(); D.sfx('tap'); D.go(S.settings, null, true); }));
    D.$('#ex').onclick = () => { const code = btoa(unescape(encodeURIComponent(JSON.stringify(p)))); D.$('#io').innerHTML = `<textarea class="in mono" style="height:110px;font-size:11px" readonly>${code}</textarea><small class="note">Copy this code and keep it safe.</small>`; const ta = D.$('#io textarea'); ta.focus(); ta.select(); try { navigator.clipboard.writeText(code); D.toast('Copied to clipboard'); } catch (e) {} };
    D.$('#im').onclick = () => { D.$('#io').innerHTML = `<textarea class="in mono" style="height:110px;font-size:11px" placeholder="Paste progress code"></textarea><button class="btn pri" style="margin-top:6px">Restore as new player</button>`; D.$('#io button').onclick = () => { try { const o = JSON.parse(decodeURIComponent(escape(atob(D.$('#io textarea').value.trim())))); if (!o.name || typeof o.xp !== 'number') throw 0; o.id = 'p' + Date.now().toString(36); D.S.profiles[o.id] = o; D.S.active = o.id; D.save(); D.toast('Restored ' + o.name); D.home(); } catch (e) { D.toast('Invalid code'); D.sfx('bad'); } }; };
    D.$('#lv').onclick = (e) => { e.target.remove(); D.$('#lvl').innerHTML = all.filter((q) => q.s === 'LV').map((q) => `<div class="exp" style="--accent:var(--amber)">${D.esc(q.q)}<span class="ref">${D.esc(q.ref)}</span></div>`).join(''); };
    D.$('#del').onclick = () => D.confirm('Delete ' + p.name + '?', 'All progress and certificates for this player will be erased from this device.', 'Delete', () => { delete D.S.profiles[p.id]; D.S.active = Object.keys(D.S.profiles)[0] || null; D.save(); D.stack = []; D.S.active ? D.home() : D.go(S.intro); });
  };

  /* ---------- boot ---------- */
  D.load();
  if (D.S.active && D.S.profiles[D.S.active]) D.home(); else D.go(S.intro);
})();
