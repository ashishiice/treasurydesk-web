/* Animated backdrop: glowing yield curve + drifting grid, and a simulated ticker tape.
   All market levels shown are SYNTHETIC (game world), not live data. */
(function () {
  const D = window.D;
  const cv = document.getElementById('bg'), cx = cv.getContext('2d');
  let W, H, t = 0, mood = 0; // mood: 0 calm, 1 stress (boss)
  function size() { const r = window.devicePixelRatio || 1; W = cv.width = innerWidth * r; H = cv.height = innerHeight * r; }
  addEventListener('resize', size); size();
  const tenors = [0.08, 0.25, 0.5, 1, 2, 3, 5, 7, 10, 15, 30];
  const base = [5.35, 5.5, 5.62, 5.8, 6.0, 6.12, 6.3, 6.42, 6.55, 6.7, 6.85];
  const dots = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), v: 0.0002 + Math.random() * 0.0006 }));
  D.mood = (m) => { mood = m; };
  function frame() {
    t += 0.008;
    cx.clearRect(0, 0, W, H);
    const g = cx.createRadialGradient(W * 0.8, H * 0.1, 0, W * 0.8, H * 0.1, H * 0.9);
    g.addColorStop(0, mood ? 'rgba(244,63,94,0.10)' : 'rgba(34,211,238,0.07)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    cx.strokeStyle = 'rgba(120,150,200,0.05)'; cx.lineWidth = 1;
    const gs = 48 * (devicePixelRatio || 1), off = (t * 20) % gs;
    for (let x = -off; x < W; x += gs) { cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, H); cx.stroke(); }
    for (let y = off; y < H; y += gs) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); }
    // yield curves (3 echoes)
    for (let k = 2; k >= 0; k--) {
      cx.beginPath();
      tenors.forEach((tn, i) => {
        const x = W * (0.04 + 0.92 * Math.log(1 + tn * 12) / Math.log(1 + 360));
        const shock = mood ? Math.sin(t * 3 + i) * 0.25 + (i < 4 ? 0.9 : 0.2) : 0;
        const yv = base[i] + Math.sin(t + i * 0.7 + k) * 0.06 + shock;
        const y = H * (0.82 - (yv - 5) * 0.18) + k * 10;
        i ? cx.lineTo(x, y) : cx.moveTo(x, y);
      });
      cx.strokeStyle = mood ? `rgba(244,63,94,${0.35 - k * 0.1})` : `rgba(34,211,238,${0.32 - k * 0.09})`;
      cx.lineWidth = (3 - k) * (devicePixelRatio || 1); cx.shadowColor = mood ? '#f43f5e' : '#22d3ee'; cx.shadowBlur = 18; cx.stroke(); cx.shadowBlur = 0;
    }
    cx.fillStyle = mood ? 'rgba(244,63,94,0.5)' : 'rgba(255,176,32,0.45)';
    dots.forEach((d) => { d.y -= d.v * (mood ? 3 : 1); if (d.y < 0) { d.y = 1; d.x = Math.random(); } cx.fillRect(d.x * W, d.y * H, 2, 2); });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ticker (synthetic)
  const q = [['TREPS O/N', 5.42, 2], ['CALL', 5.55, 2], ['3M CP AAA NBFC', 7.15, 2], ['3M T-BILL', 5.48, 2], ['1Y OIS', 5.62, 2], ['5Y OIS', 5.95, 2], ['10Y G-SEC', 6.48, 3], ['USD/INR', 88.4, 2], ['3Y AAA NBFC', 7.32, 2], ['5Y CCS', 6.1, 2], ['FINCORP 3Y NCD', 7.45, 2]];
  function tape() {
    const items = q.map((x) => { const ch = (Math.random() - 0.5) * 0.06; x[1] = +(x[1] + ch).toFixed(x[2]); return `<span><b>${x[0]}</b> ${x[1].toFixed(x[2])} <span class="${ch >= 0 ? 'up' : 'dn'}">${ch >= 0 ? '▲' : '▼'}${Math.abs(ch).toFixed(2)}</span></span>`; }).join(' &nbsp;·&nbsp; ');
    const s = `<span class="dim">SIMULATED MARKET — NOT LIVE DATA</span> &nbsp;·&nbsp; ${items} &nbsp;·&nbsp; `;
    document.getElementById('tape').innerHTML = s + s;
  }
  tape(); setInterval(tape, 60000);
})();
