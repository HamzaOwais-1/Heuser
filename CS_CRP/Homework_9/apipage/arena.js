const STATS = [["hp", "HP"], ["attack", "Attack"], ["defense", "Defense"], ["special-attack", "Sp. Attack"], ["special-defense", "Sp. Defense"], ["speed", "Speed"]];
const MAX_BAR = 200; // bar widths are scaled so 200 fills a bar
const $ = id => document.getElementById(id);
const fighters = { A: null, B: null };
let busy = false;

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));

// ---------- fighter slots ----------
function slotHTML(side) {
  return `<form class="finder" data-side="${side}">
      <input name="q" list="names" placeholder="Search a Pokémon" aria-label="Search a Pokémon for side ${side}" autocomplete="off">
      <button class="mini" type="button" data-random="${side}" title="Pick a random Pokémon">Random</button>
    </form>
    <div class="card" id="card${side}"></div>`;
}
$("slotA").innerHTML = slotHTML("A");
$("slotB").innerHTML = slotHTML("B");

function showCard(side, html) { $("card" + side).innerHTML = html; }

async function load(side, query) {
  const q = query.trim().toLowerCase().replace(/\s+/g, "-");
  if (!q) return;
  fighters[side] = null; refreshButton(); resetBars();
  showCard(side, `<p class="msg dots">Calling the Pokédex</p>`);
  try {
    const res = await fetch("/api/pokemon/" + encodeURIComponent(q));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    fighters[side] = data;
    const s = data.stats;
    showCard(side, `<img class="pic pop" src="${data.image}" alt="${data.name}">
      <div class="nm">${data.name}</div>
      <div class="types">${data.types.map(t => `<span>${t}</span>`).join("")}</div>
      <div class="meta">#${data.id}, ${data.height} m, ${data.weight} kg</div>`);
    $("slot" + side).querySelector("input").value = data.name;
  } catch (err) {
    const offline = err instanceof TypeError;
    const text = offline ? "Couldn't reach the server. Check your internet connection, then retry." : err.message;
    showCard(side, `<p class="msg err">${text}</p><button class="mini" type="button" data-retry="${side}" data-q="${q}">Retry</button>`);
  }
  refreshButton();
}

function randomLoad(side) {
  const names = [...$("names").options].map(o => o.value);
  const pick = names.length ? names[Math.random() * names.length | 0] : String(1 + Math.random() * 1000 | 0);
  load(side, pick);
}

document.addEventListener("submit", e => {
  const f = e.target.closest(".finder"); if (!f) return;
  e.preventDefault(); load(f.dataset.side, f.q.value);
});
document.addEventListener("click", e => {
  const t = e.target;
  if (t.dataset.random) randomLoad(t.dataset.random);
  if (t.dataset.retry) load(t.dataset.retry, t.dataset.q);
});

// ---------- rows + battle ----------
function buildRows() {
  $("rows").innerHTML = STATS.map(([k, label]) => `<div class="row" data-k="${k}">
      <div class="lab">${label}</div>
      <div class="pair"><div class="bar l"><i></i><b></b></div><div class="bar r"><i></i><b></b></div></div></div>`).join("");
}
function resetBars() {
  if (busy) return;
  buildRows();
  $("knot").style.left = "50%";
  ["A", "B"].forEach(s => $("slot" + s).classList.remove("champ", "lunge"));
  setVerdict(fighters.A && fighters.B ? "Ready. Press start." : "Choose two fighters to begin.");
}
function refreshButton() { $("fight").disabled = busy || !(fighters.A && fighters.B); }
function setVerdict(t, big) { const v = $("verdict"); v.textContent = t; v.classList.toggle("big", !!big); }

async function fight() {
  busy = true; refreshButton(); buildRows();
  const { A, B } = fighters;
  let pos = 50, scoreA = 0, scoreB = 0;
  $("knot").style.left = "50%";
  ["A", "B"].forEach(s => $("slot" + s).classList.remove("champ"));
  for (const [k, label] of STATS) {
    const row = document.querySelector(`.row[data-k="${k}"]`);
    const [bl, br] = row.querySelectorAll(".bar");
    const a = A.stats[k], b = B.stats[k];
    setVerdict(`Round: ${label}`);
    bl.querySelector("i").style.width = Math.min(100, a / MAX_BAR * 100) + "%";
    br.querySelector("i").style.width = Math.min(100, b / MAX_BAR * 100) + "%";
    bl.querySelector("b").textContent = a; br.querySelector("b").textContent = b;
    await wait(1000);
    if (a !== b) {
      const aWins = a > b;
      (aWins ? bl : br).classList.add("win");
      aWins ? scoreA++ : scoreB++;
      pos += aWins ? -50 / 6 : 50 / 6;
      $("knot").style.left = pos + "%";
      const s = $(aWins ? "slotA" : "slotB");
      s.classList.add("lunge"); await wait(450); s.classList.remove("lunge");
    } else {
      setVerdict(`${label} is a tie. The rope doesn't move.`);
    }
    await wait(450);
  }
  const nameA = cap(A.name), nameB = cap(B.name);
  if (scoreA === scoreB) setVerdict(`Dead heat, ${scoreA} to ${scoreB}`, true);
  else {
    const winSide = scoreA > scoreB ? "A" : "B";
    $("slot" + winSide).classList.add("champ");
    setVerdict(`${winSide === "A" ? nameA : nameB} wins ${Math.max(scoreA, scoreB)} to ${Math.min(scoreA, scoreB)}`, true);
    confetti();
  }
  busy = false; refreshButton();
  $("fight").textContent = "Rematch";
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
$("fight").addEventListener("click", fight);

function confetti() {
  if (reduce) return;
  const cols = ["#FF6B9A", "#3FE0C5", "#FFD84D", "#7B5BE0"];
  for (let i = 0; i < 60; i++) {
    const c = document.createElement("div"); c.className = "confetti";
    c.style.left = Math.random() * 100 + "vw"; c.style.background = cols[i % 4];
    c.style.animationDuration = 2 + Math.random() * 2 + "s"; c.style.animationDelay = Math.random() * .6 + "s";
    document.body.appendChild(c); setTimeout(() => c.remove(), 5000);
  }
}

// ---------- start ----------
buildRows();
fetch("/api/names").then(r => r.json()).then(list => {
  $("names").innerHTML = list.map(n => `<option value="${n}">`).join("");
  randomLoad("A"); randomLoad("B");
}).catch(() => { randomLoad("A"); randomLoad("B"); });
