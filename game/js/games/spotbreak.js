/* SPOT THE BREAK — confirmation matching under time pressure.
   Left: FinCorp deal ticket (golden source). Right: counterparty confirmation / SSI.
   Tap every field on the right that breaks, then AFFIRM (no breaks) or RAISE BREAK. */
(function () {
  const D = window.D, F = D.FIRM;
  const MF = ['Meridian Liquid Fund', 'Sterling Money Market Fund', 'Harbourline Overnight Fund', 'Crestview Ultra Short Fund', 'Northstar Liquid Fund'];
  const BANKS = ['Northbridge Bank', 'Coastal Bank', 'Unity Bank', 'Peninsula Bank', 'Federal Crown Bank'];
  const IFSC = { 'Northbridge Bank': 'NRTB', 'Coastal Bank': 'CSTL', 'Unity Bank': 'UNTY', 'Peninsula Bank': 'PNSL', 'Federal Crown Bank': 'FDCR' };

  function acct(r) { let s = ''; for (let i = 0; i < 14; i++) s += r.int(0, 9); return s; }
  function isin(r, type) { const c = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'; let s = 'INE0FC'; s += type; for (let i = 0; i < 3; i++) s += c[r.int(0, c.length - 1)]; return s + r.int(0, 9); }
  function swapDigits(s, r) { const ix = []; for (let i = 0; i < s.length - 1; i++) if (/\d/.test(s[i]) && /\d/.test(s[i + 1]) && s[i] !== s[i + 1]) ix.push(i); if (!ix.length) return s + '0'; const i = r.pick(ix); return s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2); }
  function bizDate(r) { let d = D.date(2026, 11, 2); d = D.addDays(d, r.int(0, 120)); return D.nextBiz(d); }
  const money = (n) => D.inr(n, Number.isInteger(Math.round(n * 100) / 100) ? 0 : 2);

  /* each deal: {type, title, fields:[{k, label, v}], conf:{k: value}, breaks:{k: reason}, crit:{k:true}} */
  function makeDeal(r) {
    const type = r.pick(['CP', 'CP', 'NCD', 'TREPS', 'OIS', 'TL']);
    const f = []; const add = (k, label, v) => f.push({ k, label, v });
    const bank = r.pick(BANKS); const ac = acct(r);
    let crit = {}, opts = [];
    if (type === 'CP') {
      const cp = r.pick(MF), fv = r.pick([25, 50, 75, 100, 150, 200]) * 1e7, y = r.step(6.9, 8.1, 0.05), d = r.pick([30, 45, 60, 91, 182]);
      const vd = bizDate(r), md = D.addDays(vd, d), px = 100 / (1 + (y / 100) * d / 365), cons = (fv * px) / 100;
      add('ins', 'Instrument', `CP · ${F} Ltd`); add('isin', 'ISIN', isin(r, '14')); add('side', 'Direction', `${F} ISSUES / ${cp} BUYS`);
      add('fv', 'Face value', money(fv)); add('yld', 'Yield (Act/365)', y.toFixed(2) + '%'); add('vd', 'Value date', D.dfmt(vd)); add('md', 'Maturity date', D.dfmt(md)); add('ten', 'Tenor', d + ' days');
      add('px', 'Price / ₹100', px.toFixed(4)); add('cons', 'Consideration', money(cons)); add('ipa', 'IPA', bank); add('ssi', `${F} a/c (IPA)`, `${IFSC[bank]}0001234 · ${ac}`);
      crit = { side: 1, fv: 1, cons: 1, ssi: 1 };
      opts = [
        ['yld', () => (y + r.pick([0.05, -0.05, 0.1])).toFixed(2) + '%', 'Yield differs from the ticket.'],
        ['yld', () => (y.toFixed(2).replace(/(\d)\.(\d)(\d)/, '$1.$3$2')) + '%', 'Yield digits transposed.'],
        ['fv', () => money(fv * 10), 'Face value off by a factor of 10 — fat-finger.'],
        ['md', () => D.dfmt(D.addDays(md, r.pick([1, -1]))), 'Maturity date inconsistent with value date + tenor.'],
        ['vd', () => D.dfmt(D.addDays(vd, r.pick([1, 2]))), 'Value date differs — settlement would fail at the IPA.'],
        ['cons', () => money((fv * 100 / (1 + (y / 100) * d / 360)) / 100), 'Consideration computed on Act/360 instead of Act/365.'],
        ['cons', () => money(Math.round(cons / 1000) * 1000 + r.pick([1e5, -1e5, 1e6])), 'Consideration amount differs.'],
        ['ssi', () => `${IFSC[bank]}0001234 · ${swapDigits(ac, r)}`, 'Account number differs from SSI master — possible payment diversion. Call-back mandatory.'],
        ['side', () => `${cp} ISSUES / ${F} BUYS`, 'Direction reversed.'],
        ['isin', () => swapDigits(f.find((x) => x.k === 'isin').v, r), 'ISIN does not match the ticket.'],
        ['ten', () => (d + r.pick([1, -1])) + ' days', 'Tenor inconsistent.']
      ];
      return finish(r, { type, title: `CP issuance → ${cp}`, cpty: cp, fields: f, crit, opts });
    }
    if (type === 'NCD') {
      const inv = r.pick(MF.concat(['Bluewater Insurance Co', 'Granite Pension Trust'])), fv = r.pick([100, 150, 200, 250, 300]) * 1e7, c = r.step(7.4, 9.0, 0.05), px = r.pick([100, 100, 99.95, 100.02]);
      const dda = bizDate(r), mat = D.nextBiz(D.addDays(dda, r.pick([2, 3]) * 365 + r.int(0, 3)));
      add('ins', 'Instrument', `Sr. secured NCD · ${F} Ltd`); add('isin', 'ISIN', isin(r, '07')); add('side', 'Direction', `${F} ISSUES / ${inv} BUYS`); add('fv', 'Face value', money(fv)); add('cpn', 'Coupon', c.toFixed(2) + '% p.a. annual');
      add('dc', 'Day count', 'Actual/Actual'); add('dda', 'Deemed allotment', D.dfmt(dda)); add('mat', 'Redemption', D.dfmt(mat)); add('px', 'Issue price / ₹100', px.toFixed(2)); add('cons', 'Pay-in amount', money((fv * px) / 100)); add('ssi', 'Pay-in a/c (clearing corp)', `ICCL · ${IFSC[bank]}0009911 · ${ac}`);
      crit = { side: 1, fv: 1, cons: 1, ssi: 1 };
      opts = [
        ['cpn', () => (c + r.pick([0.05, -0.05, 0.1])).toFixed(2) + '% p.a. annual', 'Coupon differs from the EBP allotment.'],
        ['cpn', () => c.toFixed(2) + '% p.a. semi-annual', 'Coupon frequency differs.'],
        ['dc', () => r.pick(['30/360', 'Actual/365 (fixed)', 'Actual/360']), 'Day count must be Actual/Actual for listed NCDs (SEBI).'],
        ['mat', () => D.dfmt(D.addDays(mat, r.pick([1, -1, 30]))), 'Redemption date differs.'],
        ['dda', () => D.dfmt(D.addDays(dda, 1)), 'Deemed date of allotment differs.'],
        ['cons', () => money(((fv * px) / 100) * 1.0001), 'Pay-in amount differs.'],
        ['ssi', () => `ICCL · ${IFSC[bank]}0009911 · ${swapDigits(ac, r)}`, 'Pay-in account differs from the clearing corporation\'s published account.'],
        ['fv', () => money(fv / 10), 'Face value off by a factor of 10.'],
        ['px', () => (px - 0.05).toFixed(2), 'Issue price differs.']
      ];
      return finish(r, { type, title: `NCD private placement → ${inv}`, cpty: inv, fields: f, crit, opts });
    }
    if (type === 'TREPS') {
      const amt = r.pick([50, 100, 150, 200, 300, 400]) * 1e7, rt = r.step(5.15, 5.85, 0.01), vd = bizDate(r), fri = vd.getUTCDay() === 5, ten = fri ? 3 : 1, md = D.addDays(vd, ten);
      const intr = (amt * rt / 100) * ten / 365;
      add('ins', 'Segment', 'TREPS (CCIL)'); add('side', 'Direction', `${F} LENDS`); add('amt', 'Amount', money(amt)); add('rt', 'Rate', rt.toFixed(2) + '%'); add('vd', 'Start date', D.dfmt(vd)); add('md', 'End date', D.dfmt(md)); add('int', 'Repayment interest', money(intr)); add('mamt', 'Repayment amount', money(amt + intr)); add('cp', 'Counterparty', 'CCIL (CCP)');
      crit = { side: 1, amt: 1 };
      opts = [
        ['rt', () => (rt + r.pick([0.01, -0.01, 0.05])).toFixed(2) + '%', 'Rate differs.'],
        ['side', () => `${F} BORROWS`, 'Direction reversed — would draw on collateral instead of deploying surplus.'],
        ['md', () => D.dfmt(D.addDays(md, fri ? -2 : 1)), fri ? 'End date falls on a Saturday — must be next business day (Monday).' : 'End date inconsistent with tenor.'],
        ['int', () => money((amt * rt / 100) * ten / 360), 'Interest computed on Act/360 — TREPS is Act/365.'],
        ['amt', () => money(amt * 10), 'Amount off by a factor of 10.'],
        ['mamt', () => money(amt + intr + 1e4), 'Repayment amount ≠ principal + interest.'],
        ['cp', () => r.pick(BANKS), 'TREPS is anonymous — counterparty must be CCIL as CCP.']
      ];
      return finish(r, { type, title: 'TREPS lending', cpty: 'CCIL', fields: f, crit, opts });
    }
    if (type === 'OIS') {
      const n = r.pick([50, 100, 200, 250]) * 1e7, fx = r.step(5.5, 6.3, 0.01), ed = bizDate(r), yrs = r.pick([1, 2, 3]);
      add('ins', 'Product', 'INR OIS (FBIL O/N MIBOR)'); add('cp', 'Counterparty', bank); add('side', 'Direction', `${F} PAYS FIXED / RECEIVES FLOAT`); add('n', 'Notional', money(n)); add('fx', 'Fixed rate', fx.toFixed(4) + '%');
      add('ed', 'Effective date', D.dfmt(ed)); const td = D.nextBiz(D.addDays(ed, 365 * yrs)); add('td', 'Termination', D.dfmt(td)); add('pf', 'Payment frequency', 'Semi-annual'); add('dc', 'Day count', 'Act/365 Fixed'); add('pur', 'Purpose', 'TL hedge · Ind AS 109');
      crit = { side: 1, n: 1 };
      opts = [
        ['side', () => `${F} RECEIVES FIXED / PAYS FLOAT`, 'Direction reversed — this would double the rate exposure, not hedge it.'],
        ['fx', () => (fx + r.pick([0.0025, 0.01, -0.01])).toFixed(4) + '%', 'Fixed rate differs.'],
        ['n', () => money(n * 2), 'Notional differs.'],
        ['dc', () => 'Act/360', 'INR OIS is Act/365 Fixed.'],
        ['pf', () => r.pick(['Quarterly', 'Annual']), 'Payment frequency differs.'],
        ['td', () => D.dfmt(D.addDays(td, 7)), 'Termination date differs.']
      ];
      return finish(r, { type, title: `OIS with ${bank}`, cpty: bank, fields: f, crit, opts });
    }
    // Term loan drawdown
    const amt = r.pick([100, 150, 200, 250, 500]) * 1e7, sp = r.step(0.45, 1.6, 0.05), vd = bizDate(r), bm = r.pick(['3M T-bill', 'Repo (EBLR)', '1Y MCLR']);
    add('ins', 'Facility', `Term loan · ${bank}`); add('side', 'Direction', `${bank} DISBURSES TO ${F}`); add('amt', 'Drawdown', money(amt)); add('pr', 'Pricing', `${bm} + ${sp.toFixed(2)}%`); add('vd', 'Value date', D.dfmt(vd)); add('rs', 'Reset', bm === '1Y MCLR' ? 'Annual' : 'Quarterly'); add('ten', 'Tenor', r.pick([3, 4, 5]) + ' years'); add('ssi', `${F} receiving a/c`, `${IFSC[bank]}0000777 · ${ac}`);
    crit = { amt: 1, ssi: 1 };
    opts = [
      ['amt', () => money(amt / 10), 'Drawdown amount differs.'],
      ['pr', () => `${bm} + ${(sp + r.pick([0.05, 0.1, 0.25])).toFixed(2)}%`, 'Spread differs from sanction letter.'],
      ['pr', () => `${bm === '1Y MCLR' ? '3M T-bill' : '1Y MCLR'} + ${sp.toFixed(2)}%`, 'Benchmark differs from sanction.'],
      ['vd', () => D.dfmt(D.addDays(vd, 1)), 'Value date differs.'],
      ['ssi', () => `${IFSC[bank]}0000777 · ${swapDigits(ac, r)}`, 'Receiving account differs — funds would not land in the designated account.'],
      ['rs', () => (bm === '1Y MCLR' ? 'Quarterly' : 'Monthly'), 'Reset frequency differs.']
    ];
    return finish(r, { type: 'TL', title: `Term loan drawdown · ${bank}`, cpty: bank, fields: f, crit, opts });
  }
  function finish(r, d) {
    // 0–3 breaks; ~25% clean
    const nb = r.pick([0, 1, 1, 1, 2, 2, 3]);
    d.conf = {}; d.breaks = {}; d.fields.forEach((x) => (d.conf[x.k] = x.v));
    const used = new Set();
    r.shuffle(d.opts).forEach(([k, fn, why]) => { if (used.size >= nb || used.has(k)) return; const nv = fn(); if (nv === d.conf[k]) return; used.add(k); d.conf[k] = nv; d.breaks[k] = why; });
    delete d.opts; return d;
  }

  D.spot = function (app, opt) {
    const r = D.rng(D.R.int(1, 1e9)), N = 6, deals = Array.from({ length: N }, () => makeDeal(r));
    const st = { i: 0, score: 0, exact: 0, found: 0, missed: 0, falsef: 0, critMiss: 0, done: false };
    app.style.setProperty('--accent', 'var(--cyan)');
    app.appendChild(D.top('Spot the Break', 'Back Office · Confirmation desk', () => leave()));
    const body = document.createElement('div'); app.appendChild(body);
    let shift = null;
    function leave() { if (st.done) return D.back(); D.confirm('Leave the shift?', 'Unmatched deals will be scored as missed.', 'Leave', () => { end(); }); }
    D.guard = () => { if (!st.done) { leave(); return true; } return false; };
    D.cleanup = () => { shift && shift.stop(); D.guard = null; };

    function intro() {
      body.innerHTML = `<div class="card glow"><div class="topic">Shift briefing · 16:15 IST</div><p class="story">Six trades from today's blotter need matching before EOD. The <b>ticket</b> (left) is ${F}'s golden source. Tap every <b>confirmation field</b> (right) that breaks — wrong amounts, dates, conventions, directions, or <b class="dn">altered bank accounts</b>.</p>
        <div class="stat"><span>Shift clock</span><b>6:00</b></div><div class="stat"><span>Correct break flagged</span><b class="up">+100</b></div><div class="stat"><span>False flag</span><b class="dn">−60</b></div><div class="stat"><span>Missed critical break (amount / direction / account)</span><b class="dn">−200</b></div><div class="stat"><span>Clean deal affirmed</span><b class="up">+80</b></div>
        <small class="note">Pass ≥70% deals exactly right. A perfect shift (6/6) earns the "Clean Day" credential required for L5.</small></div>
        <button class="btn pri">Start shift</button>`;
      D.$('button.btn', body).onclick = () => { D.sfx('deal'); shift = D.countdown(360, (l) => { const el = D.$('#sc'); if (el) { el.textContent = D.mmss(l); el.classList.toggle('hot', l <= 30); } }, () => { D.toast('⏱ Cut-off. Remaining deals unmatched.'); end(); }); render(); };
    }

    function render() {
      const d = deals[st.i], flags = new Set();
      body.innerHTML = `<div class="qhead"><span>DEAL ${st.i + 1}/${N} · ${d.type}</span><span>Score <b class="mono">${st.score}</b> · <span class="timer" id="sc">${D.mmss(shift.left)}</span></span></div>
        <div class="card deal"><div class="hd"><b>${D.esc(d.title)}</b><span class="pill on">${d.type}</span></div>
        <div class="fh"><span>${F.toUpperCase()} TICKET</span><span>CONFIRMATION · tap breaks</span></div>
        ${d.fields.map((x) => `<div class="fld" data-k="${x.k}"><div class="k">${D.esc(x.label)}</div><div class="pair"><div class="v">${D.esc(x.v)}</div><div class="v c">${D.esc(d.conf[x.k])}</div></div></div>`).join('')}</div>
        <div class="row"><button class="btn green" data-a>✓ Affirm (clean)</button><button class="btn pri red" data-b disabled>⚑ Raise break (<span id="nf">0</span>)</button></div>`;
      D.$$('.fld', body).forEach((tr) => (tr.querySelector('.c').onclick = () => {
        const k = tr.dataset.k; D.sfx('tap');
        if (flags.has(k)) { flags.delete(k); tr.classList.remove('flag'); } else { flags.add(k); tr.classList.add('flag'); D.buzz(15); }
        D.$('#nf', body).textContent = flags.size; D.$('[data-b]', body).disabled = !flags.size; D.$('[data-a]', body).disabled = !!flags.size;
      }));
      D.$('[data-a]', body).onclick = () => judge(d, flags);
      D.$('[data-b]', body).onclick = () => judge(d, flags);
    }

    function judge(d, flags) {
      const bk = Object.keys(d.breaks); let pts = 0, exact = true, notes = [];
      if (!bk.length && !flags.size) { pts += 80; notes.push('<span class="up">✓ Clean deal correctly affirmed.</span>'); }
      bk.forEach((k) => { if (flags.has(k)) { pts += 100; st.found++; } else { exact = false; st.missed++; if (d.crit[k]) { pts -= 200; st.critMiss++; } } });
      flags.forEach((k) => { if (!d.breaks[k]) { pts -= 60; st.falsef++; exact = false; } });
      if (exact) st.exact++; st.score += pts;
      exact ? D.sfx('good') : D.sfx('bad');
      if (!exact) { body.classList.add('flash-red'); setTimeout(() => body.classList.remove('flash-red'), 500); }
      D.$$('.fld', body).forEach((tr) => { const k = tr.dataset.k; tr.querySelector('.c').onclick = null; tr.classList.remove('flag'); if (d.breaks[k] && flags.has(k)) tr.classList.add('hit'); else if (d.breaks[k]) tr.classList.add('miss'); else if (flags.has(k)) tr.classList.add('flag'); });
      bk.forEach((k) => notes.push(`${flags.has(k) ? '<span class="up">✓ Caught</span>' : '<span class="amb">✗ Missed</span>'} <b>${D.esc(d.fields.find((x) => x.k === k).label)}</b>: ${D.esc(d.breaks[k])}${d.crit[k] ? ' <span class="tag LV">CRITICAL</span>' : ''}`));
      flags.forEach((k) => { if (!d.breaks[k]) notes.push(`<span class="dn">✗ False flag</span> <b>${D.esc(d.fields.find((x) => x.k === k).label)}</b> matched the ticket.`); });
      const act = body.querySelector('.row');
      act.outerHTML = `<div class="exp" style="--accent:${exact ? 'var(--green)' : 'var(--amber)'}"><b class="mono">${pts >= 0 ? '+' : ''}${pts}</b><br>${notes.join('<br>')}</div><button class="btn pri" id="nx">${st.i + 1 < N ? 'Next deal →' : 'Close shift'}</button>`;
      D.$('#nx', body).onclick = () => { D.sfx('tap'); st.i++; if (st.i < N) render(); else end(); };
    }

    function end() {
      if (st.done) return; st.done = true; shift && shift.stop(); D.guard = null;
      const pct = Math.round((st.exact / N) * 100), pass = pct >= 70, clean = st.exact === N;
      const tp = D.tp('bo'); const s = (tp.sims.spot = tp.sims.spot || { best: 0, plays: 0 });
      s.plays++; s.best = Math.max(s.best, st.score); if (pass) tp.simPasses++;
      let xp = Math.max(20, Math.round(st.score / 4)); if (clean) { xp += 150; if (!tp.cleanDay) { tp.cleanDay = true; setTimeout(() => D.badge('clean-day', 'Clean Day — perfect matching shift'), 900); } }
      D.addXP(xp); D.logEvent(`Spot the Break: ${st.exact}/${N} exact, score ${st.score}`); D.save();
      app.style.setProperty('--accent', pass ? 'var(--green)' : 'var(--amber)');
      body.innerHTML = `<div class="card glow" style="text-align:center"><div class="topic">Shift closed</div><div class="big">${st.exact}/${N}</div><div class="pill on">${clean ? '★ CLEAN DAY' : pass ? '✓ PASS' : '✗ BELOW 70%'}</div></div>
        <div class="card"><div class="stat"><span>Desk score</span><b>${st.score}</b></div><div class="stat"><span>Breaks caught</span><b class="up">${st.found}</b></div><div class="stat"><span>Breaks missed</span><b class="amb">${st.missed}</b></div><div class="stat"><span>Critical misses</span><b class="dn">${st.critMiss}</b></div><div class="stat"><span>False flags</span><b>${st.falsef}</b></div><div class="stat"><span>XP</span><b class="amb">+${xp}</b></div>
        <small class="note">${st.critMiss ? 'A missed account or direction break is how real money leaves the building. Always compare SSIs character-by-character against static data.' : 'Matching discipline: amount → direction → dates → convention → SSI. Every time.'}</small></div>
        <div class="row"><button class="btn" data-r>Run another shift</button><button class="btn pri" data-d>Done</button></div>`;
      D.$('[data-r]', body).onclick = () => D.go(D.spot, opt, true);
      D.$('[data-d]', body).onclick = () => D.back();
    }
    intro();
  };
})();
