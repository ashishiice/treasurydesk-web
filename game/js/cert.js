/* Certificate renderer (canvas → PNG) + share/download */
(function () {
  const D = window.D;
  D.certDraw = function (c) {
    const W = 1600, H = 1130, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#071021'); g.addColorStop(1, '#0d1a33'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    // guilloche
    x.strokeStyle = 'rgba(245,196,81,0.07)'; x.lineWidth = 1;
    for (let k = 0; k < 60; k++) { x.beginPath(); for (let t = 0; t <= Math.PI * 2 + 0.01; t += 0.02) { const r = 300 + 40 * Math.sin(6 * t + k * 0.1) + k * 2; const px = W / 2 + r * Math.cos(t) * 1.6, py = H / 2 + r * Math.sin(t) * 0.75; t ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); }
    // borders
    x.strokeStyle = '#f5c451'; x.lineWidth = 6; x.strokeRect(40, 40, W - 80, H - 80); x.lineWidth = 1.5; x.strokeRect(62, 62, W - 124, H - 124);
    x.textAlign = 'center'; x.fillStyle = '#f5c451'; x.font = '600 26px sans-serif'; x.fillText('THE DESK  ·  ' + D.FIRM.toUpperCase() + ' TREASURY ACADEMY', W / 2, 150);
    x.fillStyle = '#e6edf7'; x.font = '800 64px serif'; x.fillText('Certificate of Capability', W / 2, 250);
    x.fillStyle = '#8a9bb8'; x.font = '28px sans-serif'; x.fillText('This certifies that', W / 2, 340);
    x.fillStyle = '#ffffff'; x.font = 'italic 700 78px serif'; x.fillText(c.name, W / 2, 440);
    x.strokeStyle = '#f5c451'; x.lineWidth = 2; x.beginPath(); x.moveTo(W / 2 - 380, 470); x.lineTo(W / 2 + 380, 470); x.stroke();
    x.fillStyle = '#8a9bb8'; x.font = '28px sans-serif'; x.fillText('has met the standard of', W / 2, 540);
    x.fillStyle = '#22d3ee'; x.font = '800 54px sans-serif'; x.fillText(c.title, W / 2, 615);
    x.fillStyle = '#c9d5ea'; x.font = '26px sans-serif'; x.fillText(c.detail, W / 2, 675);
    // stats
    const cols = [['EXAM SCORE', c.score + '%'], ['LEVEL', 'L5 · CERTIFIED'], ['DATE', c.date]];
    cols.forEach((s, i) => { const cx = W / 2 + (i - 1) * 380; x.fillStyle = '#5b6b88'; x.font = '600 20px monospace'; x.fillText(s[0], cx, 780); x.fillStyle = '#f5c451'; x.font = '700 38px monospace'; x.fillText(s[1], cx, 830); });
    // seal
    x.save(); x.translate(W - 230, H - 230); x.fillStyle = '#f5c451'; x.beginPath(); for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2, r = i % 2 ? 92 : 104; x.lineTo(r * Math.cos(a), r * Math.sin(a)); } x.fill();
    x.fillStyle = '#0d1a33'; x.beginPath(); x.arc(0, 0, 78, 0, Math.PI * 2); x.fill(); x.fillStyle = '#f5c451'; x.font = '800 30px sans-serif'; x.fillText('L5', 0, -4); x.font = '600 14px sans-serif'; x.fillText('CERTIFIED', 0, 22); x.restore();
    x.textAlign = 'left'; x.fillStyle = '#5b6b88'; x.font = '18px monospace'; x.fillText('Certificate ID: ' + c.id, 110, H - 150); x.fillText('Verify: hash(name|track|score|date) = ' + c.id, 110, H - 122);
    x.font = '16px sans-serif'; x.fillText('Self-assessed capability certificate issued by The Desk training game. Not an accredited qualification.', 110, H - 94);
    return cv.toDataURL('image/png');
  };
  D.certShare = function (dataUrl, name) {
    if (window.DeskNative && DeskNative.shareImage) { try { DeskNative.shareImage(dataUrl, name); return; } catch (e) {} }
    const a = document.createElement('a'); a.href = dataUrl; a.download = name + '.png'; document.body.appendChild(a); a.click(); a.remove();
  };
  D.certIssue = function (track, title, detail, score) {
    const p = D.me(), date = new Date().toISOString().slice(0, 10);
    const id = D.hash([p.name, track, score, date].join('|'));
    const c = { track, title, detail, score, date, id, name: p.name };
    p.certs = p.certs.filter((x) => x.track !== track || x.score > score); // keep best
    if (!p.certs.find((x) => x.track === track)) p.certs.push(c);
    D.save(); return p.certs.find((x) => x.track === track);
  };
})();
