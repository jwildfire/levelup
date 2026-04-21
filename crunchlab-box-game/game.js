// --- Configuration ---------------------------------------------------------
// CrunchLabs Build Box costs $29.95/month. CrunchLabs passed 100k subscribers
// within 6 months of launch in 2022; by 2025/2026 the subscriber base is
// estimated to be much higher. We'll model roughly 200,000 boxes per month
// with exactly one platinum ticket hidden somewhere among them. So each box
// has a ~1 in 200,000 chance of being the winning one.
const BOX_PRICE = 29.95;
const BOXES_PER_MONTH = 200_000;
const WIN_PROB = 1 / BOXES_PER_MONTH;

// Non-winning "consolation" reveals that appear when you open a box.
const FILLERS = [
  { emoji: "\u{1F916}", name: "a robot kit" },          // robot
  { emoji: "\u{1F697}", name: "a rubber-band car" },    // car
  { emoji: "\u{1F680}", name: "a mini rocket" },        // rocket
  { emoji: "\u{1F9F2}", name: "a magnet trick" },       // magnet
  { emoji: "\u{1F3AF}", name: "a target launcher" },    // target
  { emoji: "\u{1F52B}", name: "a disc launcher" },      // toy gun
  { emoji: "\u{1F9E9}", name: "a puzzle build" },       // puzzle piece
  { emoji: "\u{2699}\u{FE0F}", name: "a gear contraption" }, // gear
  { emoji: "\u{1F3B2}", name: "a probability toy" },    // dice
  { emoji: "\u{1F4A1}", name: "a bright idea" },        // bulb
];

// --- State -----------------------------------------------------------------
const state = {
  count: 0,
  tickets: 0,
  firstTicketAt: null, // box number of first ticket
};

// --- DOM -------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const box = $("box");
const contents = box.querySelector(".box-contents");
const countEl = $("count");
const costEl = $("cost");
const ticketsEl = $("tickets");
const chanceEl = $("chance");
const log = $("log");
const clickHint = $("click-hint");
const overlay = $("ticket-overlay");

// Fill in the info numbers from the constants.
$("monthly-count").textContent = BOXES_PER_MONTH.toLocaleString();
$("per-box-odds").textContent = `1 in ${BOXES_PER_MONTH.toLocaleString()}`;

// --- Formatting ------------------------------------------------------------
const fmtMoney = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

// Probability of at least one win in n tries with independent probability p.
// Computed with log1p for numerical stability when n is large.
const cumulativeChance = (n, p) => 1 - Math.exp(n * Math.log1p(-p));

const fmtPercent = (p) => {
  if (p <= 0) return "0%";
  if (p >= 0.001) return `${(p * 100).toFixed(2)}%`;
  if (p >= 0.00001) return `${(p * 100).toFixed(4)}%`;
  return `${(p * 100).toExponential(2)}%`;
};

// --- Rendering -------------------------------------------------------------
function updateStats() {
  countEl.textContent = state.count.toLocaleString();
  costEl.textContent = fmtMoney(state.count * BOX_PRICE);
  ticketsEl.textContent = state.tickets.toLocaleString();
  chanceEl.textContent = fmtPercent(cumulativeChance(state.count, WIN_PROB));
}

function addLog(msg, cls = "") {
  const li = document.createElement("li");
  li.textContent = msg;
  if (cls) li.className = cls;
  log.prepend(li);
  // Cap log to the most recent 40 entries.
  while (log.children.length > 40) log.removeChild(log.lastChild);
}

// --- Opening a box ---------------------------------------------------------
function pickFiller() {
  return FILLERS[Math.floor(Math.random() * FILLERS.length)];
}

// Does this single box contain the platinum ticket?
const rollIsWin = () => Math.random() < WIN_PROB;

// Animated single-box open (click the box).
function openOneAnimated() {
  if (box.classList.contains("opening")) return; // mid-animation
  const win = rollIsWin();
  state.count++;
  if (win) {
    state.tickets++;
    if (state.firstTicketAt === null) state.firstTicketAt = state.count;
  }

  const filler = pickFiller();
  contents.textContent = win ? "\u{1F3AB}" : filler.emoji;
  box.classList.add("opening");
  clickHint.textContent = win
    ? "WHOA!! That one had a Platinum Ticket!"
    : `Box #${state.count.toLocaleString()}: ${filler.name}. No ticket.`;

  addLog(
    win
      ? `Box #${state.count.toLocaleString()} — PLATINUM TICKET!!`
      : `Box #${state.count.toLocaleString()} — ${filler.name}, no ticket.`,
    win ? "win" : ""
  );

  updateStats();
  if (win) showTicket();

  // Reset the animation so the next click can play it.
  setTimeout(() => {
    box.classList.remove("opening");
  }, 700);
}

// Bulk open without animation — used for "open 100", "open 1000", etc.
function openBulk(n) {
  let wins = 0;
  // If n is big we use a probabilistic shortcut to avoid a million RNG calls
  // on mobile, but for clarity we'll just loop for reasonable values of n.
  for (let i = 0; i < n; i++) {
    state.count++;
    if (rollIsWin()) {
      wins++;
      state.tickets++;
      if (state.firstTicketAt === null) state.firstTicketAt = state.count;
    }
  }
  updateStats();

  if (wins > 0) {
    addLog(
      `Opened ${n.toLocaleString()} boxes — ${wins} PLATINUM TICKET${
        wins > 1 ? "S" : ""
      }!!`,
      "win"
    );
    // Give a quick shake so the bulk action feels physical.
    box.classList.add("shake");
    setTimeout(() => box.classList.remove("shake"), 200);
    showTicket();
  } else {
    addLog(
      `Opened ${n.toLocaleString()} boxes — no ticket. Spent ${fmtMoney(
        n * BOX_PRICE
      )} that round.`,
      "big"
    );
    clickHint.textContent = `Still nothing. You've spent ${fmtMoney(
      state.count * BOX_PRICE
    )} total.`;
  }
}

// Keep opening until we get a ticket (with an upper bound to stay friendly).
function openUntilTicket() {
  const CAP = 5_000_000; // practical safety cap
  const startCount = state.count;
  let opened = 0;
  let wins = 0;
  while (opened < CAP) {
    opened++;
    state.count++;
    if (rollIsWin()) {
      wins++;
      state.tickets++;
      if (state.firstTicketAt === null) state.firstTicketAt = state.count;
      break;
    }
  }
  updateStats();

  if (wins > 0) {
    addLog(
      `Opened ${opened.toLocaleString()} boxes in a row — PLATINUM TICKET on box #${state.count.toLocaleString()}!`,
      "win"
    );
    box.classList.add("shake");
    setTimeout(() => box.classList.remove("shake"), 200);
    showTicket();
  } else {
    addLog(
      `Opened ${opened.toLocaleString()} boxes and still no ticket. We gave up at ${CAP.toLocaleString()}.`,
      "big"
    );
    clickHint.textContent = `That's ${fmtMoney(
      (state.count - startCount) * BOX_PRICE
    )} spent with no luck.`;
  }
}

// --- Ticket overlay --------------------------------------------------------
function showTicket() {
  const n = state.firstTicketAt ?? state.count;
  $("t-count").textContent = n.toLocaleString();
  $("t-cost").textContent = fmtMoney(n * BOX_PRICE);
  // Probability of getting at least one win in the first `n` tries — i.e.
  // how "lucky" was this result.
  $("t-odds").textContent = fmtPercent(cumulativeChance(n, WIN_PROB));
  overlay.classList.remove("hidden");
}

function hideTicket() {
  overlay.classList.add("hidden");
}

// --- Reset -----------------------------------------------------------------
function reset() {
  state.count = 0;
  state.tickets = 0;
  state.firstTicketAt = null;
  log.innerHTML = "";
  clickHint.textContent = "Click the box to open it!";
  updateStats();
  hideTicket();
}

// --- Events ----------------------------------------------------------------
box.addEventListener("click", openOneAnimated);
box.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    openOneAnimated();
  }
});

document.querySelectorAll("#controls .bulk").forEach((btn) => {
  btn.addEventListener("click", () => openBulk(parseInt(btn.dataset.n, 10)));
});
$("open-until").addEventListener("click", openUntilTicket);
$("reset").addEventListener("click", reset);
$("ticket-close").addEventListener("click", hideTicket);
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) hideTicket();
});

// First paint.
updateStats();
