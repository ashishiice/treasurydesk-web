/* Quiz / exam engine: MCQ + numeric, confidence-weighted scoring, timers, proctor mode */
(function () {
  const D = window.D;
  const Q = (D.quiz = {});
  const TAGS = { V: 'VERIFIED', LV: 'LIVE-VERIFY', C: 'BEST PRACTICE', G: 'GENERATED' };
  Q.tag = (s) => `<span class="tag ${s}">${TAGS[s] || s}</span>`;

  // Build a question set: nStatic from the bank + nGen generated
  Q.build = function (track, nStatic, nGen, seed) {
    const c = D.content[track], r = D.rng(seed || D.R.int(1, 1e9));
    const st = r.shuffle(c.S).slice(0, nStatic).map((q) => { // shuffle options
      const idx = r.shuffle(q.o.map((_, i) => i));
      return Object.assign({}, q, { o: idx.map((i) => q.o[i]), a: idx.indexOf(q.a) });
    });
    const gs = []; for (let i = 0; i < nGen; i++) gs.push(c.G[i % c.G.length](r));
    return r.shuffle(st.concat(r.shuffle(gs)));
  };

  /* cfg: {title, sub, qs, mode:'learn'|'test'|'exam'|'daily', perQ (s), total (s), conf, hints, proctor, onDone(res)} */
  Q.run = function (app, cfg) {
    const st = { i: 0, ans: [], strikes: 0, start: Date.now(), done: false };
    let timer = null, totalT = null;
    const accent = cfg.accent || 'var(--cyan)';
    app.style.setProperty('--accent', accent);
    app.appendChild(D.top(cfg.title, cfg.sub, () => abandon()));
    const body = document.createElement('div'); app.appendChild(body);

    function abandon() {
      if (st.done) return D.back();
      D.confirm('Leave this session?', cfg.mode === 'exam' ? 'An abandoned exam counts as an attempt with the score achieved so far.' : 'Progress in this session will be lost.', 'Leave', () => { if (cfg.mode === 'exam') finish(); else { stopAll(); st.done = true; D.guard = null; D.back(); } });
    }
    D.guard = () => { if (!st.done) { abandon(); return true; } return false; };

    function stopAll() { timer && timer.stop(); totalT && totalT.stop(); document.removeEventListener('visibilitychange', vis); }
    D.cleanup = () => { stopAll(); D.guard = null; };
    function vis() {
      if (document.hidden && !st.done) {
        st.strikes++; D.sfx('alarm');
        if (st.strikes >= 3) { st.voided = true; finish(); D.toast('Exam voided — left the app 3 times.'); }
        else setTimeout(() => D.toast(`⚠ Proctor strike ${st.strikes}/3 — stay in the app.`, 3000), 300);
      }
    }
    if (cfg.proctor) document.addEventListener('visibilitychange', vis);
    if (cfg.total) totalT = D.countdown(cfg.total, (l) => { const el = D.$('#tt'); if (el) { el.textContent = D.mmss(l); el.classList.toggle('hot', l <= 30); } }, () => { D.toast('⏱ Time up'); finish(); });

    function render() {
      if (st.done) return;
      const q = cfg.qs[st.i]; let sel = null, num = '';
      body.innerHTML = `
        <div class="qhead"><span>Q ${st.i + 1}/${cfg.qs.length} · <span class="topic">${D.esc(q.topic)}</span></span>
        <span>${cfg.total ? '<span class="timer" id="tt">' + D.mmss(totalT ? totalT.left : cfg.total) + '</span>' : ''}${cfg.perQ ? ' <span class="timer" id="qt"></span>' : ''}${cfg.proctor ? ' <span class="pill">🛡 ' + st.strikes + '/3</span>' : ''}</span></div>
        <div class="bar"><i style="width:${(st.i / cfg.qs.length) * 100}%"></i></div>
        <div class="q">${D.esc(q.q)}</div>
        <div id="ans"></div><div id="fb"></div><div id="act"></div>`;
      const ans = D.$('#ans', body), act = D.$('#act', body);
      if (q.t === 'num') {
        ans.innerHTML = `<div class="numin"><span id="nv">&nbsp;</span><span class="u">${D.esc(q.unit || '')}</span></div><small class="note">Answer to ${q.dp} decimal place(s).</small>
          <div class="pad">${['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'].map((k) => `<button data-k="${k}">${k}</button>`).join('')}</div>`;
        D.$$('.pad button', ans).forEach((b) => (b.onclick = () => {
          D.sfx('tick'); const k = b.dataset.k;
          if (k === '⌫') num = num.slice(0, -1); else if (k === '.' && num.includes('.')) return; else if (num.length < 14) num += k;
          D.$('#nv', ans).textContent = num || ' '; sel = num && num !== '.' ? parseFloat(num) : null; acts();
        }));
      } else {
        ans.innerHTML = q.o.map((o, i) => `<button class="opt" data-i="${i}"><span class="k">${'ABCD'[i]}</span><span>${D.esc(o)}</span></button>`).join('');
        D.$$('.opt', ans).forEach((b) => (b.onclick = () => { if (b.classList.contains('gone')) return; D.sfx('tap'); D.$$('.opt', ans).forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); sel = +b.dataset.i; acts(); }));
      }
      function acts() {
        const dis = sel === null ? 'disabled' : '';
        if (cfg.conf) act.innerHTML = `<div class="row" style="margin-top:12px"><button class="btn" data-c="0" ${dis}>Lock · Not sure</button><button class="btn pri amber" data-c="1" ${dis}>Lock · Sure</button></div><small class="note">Sure: +1 / −0.5 · Not sure: +0.5 / 0. Calibration is a treasury skill.</small>`;
        else act.innerHTML = `<div class="row" style="margin-top:12px">${cfg.hints && q.t !== 'num' ? '<button class="btn ghost" data-h>💡 50:50</button>' : ''}<button class="btn pri" data-c="1" ${dis}>Submit</button></div>`;
        D.$$('[data-c]', act).forEach((b) => (b.onclick = () => submit(sel, +b.dataset.c === 1)));
        const h = D.$('[data-h]', act); if (h) h.onclick = () => { h.disabled = true; let k = 0; D.$$('.opt', ans).forEach((x) => { if (+x.dataset.i !== q.a && k < 2) { x.classList.add('gone'); k++; if (+x.dataset.i === sel) sel = null; } }); q._hint = true; acts(); };
      }
      acts();
      if (cfg.perQ) { timer && timer.stop(); const lim = q.t === 'num' ? cfg.perQ * 2 : cfg.perQ; timer = D.countdown(lim, (l) => { const el = D.$('#qt'); if (el) { el.textContent = l + 's'; el.classList.toggle('hot', l <= 8); } if (l <= 5 && l > 0) D.sfx('tick'); }, () => submit(null, false, true)); }
    }

    function correct(q, v) { return v !== null && v !== undefined && (q.t === 'num' ? Math.abs(v - q.a) <= q.tol + 1e-9 : v === q.a); }
    function submit(v, sure, timeout) {
      timer && timer.stop();
      const q = cfg.qs[st.i], ok = correct(q, v);
      const pts = cfg.conf ? (v === null ? 0 : ok ? (sure ? 1 : 0.5) : sure ? -0.5 : 0) : ok ? 1 : 0;
      st.ans.push({ q, v, ok, sure, pts, timeout: !!timeout });
      ok ? D.sfx('good') : D.sfx('bad');
      if (cfg.mode === 'exam' || cfg.mode === 'daily') { next(); return; }
      // reveal
      const ans = D.$('#ans', body);
      if (q.t === 'num') { D.$('.pad', ans).style.pointerEvents = 'none'; D.$('.pad', ans).style.opacity = .35; } if (q.t === 'num') ans.insertAdjacentHTML('beforeend', `<div class="exp" style="--accent:${ok ? 'var(--green)' : 'var(--red)'}"><b>${ok ? '✓ Correct' : '✗ ' + (timeout ? 'Time up' : 'Incorrect')}</b> — answer: <b class="mono">${D.fmt(q.a, q.dp)}</b> ${D.esc(q.unit || '')}</div>`);
      else D.$$('.opt', ans).forEach((x) => { const i = +x.dataset.i; if (i === q.a) x.classList.add('right'); else if (i === v) x.classList.add('wrong'); x.onclick = null; });
      if (!ok) body.classList.add('shake'); setTimeout(() => body.classList.remove('shake'), 400);
      D.$('#fb', body).innerHTML = `<div class="exp">${D.esc(q.x)}<span class="ref">${Q.tag(q.s)} ${D.esc(q.ref || '')}</span></div>`;
      D.$('#act', body).innerHTML = `<button class="btn pri" style="margin-top:8px">${st.i + 1 < cfg.qs.length ? 'Next →' : 'See results'}</button>`;
      D.$('#act button', body).onclick = () => { D.sfx('tap'); next(); };
    }
    function next() { st.i++; if (st.i >= cfg.qs.length) finish(); else render(); }

    function finish() {
      if (st.done) return; st.done = true; stopAll(); D.guard = null;
      const n = cfg.qs.length, sum = st.ans.reduce((a, x) => a + x.pts, 0);
      const pct = st.voided ? 0 : D.clamp(Math.round((Math.max(0, sum) / n) * 1000) / 10, 0, 100);
      const sure = st.ans.filter((a) => a.sure && a.v !== null), unsure = st.ans.filter((a) => !a.sure && a.v !== null);
      const res = { pct, n, right: st.ans.filter((a) => a.ok).length, answered: st.ans.length, voided: !!st.voided, secs: Math.round((Date.now() - st.start) / 1000),
        sureAcc: sure.length ? Math.round((sure.filter((a) => a.ok).length / sure.length) * 100) : null, unsureAcc: unsure.length ? Math.round((unsure.filter((a) => a.ok).length / unsure.length) * 100) : null, ans: st.ans };
      const extra = cfg.onDone ? cfg.onDone(res) || {} : {};
      results(res, extra);
    }

    function results(res, extra) {
      const pass = extra.passMark ? res.pct >= extra.passMark : null;
      app.style.setProperty('--accent', res.voided ? 'var(--red)' : pass === false ? 'var(--amber)' : 'var(--green)');
      body.innerHTML = `
        <div class="card glow" style="text-align:center">
          <div class="topic">${D.esc(extra.kicker || 'Session complete')}</div>
          <div class="big">${res.voided ? 'VOID' : res.pct + '%'}</div>
          ${pass === null ? '' : `<div class="pill on" style="font-size:13px">${pass ? '✓ PASS' : '✗ BELOW ' + extra.passMark + '%'}</div>`}
        </div>
        <div class="card">
          <div class="stat"><span>Correct</span><b>${res.right} / ${res.n}</b></div>
          ${res.sureAcc !== null ? `<div class="stat"><span>Accuracy when "Sure"</span><b>${res.sureAcc}%</b></div>` : ''}
          ${res.unsureAcc !== null ? `<div class="stat"><span>Accuracy when "Not sure"</span><b>${res.unsureAcc}%</b></div>` : ''}
          <div class="stat"><span>Time</span><b>${D.mmss(res.secs)}</b></div>
          ${extra.xp ? `<div class="stat"><span>XP earned</span><b class="amb">+${extra.xp}</b></div>` : ''}
          ${extra.note ? `<small class="note">${extra.note}</small>` : ''}
        </div>
        <div class="row"><button class="btn" data-rv>Review answers</button><button class="btn pri" data-ok>Done</button></div>
        <div id="rv"></div>`;
      if (res.pct >= 90 && !res.voided) D.sfx('level');
      D.$('[data-ok]', body).onclick = () => { D.sfx('tap'); extra.after ? extra.after() : D.back(); };
      D.$('[data-rv]', body).onclick = (e) => {
        e.target.disabled = true;
        D.$('#rv', body).innerHTML = res.ans.map((a, i) => {
          const q = a.q, your = a.v === null ? '—' : q.t === 'num' ? D.fmt(a.v, q.dp) : q.o[a.v], right = q.t === 'num' ? D.fmt(q.a, q.dp) + ' ' + (q.unit || '') : q.o[q.a];
          return `<div class="card" style="--accent:${a.ok ? 'var(--green)' : 'var(--red)'}"><div class="topic">${i + 1}. ${D.esc(q.topic)} ${a.ok ? '✓' : '✗'}${cfg.conf ? ` · ${a.sure ? 'Sure' : 'Not sure'}` : ''}</div>
            <p style="font-size:14px;line-height:1.45">${D.esc(q.q)}</p><div class="stat"><span>Yours</span><b style="text-align:right;max-width:65%">${D.esc(your)}</b></div><div class="stat"><span>Correct</span><b style="text-align:right;max-width:65%">${D.esc(right)}</b></div>
            <div class="exp">${D.esc(q.x)}<span class="ref">${Q.tag(q.s)} ${D.esc(q.ref || '')}</span></div></div>`;
        }).join('');
      };
    }
    render();
  };
})();
