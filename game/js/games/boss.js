/* BLACK SWAN boss battles — timed decision chains with gauges. Scenarios are fictionalised
   and *inspired by* real events; names, numbers and timelines are illustrative. */
(function () {
  const D = window.D, F = D.FIRM;
  // option: {t: text, p: points (3 best / 1 ok / -1 poor), fx:[liq,rep,ctl], fb: debrief, fatal?: true}
  D.BOSSES = {
    freeze: {
      name: 'The Freeze', track: 'bo', icon: '🧊', inspired: 'Inspired by the Sep-2018 NBFC funding freeze after a large infra-lender default',
      intro: `Friday. A large infrastructure lender has defaulted on its CP overnight. Money market funds face redemptions and are refusing NBFC paper. ${F} has ₹1,150 Cr of CP maturing in 30 days — ₹300 Cr of it today at 15:00. You are Head of Treasury Ops.`,
      start: [55, 70, 70],
      nodes: [
        { time: '08:45', text: 'Meridian Liquid Fund says it will NOT roll over today\'s ₹300 Cr CP. The Treasurer is in a car, on mute. What is your first move?', opts: [
          { t: 'Build the live funding gap — cash, same-day lines, T-bill collateral — and send it to the Treasurer by 09:15', p: 3, fx: [10, 5, 10], fb: 'Facts before panic. A precise gap with same-day-available sources is what the Treasurer and ALCO need to decide.' },
          { t: 'Let the dealers canvass other MFs and insurers for a replacement ₹300 Cr CP by noon', p: -1, fx: [-15, -5, -5], fb: 'In a market freeze, rollover is the risk itself. Waiting burns the hours you need for bank drawdowns.' },
          { t: 'Ask the IPA to defer Meridian\'s payout to Monday while lines are arranged', p: -1, fx: [0, -40, -20], fb: 'Not paying on the due date is a default — rating downgrade, cross-default triggers, disclosure. Never an option.', fatal: true },
          { t: 'Email all CP investors today reassuring them of FinCorp\'s strong liquidity', p: 1, fx: [0, 5, -5], fb: 'Communication matters, but uncoordinated messaging from Ops can backfire. Investor comms go via the Treasurer/CFO with facts.' }] },
        { time: '10:05', text: 'Sources: Coastal WCDL ₹200 Cr (same-day), Northbridge TL ₹500 Cr undrawn (needs 2 working days\' notice), T-bills ₹150 Cr in CCIL pool, liquid funds ₹250 Cr, cash ₹40 Cr. Which plan funds ₹300 Cr by 15:00 with certainty?', opts: [
          { t: 'Coastal ₹200 Cr + TREPS ₹100 Cr vs T-bills; serve Northbridge notice for Tuesday', p: 3, fx: [20, 5, 5], fb: 'Same-day certain sources for today, and notice served on the larger line for the maturities coming next week.' },
          { t: 'Redeem ₹250 Cr liquid funds now and use ₹50 Cr cash for the balance', p: -1, fx: [-30, -5, 0], fb: 'Liquid funds pay T+1 — and in a run, MF redemptions are exactly what the funds are struggling to meet. It doesn\'t arrive today.' },
          { t: 'Draw ₹300 Cr on the undrawn Northbridge term loan today', p: -1, fx: [-25, 0, -5], fb: 'The line needs 2 days\' notice. Know your facility terms before the crisis.' },
          { t: 'Coastal ₹200 Cr + ₹100 Cr from cash and liquid fund redemption', p: 1, fx: [-5, 0, 0], fb: 'Cash is only ₹40 Cr; the liquid fund part arrives tomorrow. You\'d be short ~₹60 Cr at 15:00.' }] },
        { time: '12:20', text: 'Coastal needs a signed drawdown request and Board resolution copy. One of the two authorised signatories is on a flight until 16:00.', opts: [
          { t: 'Use the alternate signatory in the Board-approved matrix; scans now, originals by courier', p: 3, fx: [10, 0, 10], fb: 'Pre-built signatory depth is a contingency-planning control. Use it exactly as documented.' },
          { t: 'Send the request with one signature and an undertaking for the second by 16:00', p: -1, fx: [-10, 0, -15], fb: 'Banks will (rightly) reject it. Do not bend authorisations under pressure.' },
          { t: 'Ask Coastal\'s relationship manager to waive the second signature this once', p: 1, fx: [-5, -5, -5], fb: 'It may work, but it costs time and credibility at the moment you need both.' },
          { t: 'Postpone the drawdown to Monday and use TREPS for the full ₹300 Cr', p: -1, fx: [-30, -10, 0], fb: 'Monday is too late for a 15:00 Friday maturity.' }] },
        { time: '14:10', text: 'WCDL credited ₹200 Cr; TREPS ₹100 Cr settled. A ₹45 Cr dealer disbursement batch is queued to auto-release at 14:30. Current balance: ₹340 Cr.', opts: [
          { t: 'Hold the disbursement batch; fund the IPA first and get its confirmation', p: 3, fx: [10, 0, 5], fb: 'Critical path first. ₹340 − 45 = ₹295 Cr would leave you ₹5 Cr short. Discretionary flows wait.' },
          { t: 'Release both — the balance covers the redemption and the batch', p: -1, fx: [-20, -20, -10], fb: '₹340 − ₹45 = ₹295 Cr < ₹300 Cr. The CP redemption would fall short.', fatal: true },
          { t: 'Cancel the disbursement batch and tell dealers to resubmit next week', p: 1, fx: [5, -10, 0], fb: 'Holding is right; cancelling hurts dealers and the franchise unnecessarily. Re-release when funded.' },
          { t: 'Pay the IPA ₹295 Cr now and the remaining ₹5 Cr after collections at 16:00', p: -1, fx: [0, -30, -10], fb: 'A partial payment is still a default.', fatal: true }] },
        { time: '15:05', text: 'IPA confirms receipt; redemption processed. What closes the loop today?', opts: [
          { t: 'Get IPA confirmation, reconcile, refresh the 30-day ladder, brief the Treasurer for CRA calls', p: 3, fx: [5, 10, 10], fb: 'Evidence, reconciliation and forward visibility. Rating agencies will ask for your liquidity runway before Monday.' },
          { t: 'Close the day — the redemption is done and confirmed by phone', p: -1, fx: [0, -10, -10], fb: 'The crisis is 30 days long, not one afternoon.' },
          { t: 'Post on the company LinkedIn page that the CP was repaid on time', p: -1, fx: [0, -15, -10], fb: 'Unauthorised external communication. Disclosure goes through the proper channels.' },
          { t: 'Prepay next week\'s CPs from the WCDL to signal strength to the market', p: 1, fx: [-20, 5, 0], fb: 'Burning scarce liquidity for optics during a freeze is dangerous unless the runway is ample.' }] },
        { time: 'Mon 08:30', text: '₹850 Cr still maturing in the next 30 days. ALCO meets at 10:00. What does Ops bring?', opts: [
          { t: 'Daily T+30 cash ladder, committed lines and notice periods, unencumbered HQLA, CFP triggers', p: 3, fx: [10, 5, 10], fb: 'This is what ALCO runs a crisis on. The CFP is only as good as the data under it.' },
          { t: 'Last month\'s audited ALM statement with structural liquidity buckets', p: -1, fx: [-10, 0, -10], fb: 'Stale data in a fast-moving crisis misleads decisions.' },
          { t: 'A request from Ops to stop all disbursements until markets normalise', p: 1, fx: [10, -15, 0], fb: 'Slowing disbursements is a lever — but it is a business decision for ALCO, informed by data, not an Ops ask.' },
          { t: 'A plan to roll every maturing CP, accepting whatever yield clears', p: -1, fx: [-5, -15, 0], fb: 'Rolling short-term debt at distressed prices deepens the ALM mismatch the market is punishing.' }] }
      ],
      lesson: 'Liquidity crises are won in preparation: same-day committed lines, unencumbered HQLA, signatory depth, granular ladders and a rehearsed Contingency Funding Plan (RBI Liquidity Risk Management Framework for NBFCs, 04-Nov-2019).'
    },
    fatfinger: {
      name: 'Fat Finger', track: 'bo', icon: '🫠', inspired: 'Generic operational-risk event — a mis-keyed high-value payment',
      intro: `Tuesday 11:40. Reconciliation flags an RTGS of ₹250 Cr to Peninsula Bank for a term-loan prepayment that should have been ₹25 Cr. ${F} has a ₹180 Cr NCD redemption at 15:00.`,
      start: [45, 70, 60],
      nodes: [
        { time: '11:42', text: 'The RTGS has settled. Who do you contact first?', opts: [
          { t: 'Your bank\'s payments desk for a return request, and Peninsula\'s RM in parallel', p: 3, fx: [10, 0, 10], fb: 'Speed matters. RTGS is irrevocable, but a counterparty bank holding an excess payment can return it with consent the same day.' },
          { t: 'RBI\'s RTGS help desk, to reverse the settled transaction', p: -1, fx: [-10, 0, -5], fb: 'RTGS settlement is final; RBI does not reverse settled payments.' },
          { t: 'Nobody yet — complete the full-day reconciliation first to be certain', p: -1, fx: [-15, 0, -5], fb: 'The facts are clear enough. Every hour lowers same-day recovery odds.' },
          { t: 'The maker and checker, to establish exactly what went wrong', p: 1, fx: [0, 0, 0], fb: 'Root cause comes later. Recovery and liquidity first.' }] },
        { time: '12:10', text: 'Peninsula says the excess ₹225 Cr was applied to the loan account (full prepayment) and a return needs their credit approval — likely tomorrow. You are now short for the 15:00 NCD redemption by ~₹120 Cr.', opts: [
          { t: 'Fund the gap now from TREPS and the WCDL; chase the return in parallel', p: 3, fx: [20, 5, 5], fb: 'Separate the two problems. The NCD redemption is critical; recovery is a working-capital issue.' },
          { t: 'Ask NCD investors, via the trustee, to accept payment tomorrow', p: -1, fx: [0, -40, -10], fb: 'Default on a listed NCD — 2% p.a. additional interest, disclosure, rating action.', fatal: true },
          { t: 'Insist Peninsula returns the funds before 15:00 and hold the NCD payment till then', p: -1, fx: [-20, -5, 0], fb: 'Hope is not a funding plan.' },
          { t: 'Redeem ₹150 Cr of liquid funds to cover the shortfall', p: -1, fx: [-20, 0, 0], fb: 'T+1. Doesn\'t help at 15:00.' }] },
        { time: '13:30', text: 'Gap funded. Escalation: who must know today?', opts: [
          { t: 'Treasurer, CFO and CRO now; log an op-risk incident; Audit Committee per policy', p: 3, fx: [0, 10, 15], fb: 'Transparent, prompt escalation under the operational risk framework.' },
          { t: 'Only the Treasurer — escalate wider only if recovery fails', p: -1, fx: [0, -10, -15], fb: 'Under-reporting incidents is itself a control failure.' },
          { t: 'All Treasury and Finance staff by email, for awareness', p: 1, fx: [0, -5, 0], fb: 'Right instinct, wrong channel — keep it need-to-know and documented.' },
          { t: 'Nobody until the money is back — then a full write-up', p: -1, fx: [0, -15, -20], fb: 'Concealment turns an error into a governance problem.' }] },
        { time: '16:30', text: 'Root cause: maker typed 2500000000; the checker approved on a mobile token, viewing a truncated amount. What fix prevents recurrence?', opts: [
          { t: 'STP from the treasury system, system amount-match before release, full-screen checker view', p: 3, fx: [0, 5, 20], fb: 'Remove re-keying (STP), add an independent amount reconciliation and fix the authorisation UI weakness.' },
          { t: 'Retrain the maker and add a payment-accuracy KPI to their goals', p: 1, fx: [0, 0, 5], fb: 'Training helps, but the control gap is that the checker could not see what they approved.' },
          { t: 'Add a third approver for every payment above ₹10 Cr', p: 1, fx: [0, 0, 5], fb: 'More signatures with the same blind spot don\'t fix it, and they slow operations.' },
          { t: 'Disciplinary action for the maker and checker, then close the incident', p: -1, fx: [0, -5, -10], fb: 'Blame without a system fix guarantees a repeat.' }] }
      ],
      lesson: 'RTGS is final. Recovery depends on speed and relationships; the critical-path payment must be funded independently of recovery. Fix fat-finger risk with STP, independent amount checks and authorisation UIs that show the full amount.'
    }
  };

  D.boss = function (app, opt) {
    const B = D.BOSSES[opt.id];
    const st = { i: 0, g: B.start.slice(), pts: 0, max: B.nodes.length * 3, fatal: false, picks: [], done: false };
    let tmr = null;
    app.style.setProperty('--accent', 'var(--red)');
    app.appendChild(D.top(B.name, 'Black Swan · Boss battle', () => leave()));
    const body = document.createElement('div'); app.appendChild(body);
    function leave() { if (st.done) return D.back(); D.confirm('Walk away?', 'Abandoning a crisis counts as a loss.', 'Walk away', () => { st.fatal = true; end(); }); }
    D.guard = () => { if (!st.done) { leave(); return true; } return false; };
    D.cleanup = () => { tmr && tmr.stop(); D.guard = null; D.mood(0); };
    const gauge = (n, v, c) => `<div class="g"><small>${n}</small><b style="color:${c}">${Math.round(v)}</b><div class="bar"><i style="width:${D.clamp(v, 0, 100)}%;background:${c}"></i></div></div>`;
    const gauges = () => `<div class="gauges">${gauge('LIQUIDITY', st.g[0], 'var(--cyan)')}${gauge('REPUTATION', st.g[1], 'var(--amber)')}${gauge('CONTROL', st.g[2], 'var(--violet)')}</div>`;

    function intro() {
      D.mood(1); D.sfx('boss');
      body.innerHTML = `<div class="card glow"><div class="topic">${B.icon} BLACK SWAN</div><h2 style="font-size:26px;margin:6px 0">${D.esc(B.name)}</h2><p class="story">${D.esc(B.intro)}</p><small class="note">${D.esc(B.inspired)}. Names and figures are fictional.</small></div>
        ${gauges()}<div class="card"><div class="stat"><span>Decisions</span><b>${B.nodes.length}</b></div><div class="stat"><span>Time per decision</span><b>40s</b></div><div class="stat"><span>Win</span><b>≥70% decision quality, no fatal move</b></div></div>
        <button class="btn pri red">Enter the war room</button>`;
      D.$('button.btn', body).onclick = () => { D.sfx('alarm'); node(); };
    }
    function node() {
      const n = B.nodes[st.i], order = D.R.shuffle(n.opts.map((_, i) => i));
      body.innerHTML = `${gauges()}<div class="card"><div class="qhead"><span class="time">⏱ ${D.esc(n.time)}</span><span>${st.i + 1}/${B.nodes.length} · <span class="timer" id="bt">40</span></span></div><div class="story">${D.esc(n.text)}</div></div>
        ${order.map((oi, k) => `<button class="opt" data-o="${oi}"><span class="k">${'ABCD'[k]}</span><span>${D.esc(n.opts[oi].t)}</span></button>`).join('')}`;
      tmr = D.countdown(40, (l) => { const el = D.$('#bt'); if (el) { el.textContent = l; el.classList.toggle('hot', l <= 10); } if (l <= 5 && l > 0) D.sfx('tick'); }, () => pick(null));
      D.$$('.opt', body).forEach((b) => (b.onclick = () => pick(+b.dataset.o)));
    }
    function pick(oi) {
      tmr && tmr.stop();
      const n = B.nodes[st.i], best = n.opts.findIndex((o) => o.p === 3);
      const o = oi === null ? { t: '(no decision — time ran out)', p: -1, fx: [-15, -10, -10], fb: 'Indecision in a crisis is a decision. The clock kept running.' } : n.opts[oi];
      st.pts += o.p; st.g = st.g.map((v, i) => D.clamp(v + o.fx[i], 0, 100)); st.picks.push({ n, o });
      if (o.fatal) st.fatal = true;
      o.p === 3 ? D.sfx('good') : (D.sfx('bad'), body.classList.add('shake'));
      D.$$('.opt', body).forEach((b) => { const i = +b.dataset.o; b.onclick = null; if (i === best) b.classList.add('right'); else if (i === oi) b.classList.add('wrong'); else b.classList.add('gone'); });
      const dead = st.fatal || st.g[0] <= 0;
      body.insertAdjacentHTML('beforeend', `<div class="exp" style="--accent:${o.p === 3 ? 'var(--green)' : o.p > 0 ? 'var(--amber)' : 'var(--red)'}">${o.fatal ? '<b class="dn">FATAL — </b>' : ''}${D.esc(o.fb)}${o.p !== 3 ? `<br><br><b>Best move:</b> ${D.esc(n.opts[best].t)}` : ''}</div><button class="btn pri red" id="nx">${dead ? 'See the aftermath' : st.i + 1 < B.nodes.length ? 'Next →' : 'Resolve the crisis'}</button>`);
      D.$('#nx', body).onclick = () => { D.sfx('tap'); if (dead) return end(); st.i++; st.i < B.nodes.length ? node() : end(); };
      setTimeout(() => body.classList.remove('shake'), 400);
    }
    function end() {
      if (st.done) return; st.done = true; tmr && tmr.stop(); D.guard = null; D.mood(0);
      const q = Math.max(0, Math.round((st.pts / st.max) * 100)), win = !st.fatal && st.g[0] > 0 && st.i >= B.nodes.length - 1 && q >= 70;
      const tp = D.tp(B.track), rec = (tp.bosses[opt.id] = tp.bosses[opt.id] || { won: false, best: 0, plays: 0 });
      rec.plays++; rec.best = Math.max(rec.best, q); const first = win && !rec.won; if (win) rec.won = true;
      const xp = D.addXP(win ? 300 + q * 2 : 40 + q); D.logEvent(`Boss ${B.name}: ${win ? 'WON' : 'lost'} (${q}%)`);
      if (first) setTimeout(() => D.badge('boss-' + opt.id, 'Survived ' + B.name), 800);
      D.save();
      app.style.setProperty('--accent', win ? 'var(--green)' : 'var(--red)');
      body.innerHTML = `<div class="card glow" style="text-align:center"><div class="topic">${win ? 'CRISIS CONTAINED' : st.fatal ? 'FATAL MOVE' : 'CRISIS LOST'}</div><div class="big">${q}%</div><div class="pill on">${win ? '✓ BOSS DEFEATED' : '✗ TRY AGAIN'}</div></div>
        ${gauges()}<div class="card"><div class="topic">The lesson</div><p class="story">${D.esc(B.lesson)}</p><div class="stat"><span>XP</span><b class="amb">+${xp}</b></div></div>
        <div class="card"><div class="topic">Your decisions</div>${st.picks.map((p) => `<div class="stat"><span style="max-width:80%">${D.esc(p.n.time)} — ${D.esc(p.o.t)}</span><b class="${p.o.p === 3 ? 'up' : p.o.p > 0 ? 'amb' : 'dn'}">${p.o.p === 3 ? '✓' : p.o.p > 0 ? '~' : '✗'}</b></div>`).join('')}</div>
        <div class="row"><button class="btn" data-r>Replay</button><button class="btn pri" data-d>Done</button></div>`;
      D.$('[data-r]', body).onclick = () => D.go(D.boss, opt, true);
      D.$('[data-d]', body).onclick = () => D.back();
    }
    intro();
  };
})();
