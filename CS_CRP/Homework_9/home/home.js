// Wobbly letters: split the title into spans so each letter reacts to the cursor.
const title = document.getElementById("title");
const lines = ["Hamza's", "Playroom"];
title.innerHTML = lines.map(l => [...l].map(c => `<span aria-hidden="true">${c}</span>`).join("")).join("<br>");

// Tilt + glow on the three doors.
document.querySelectorAll(".door").forEach(d => {
  d.addEventListener("pointermove", e => {
    const r = d.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    d.style.setProperty("--mx", x * 100 + "%"); d.style.setProperty("--my", y * 100 + "%");
    d.style.transform = `perspective(700px) rotateY(${(x - .5) * 14}deg) rotateX(${(.5 - y) * 14}deg) translateY(-4px)`;
  });
  d.addEventListener("pointerleave", () => d.style.transform = "");
});

// Sky of little stat-bars that flee from the pointer.
const cv = document.getElementById("sky"), ctx = cv.getContext("2d");
const colors = ["#FF6B9A", "#3FE0C5", "#FFD84D", "#7B5BE0"];
let W, H, bars = [], mouse = { x: -999, y: -999 };
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
function resize() {
  W = cv.width = innerWidth; H = cv.height = innerHeight;
  bars = Array.from({ length: Math.min(90, Math.floor(W * H / 14000)) }, () => ({
    x: Math.random() * W, y: Math.random() * H, w: 6 + Math.random() * 40, vx: 0, vy: 0,
    hx: Math.random() * W, hy: Math.random() * H, c: colors[Math.random() * 4 | 0], a: .15 + Math.random() * .35
  }));
}
addEventListener("resize", resize); resize();
addEventListener("pointermove", e => { mouse.x = e.clientX; mouse.y = e.clientY; });
function frame(t) {
  ctx.clearRect(0, 0, W, H);
  for (const b of bars) {
    const dx = b.x - mouse.x, dy = b.y - mouse.y, d = Math.hypot(dx, dy);
    if (d < 160) { b.vx += dx / d * (160 - d) * .02; b.vy += dy / d * (160 - d) * .02; }
    b.vx += (b.hx - b.x) * .002; b.vy += (b.hy - b.y) * .002 + Math.sin(t / 900 + b.hx) * .01;
    b.vx *= .92; b.vy *= .92; b.x += b.vx; b.y += b.vy;
    ctx.globalAlpha = b.a; ctx.fillStyle = b.c;
    ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, 7, 4); ctx.fill();
  }
  if (!reduce) requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
