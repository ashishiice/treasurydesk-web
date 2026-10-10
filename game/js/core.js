/* THE DESK — core: state, storage, routing, audio, haptics, utils */
(function () {
  const D = (window.D = {});
  D.FIRM = 'FinCorp';
  D.VERSION = '0.1.0';
  const KEY = 'thedesk.v1';

  /* ---------- utils ---------- */
  D.$ = (s, el = document) => el.querySelector(s);
  D.$$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  D.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  D.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  D.rng = function (seed) {
    let a = seed >>> 0 || 1;
    const r = () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    r.step = (lo, hi, st) => { const dp = (String(st).split('.')[1] || '').length; return +(lo + st * Math.floor(r() * (Math.round((hi - lo) / st) + 1))).toFixed(dp); };
    r.shuffle = (arr) => { const a2 = arr.slice(); for (let i = a2.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a2[i], a2[j]] = [a2[j], a2[i]]; } return a2; };
    return r;
  };
  D.R = D.rng((Date.now() ^ (Math.random() * 1e9)) >>> 0);
  const nf = {};
  D.fmt = (n, dp = 2) => (nf[dp] = nf[dp] || new Intl.NumberFormat('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp })).format(n);
  D.inr = (n, dp = 0) => '₹' + D.fmt(n, dp);
  D.cr = (n, dp = 2) => '₹' + D.fmt(n, dp) + ' Cr';
  D.round = (x, dp) => { const f = Math.pow(10, dp); return Math.round((x + Number.EPSILON) * f) / f; };
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  D.date = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
  D.addDays = (dt, n) => new Date(dt.getTime() + n * 864e5);
  D.days = (a, b) => Math.round((b - a) / 864e5);
  D.dfmt = (dt, dow = true) => (dow ? DOW[dt.getUTCDay()] + ' ' : '') + String(dt.getUTCDate()).padStart(2, '0') + '-' + MON[dt.getUTCMonth()] + '-' + dt.getUTCFullYear();
  D.isWeekend = (dt) => dt.getUTCDay() === 0 || dt.getUTCDay() === 6;
  D.nextBiz = (dt) => { while (D.isWeekend(dt)) dt = D.addDays(dt, 1); return dt; };
  D.isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  D.today = () => { const t = new Date(); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); };
  D.hash = function (str) { // cyrb53 → 13-char base36
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36).toUpperCase().padStart(11, '0');
  };

  /* ---------- storage ---------- */
  const blank = () => ({ profiles: {}, active: null, settings: { sound: true, haptics: true } });
  D.load = function () {
    try { D.S = JSON.parse(localStorage.getItem(KEY)) || blank(); } catch (e) { D.S = blank(); }
    D.S.settings = Object.assign({ sound: true, haptics: true }, D.S.settings || {});
  };
  D.save = function () { try { localStorage.setItem(KEY, JSON.stringify(D.S)); } catch (e) { /* storage unavailable */ } };
  D.me = () => D.S.profiles[D.S.active];
  D.newProfile = function (name, deskId) {
    const id = 'p' + Date.now().toString(36);
    D.S.profiles[id] = { id, name: name.trim().slice(0, 40), deskId: (deskId || '').trim().slice(0, 20), created: Date.now(), xp: 0, streak: { n: 0, last: null }, daily: null, tracks: {}, certs: [], badges: [], log: [] };
    D.S.active = id; D.save(); return D.S.profiles[id];
  };
  D.tp = function (track) { // per-track progress
    const p = D.me(); p.tracks[track] = p.tracks[track] || { learn: 0, sims: {}, simPasses: 0, bosses: {}, examBest: 0, cleanDay: false, quizBest: 0 };
    return p.tracks[track];
  };
  D.logEvent = function (text) { const p = D.me(); p.log.unshift({ t: Date.now(), text }); p.log = p.log.slice(0, 60); };

  /* ---------- XP / ranks ---------- */
  D.RANKS = [[0, 'Trainee'], [400, 'Analyst'], [1200, 'Associate'], [3000, 'Manager'], [6000, 'Vice President'], [10000, 'Director'], [16000, 'Desk Legend']];
  D.rank = function (xp) {
    let i = 0; while (i + 1 < D.RANKS.length && xp >= D.RANKS[i + 1][0]) i++;
    const cur = D.RANKS[i], nxt = D.RANKS[i + 1];
    return { name: cur[1], idx: i, pct: nxt ? (xp - cur[0]) / (nxt[0] - cur[0]) : 1, next: nxt ? nxt[0] : null };
  };
  D.addXP = function (n, why) {
    const p = D.me(); const before = D.rank(p.xp).idx; p.xp += Math.max(0, Math.round(n)); D.save();
    const after = D.rank(p.xp);
    if (after.idx > before) setTimeout(() => D.celebrate('PROMOTED', after.name, 'New rank unlocked on the floor.'), 600);
    return n;
  };
  D.badge = function (id, label) {
    const p = D.me(); if (p.badges.includes(id)) return false;
    p.badges.push(id); p.badgeNames = Object.assign(p.badgeNames || {}, { [id]: label }); D.save(); D.toast('🏅 Badge: ' + label); D.sfx('level'); return true;
  };

  /* ---------- routing ---------- */
  D.stack = [];
  D.cleanup = null;
  D.go = function (fn, args, replace) {
    if (D.cleanup) { try { D.cleanup(); } catch (e) {} D.cleanup = null; }
    if (!replace) D.stack.push([fn, args]); else D.stack[D.stack.length - 1] = [fn, args];
    const app = D.$('#app'); app.scrollTop = 0; app.innerHTML = ''; app.className = 'fade';
    void app.offsetWidth; fn(app, args || {});
  };
  D.home = function () { D.stack = []; D.go(D.screens.hub); };
  D.guard = null; // function returning true to block back
  D.back = function () {
    if (D.$('.overlay')) { D.$('.overlay').remove(); return true; }
    if (D.guard && D.guard()) return true;
    if (D.stack.length > 1) { D.stack.pop(); const [fn, args] = D.stack.pop(); D.go(fn, args); return true; }
    return false;
  };
  D.top = (title, sub, onBack) => {
    const h = document.createElement('div'); h.className = 'top';
    h.innerHTML = `<button class="back" aria-label="Back">←</button><div class="ttl"><small>${D.esc(sub || '')}</small><h2>${D.esc(title)}</h2></div>`;
    h.firstChild.onclick = () => { D.sfx('tap'); onBack ? onBack() : D.back(); };
    return h;
  };
  D.el = function (html) { const t = document.createElement('div'); t.innerHTML = html.trim(); return t.firstChild; };

  /* ---------- feedback ---------- */
  let toastT;
  D.toast = function (msg, ms = 2200) { const t = D.$('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); };
  D.buzz = function (ms) {
    if (!D.S.settings.haptics) return;
    try { if (window.DeskNative && DeskNative.vibrate) DeskNative.vibrate(ms); else if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
  };
  let AC = null;
  function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (AC.state === 'suspended') AC.resume(); return AC; }
  function tone(f, d, type = 'sine', vol = 0.08, when = 0, slide = 0) {
    const c = ac(); if (!c) return;
    const t0 = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + d);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + d + 0.02);
  }
  D.sfx = function (k) {
    if (!D.S.settings.sound) return;
    switch (k) {
      case 'tap': tone(880, 0.04, 'square', 0.025); break;
      case 'good': tone(660, 0.09, 'triangle', 0.07); tone(990, 0.14, 'triangle', 0.07, 0.07); break;
      case 'bad': tone(180, 0.25, 'sawtooth', 0.06, 0, 90); D.buzz(120); break;
      case 'tick': tone(1400, 0.03, 'square', 0.02); break;
      case 'alarm': tone(520, 0.18, 'square', 0.05); tone(390, 0.18, 'square', 0.05, 0.2); tone(520, 0.18, 'square', 0.05, 0.4); D.buzz(300); break;
      case 'level': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.07, i * 0.09)); D.buzz(60); break;
      case 'boss': tone(110, 0.9, 'sawtooth', 0.07, 0, 55); tone(82, 1.1, 'square', 0.04, 0.1, 41); D.buzz(400); break;
      case 'deal': tone(1200, 0.05, 'sine', 0.06); tone(1800, 0.08, 'sine', 0.05, 0.05); break;
    }
  };
  D.celebrate = function (kicker, title, body, cb) {
    if (D.$('.overlay')) { setTimeout(() => D.celebrate(kicker, title, body, cb), 400); return; } // queue behind any open overlay
    D.sfx('level');
    const o = D.el(`<div class="overlay"><div class="card glow lvup" style="--accent:var(--gold)"><div class="topic">${D.esc(kicker)}</div><div class="big">${D.esc(title)}</div><p class="mute">${D.esc(body)}</p><button class="btn pri">Continue</button></div></div>`);
    o.querySelector('button').onclick = () => { o.remove(); cb && cb(); };
    document.body.appendChild(o);
  };
  D.confirm = function (title, body, yes, onYes) {
    const o = D.el(`<div class="overlay"><div class="card"><h3>${D.esc(title)}</h3><p class="mute" style="font-size:14px;line-height:1.5">${body}</p><div class="row"><button class="btn ghost" data-n>Cancel</button><button class="btn pri" data-y>${D.esc(yes)}</button></div></div></div>`);
    o.querySelector('[data-n]').onclick = () => o.remove();
    o.querySelector('[data-y]').onclick = () => { o.remove(); onYes(); };
    document.body.appendChild(o);
  };

  /* countdown helper: returns {stop, left} */
  D.countdown = function (secs, onTick, onEnd) {
    let left = secs, alive = true;
    const iv = setInterval(() => { if (!alive) return; left--; onTick(left); if (left <= 0) { alive = false; clearInterval(iv); onEnd(); } }, 1000);
    onTick(left);
    return { stop() { alive = false; clearInterval(iv); }, get left() { return left; }, add(s) { left += s; } };
  };
  D.mmss = (s) => Math.floor(Math.max(0, s) / 60) + ':' + String(Math.max(0, s) % 60).padStart(2, '0');

  /* Android hardware back calls Desk.back() */
  window.Desk = { back: () => D.back() };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') D.back(); });
})();
