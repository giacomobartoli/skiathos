const MONTHS_IT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

async function loadItinerary() {
  const res = await fetch("data/itinerary.json");
  return res.json();
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function renderBlocks(blocks) {
  if (!blocks.length) {
    return `<div class="empty-state">
      <span class="es-icon">🗺️</span>
      Programma ancora da definire per questa giornata.
    </div>`;
  }

  let out = "";
  let noteBuffer = [];

  const flushNotes = () => {
    if (noteBuffer.length) {
      out += `<ul class="block-notes">${noteBuffer.map(n =>
        `<li><span class="ic">${n.icon || "📍"}</span><span>${n.html}</span></li>`
      ).join("")}</ul>`;
      noteBuffer = [];
    }
  };

  for (const b of blocks) {
    if (b.type === "heading") {
      flushNotes();
      out += `<h3 class="block-heading">${b.html}</h3>`;
    } else if (b.type === "paragraph") {
      flushNotes();
      out += `<p class="block-paragraph">${b.html}</p>`;
    } else {
      noteBuffer.push(b);
    }
  }
  flushNotes();
  return out;
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_IT[m - 1]}`;
}

function buildUI(data) {
  const nav = document.getElementById("dayNav");
  const container = document.getElementById("daysContainer");
  const today = todayISO();

  let defaultIndex = data.days.findIndex(d => d.date === today);
  if (defaultIndex === -1) defaultIndex = 0;

  data.days.forEach((day, i) => {
    const pill = document.createElement("button");
    pill.className = "day-pill" + (i === defaultIndex ? " active" : "") + (!day.isComplete ? " tbd" : "");
    pill.innerHTML = `<span class="pill-wd">${day.weekday.slice(0, 3)}</span><span class="pill-num">${day.day}</span>`;
    pill.addEventListener("click", () => selectDay(i));
    pill.dataset.index = i;
    nav.appendChild(pill);

    const card = document.createElement("section");
    card.className = "day-card" + (i === defaultIndex ? " active" : "");
    card.dataset.index = i;
    card.innerHTML = `
      <div class="day-card-head">
        <div>
          <div class="dh-weekday">${day.weekday}</div>
          <div class="dh-date">${formatDate(day.date)}</div>
        </div>
        <div class="dh-badges">
          ${day.owner ? `<span class="owner-badge owner-${day.owner.toLowerCase()}">${day.owner === "Giulia" ? "🌸" : "⚓"} ${day.owner}</span>` : ""}
          ${!day.isComplete ? '<span class="tbd-badge">Da definire</span>' : ""}
        </div>
      </div>
      ${renderBlocks(day.blocks)}
    `;
    container.appendChild(card);
  });

  function selectDay(index) {
    nav.querySelectorAll(".day-pill").forEach(p => p.classList.toggle("active", Number(p.dataset.index) === index));
    container.querySelectorAll(".day-card").forEach(c => c.classList.toggle("active", Number(c.dataset.index) === index));
    const activePill = nav.querySelector(`.day-pill[data-index="${index}"]`);
    if (activePill) activePill.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  selectDay(defaultIndex);
}

loadItinerary().then(buildUI).catch(err => {
  document.getElementById("daysContainer").innerHTML =
    `<p style="color:white;text-align:center;padding:2rem;">Impossibile caricare il programma. Riprova più tardi.</p>`;
  console.error(err);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(err => console.error("SW registration failed", err));
  });
}
