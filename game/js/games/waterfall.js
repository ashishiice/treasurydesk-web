/* CASH WATERFALL — run FinCorp's intraday cash position. Fund every critical outflow,
   respect cut-offs, minimise cost. Rates are synthetic. */
(function () {
  const D = window.D, F = D.FIRM;
  const BUF = 10, STEP = 25;
  const RATES = { treps: 5.45, wcdl: 8.4, od: 9.6, lend: 5.3 };

  function scenario(r) {
    const opening = r.step(30, 70, 5), tb = r.pick([125, 150, 175]);
    const cp = r.step(200, 325, 25), d1 = r.step(75, 125, 5), d2 = r.step(50, 100, 5), col1 = r.step(70, 120, 5), col2 = r.step(40, 80, 5);
    const short = r() < 0.75 ? Math.round(col2 * r.pick([0.4, 0.5, 0.6])) : 0;
    const slots = [
      { t: '09:30', flows: [{ n: 'NACH collections', a: col1 }, { n: 'Disbursement batch 1 (dealers)', a: -d1, defer: true }] },
      { t: '11:00', flows: [{ n: 'Term-loan interest · Northbridge', a: -r.step(8, 20, 1), crit: true }] },
      { t: '12:30', flows: [{ n: 'CP redemption → IPA', a: -cp, crit: true }] },
      { t: '14:00', flows: [{ n: 'Collections (UPI/NACH re-present)', a: col2, surprise: short }, { n: 'Disbursement batch 2 (dealers)', a: -d2, defer: true }] },
      { t: '15:30', flows: [{ n: 'NCD coupon → investors', a: -r.step(15, 40, 1), crit: true }, { n: 'TDS deposit', a: -r.step(3, 8, 1), crit: true }] },
      { t: '17:00', flows: [] }
    ];
    return { opening, tb, slots };
  }
  const LEVERS = [
    { k: 'treps', n: 'Borrow in TREPS (vs T-bills)', rate: RATES.treps, until: 3, lim: (s) => s.tb },
    { k: 'wcdl', n: 'Draw committed WCDL · Coastal', rate: RATES.wcdl, until: 3, lim: () => 200 },
    { k: 'od', n: 'Overdraft / CC line · Unity', rate: RATES.od, until: 5, lim: () => 100 },
    { k: 'lf', n: 'Redeem liquid fund', rate: 0, until: 4, lim: () => 250, t1: true },
    { k: 'lend', n: 'Lend surplus in TREPS', rate: RATES.lend, until: 3, lim: () => 500, out: true }
  ];

  D.waterfall = function (app, opt) {
    const r = D.rng(D.R.int(1, 1e9)), sc = scenario(r);
    const st = { slot: 0, bal: sc.opening, used: { treps: 0, wcdl: 0, od: 0, lf: 0, lend: 0 }, pend: { treps: 0, wcdl: 0, od: 0, lf: 0, lend: 0 }, deferred: 0, fails: 0, breaches: 0, def: false, log: [], done: false, revealed: false };
    app.style.setProperty('--accent', 'var(--amber)');
    app.appendChild(D.top('Cash Waterfall', 'Back Office · Intraday liquidity', () => leave()));
    const body = document.createElement('div'); app.appendChild(body);
    function leave() { if (st.done) return D.back(); D.confirm('Abandon the day?', 'The day will be scored as a failed run.', 'Abandon', () => { st.def = true; end(); }); }
    D.guard = () => { if (!st.done) { leave(); return true; } return false; };
    D.cleanup = () => { D.guard = null; };

    const flowAmt = (f) => (f.deferred ? 0 : f.a - (st.revealed && f.surprise ? f.surprise : 0));
    function intro() {
      body.innerHTML = `<div class="card glow"><div class="topic">08:55 IST · Treasury Ops</div><p class="story">You own ${F}'s cash position today. Opening balance <b>${D.cr(sc.opening, 0)}</b>. T-bills in CCIL collateral pool: <b>${D.cr(sc.tb, 0)}</b>. A <b class="dn">CP redemption</b> hits at 12:30.</p>
        <div class="stat"><span>Rule 1</span><b>Never miss a <span class="dn">critical</span> payment</b></div><div class="stat"><span>Rule 2</span><b>Keep ≥ ${D.cr(BUF, 0)} buffer after every slot</b></div><div class="stat"><span>Rule 3</span><b>Fund at least cost; don't sit on idle cash</b></div>
        <small class="note">Synthetic rates: TREPS ${RATES.treps}% · WCDL ${RATES.wcdl}% · OD ${RATES.od}% · TREPS lend ${RATES.lend}%. Watch cut-offs. Pass ≥70.</small></div><button class="btn pri amber">Open the books</button>`;
      D.$('button.btn', body).onclick = () => { D.sfx('deal'); render(); };
    }
    function projected() {
      const s = sc.slots[st.slot];
      let b = st.bal + st.pend.treps + st.pend.wcdl + st.pend.od - st.pend.lend;
      s.flows.forEach((f) => (b += flowAmt(f)));
      return b;
    }
    function render() {
      const s = sc.slots[st.slot];
      if (s.t === '14:00' && !st.revealed) { st.revealed = true; const f = s.flows.find((x) => x.surprise); if (f && f.surprise) { D.sfx('alarm'); D.toast(`⚠ NACH bounce: collections short by ${D.cr(f.surprise, 0)}`, 3500); } }
      const cost = costNow(), pb = projected();
      body.innerHTML = `
        <div class="gauges"><div class="g"><small>BALANCE</small><b>${D.fmt(st.bal, 0)}</b><small>₹ Cr</small></div><div class="g"><small>AFTER SLOT</small><b class="${pb < 0 ? 'dn' : pb < BUF ? 'amb' : 'up'}">${D.fmt(pb, 0)}</b><small>projected</small></div><div class="g"><small>COST</small><b>${D.fmt(cost, 1)}</b><small>₹ lakh</small></div></div>
        <div class="card"><div class="topic">Timeline</div>${sc.slots.map((x, i) => `<div class="slot ${i < st.slot ? 'past' : i === st.slot ? 'now' : ''}"><span class="t">${x.t}</span><span class="n">${x.flows.length ? x.flows.map((f) => `${D.esc(f.n)}${f.crit ? ' <span class="tag LV">CRITICAL</span>' : ''}${f.deferred ? ' <span class="tag C">DEFERRED</span>' : ''}`).join('<br>') : '<span class="mute">End of day — EOD balance check</span>'}</span><span class="a">${x.flows.map((f) => { const a = i < st.slot || i === st.slot ? flowAmt(f) : f.a; return `<span class="${a < 0 ? 'dn' : 'up'}">${a >= 0 ? '+' : ''}${D.fmt(a, 0)}</span>${f.surprise && st.revealed ? ' <span class="amb">⚠</span>' : ''}`; }).join('<br>')}</span></div>`).join('')}</div>
        ${st.slot < sc.slots.length - 1 ? levers(s) : ''}
        <button class="btn pri amber" id="go">${st.slot < sc.slots.length - 1 ? `Settle ${s.t} slot →` : 'Close the day'}</button>`;
      D.$$('[data-l]', body).forEach((b) => (b.onclick = () => { const k = b.dataset.l, d = +b.dataset.d, L = LEVERS.find((x) => x.k === k); const mx = L.lim(sc) - st.used[k]; st.pend[k] = D.clamp(st.pend[k] + d * STEP, 0, mx); D.sfx('tick'); render(); }));
      D.$$('[data-df]', body).forEach((b) => (b.onclick = () => { const f = s.flows[+b.dataset.df]; f.deferred = !f.deferred; D.sfx('tap'); render(); }));
      D.$('#go', body).onclick = settle;
    }
    function levers(s) {
      const rows = LEVERS.map((L) => {
        const open = st.slot <= L.until, rem = L.lim(sc) - st.used[L.k];
        return `<div class="lever ${open ? '' : 'off'}"><div class="n">${D.esc(L.n)}<small>${L.t1 ? 'pays out T+1' : L.out ? '+' + L.rate + '% · returns tomorrow' : L.rate + '% o/n'} · ${open ? 'avail ' + D.fmt(rem, 0) + ' Cr' : 'CLOSED (cut-off)'}</small></div>
          <div class="st">${open ? `<button data-l="${L.k}" data-d="-1">−</button><b>${D.fmt(st.pend[L.k], 0)}</b><button data-l="${L.k}" data-d="1">+</button>` : '<b>—</b>'}</div></div>`;
      }).join('');
      const df = s.flows.map((f, i) => (f.defer ? `<div class="lever"><div class="n">${D.esc(f.n)}<small>Discretionary — deferring hurts the business</small></div><div class="st"><button style="width:auto;padding:0 10px;font-size:12px" data-df="${i}">${f.deferred ? 'Release' : 'Defer'}</button></div></div>` : '')).join('');
      return `<div class="card"><div class="topic">Funding levers · ${s.t} (steps of ₹${STEP} Cr)</div>${rows}${df}</div>`;
    }
    function costNow() { return ['treps', 'wcdl', 'od'].reduce((a, k) => a + ((st.used[k] + st.pend[k]) * LEVERS.find((x) => x.k === k).rate) / 365, 0) - ((st.used.lend + st.pend.lend) * RATES.lend) / 365; }
    function settle() {
      const s = sc.slots[st.slot];
      if (st.slot === sc.slots.length - 1) return end();
      Object.keys(st.pend).forEach((k) => { st.used[k] += st.pend[k]; if (k === 'lend') st.bal -= st.pend[k]; else if (k !== 'lf') st.bal += st.pend[k]; st.pend[k] = 0; });
      // pay critical first, then others
      const fl = s.flows.slice().sort((a, b) => (b.crit ? 1 : 0) - (a.crit ? 1 : 0));
      fl.forEach((f) => { const a = flowAmt(f); if (f.deferred) { st.deferred++; st.log.push(`${s.t}: deferred ${f.n}`); return; }
        if (a < 0 && st.bal + a < 0) { if (f.crit) { st.def = true; st.log.push(`${s.t}: DEFAULT on ${f.n}`); } else { st.fails++; st.log.push(`${s.t}: ${f.n} failed — insufficient funds`); } return; }
        st.bal += a; });
      if (st.def) { D.sfx('boss'); body.classList.add('flash-red'); return setTimeout(end, 600); }
      if (st.bal < BUF) { st.breaches++; D.sfx('bad'); D.toast(`Buffer breach at ${s.t}: ${D.cr(st.bal, 0)}`); } else D.sfx('good');
      st.slot++; render();
    }
    function end() {
      if (st.done) return; st.done = true; D.guard = null;
      const borrow = ['treps', 'wcdl', 'od'].reduce((a, k) => a + (st.used[k] * LEVERS.find((x) => x.k === k).rate) / 365, 0);
      const lendInc = (st.used.lend * RATES.lend) / 365, idle = Math.max(0, st.bal - BUF - 15), idleCost = (idle * RATES.lend) / 365, net = borrow - lendInc + idleCost;
      // benchmark: cumulative need with no deferrals, funded TREPS-first then WCDL
      let b = sc.opening, minB = Infinity; sc.slots.forEach((s) => { s.flows.forEach((f) => (b += f.a - (f.surprise || 0))); minB = Math.min(minB, b); });
      const need = Math.max(0, BUF - minB), bench = (Math.min(need, sc.tb) * RATES.treps + Math.max(0, need - sc.tb) * RATES.wcdl) / 365;
      let score = 100, items = [];
      if (st.def) { score = 0; items.push(['Market-instrument default', 'FAIL']); }
      else {
        if (st.fails) { score -= 20 * st.fails; items.push([`Failed payments (${st.fails})`, -20 * st.fails]); }
        if (st.breaches) { score -= 6 * st.breaches; items.push([`Buffer breaches (${st.breaches})`, -6 * st.breaches]); }
        if (st.deferred) { score -= 8 * st.deferred; items.push([`Deferred disbursements (${st.deferred})`, -8 * st.deferred]); }
        const over = Math.max(0, net - bench), pen = Math.round(Math.min(30, (over / Math.max(bench, 3)) * 15));
        if (pen) { score -= pen; items.push([`Cost vs benchmark (+₹${D.fmt(over, 1)} lakh)`, -pen]); }
        if (idle > 0) { const p = Math.round(Math.min(15, idle / 10)); score -= p; items.push([`Idle cash at EOD (${D.cr(idle, 0)} above buffer+15)`, -p]); }
        score = Math.max(0, score);
      }
      const pass = score >= 70, tp = D.tp('bo'), s = (tp.sims.waterfall = tp.sims.waterfall || { best: 0, plays: 0 });
      s.plays++; s.best = Math.max(s.best, score); if (pass) tp.simPasses++;
      const xp = D.addXP(Math.round(score * 1.5) + 20); D.logEvent(`Cash Waterfall: ${score}/100`); if (score >= 95) D.badge('waterfall-95', 'Liquidity Surgeon — Waterfall ≥95'); D.save();
      app.style.setProperty('--accent', pass ? 'var(--green)' : st.def ? 'var(--red)' : 'var(--amber)');
      body.innerHTML = `<div class="card glow" style="text-align:center"><div class="topic">${st.def ? 'DEFAULT — day over' : 'Day closed'}</div><div class="big">${score}</div><div class="pill on">${pass ? '✓ PASS' : '✗ BELOW 70'}</div></div>
        <div class="card"><div class="stat"><span>Borrowing cost</span><b>₹${D.fmt(borrow, 2)} lakh</b></div><div class="stat"><span>TREPS lending income</span><b class="up">₹${D.fmt(lendInc, 2)} lakh</b></div><div class="stat"><span>Idle-cash drag</span><b>₹${D.fmt(idleCost, 2)} lakh</b></div><div class="stat"><span>Benchmark cost</span><b>₹${D.fmt(bench, 2)} lakh</b></div>
        ${items.map((i) => `<div class="stat"><span>${D.esc(i[0])}</span><b class="dn">${i[1]}</b></div>`).join('')}<div class="stat"><span>XP</span><b class="amb">+${xp}</b></div>
        ${st.used.lf ? `<small class="note">⚠ You redeemed ${D.cr(st.used.lf, 0)} of liquid fund. Liquid funds pay out T+1 — it did nothing for today's cash.</small>` : ''}
        <small class="note">Best practice: fund the critical path first with the cheapest same-day source (TREPS vs T-bills), keep committed lines for shocks, request WCDL before the bank cut-off, and lend any true surplus before TREPS closes.</small></div>
        ${st.log.length ? `<div class="card"><div class="topic">Event log</div>${st.log.map((l) => `<div class="stat"><span>${D.esc(l)}</span></div>`).join('')}</div>` : ''}
        <div class="row"><button class="btn" data-r>New day</button><button class="btn pri" data-d>Done</button></div>`;
      D.$('[data-r]', body).onclick = () => D.go(D.waterfall, opt, true);
      D.$('[data-d]', body).onclick = () => D.back();
    }
    intro();
  };
})();
