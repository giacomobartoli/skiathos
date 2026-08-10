const MONTHS_IT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

async function loadItinerary() {
  const res = await fetch("data/itinerary.json");
  return res.json();
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function renderCarousel(images) {
  if (!images || !images.length) return "";
  return `
    <div class="carousel">
      ${images.map(img => `
        <div class="carousel-slide">
          <img src="${img.src}" alt="${img.caption}" loading="lazy" />
          <span class="carousel-caption">${img.caption}</span>
        </div>
      `).join("")}
    </div>
  `;
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

function renderEvening(evening) {
  const { dinner, activity } = evening;

  let dinnerLine;
  if (dinner.status === "home") {
    dinnerLine = `<li><span class="ic">🏠</span><span>Cena a casa — ${dinner.html}</span></li>`;
  } else if (dinner.status === "restaurant") {
    dinnerLine = `<li><span class="ic">🍽️</span><span>Cena al ristorante — ${dinner.html}</span></li>`;
  } else {
    dinnerLine = `<li class="tbd"><span class="ic">❔</span><span>Cena da definire</span></li>`;
  }

  const activityLine = activity ? `<li><span class="ic">🌙</span><span>${activity}</span></li>` : "";

  return `
    <div class="evening-section">
      <div class="evening-label">Sera</div>
      <ul class="block-notes evening-notes">${dinnerLine}${activityLine}</ul>
    </div>
  `;
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
      ${renderCarousel(day.images)}
      ${renderBlocks(day.blocks)}
      ${renderEvening(day.evening)}
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
  // quando una nuova versione del service worker prende il controllo
  // (perché abbiamo pubblicato un programma aggiornato), ricarica la
  // pagina in automatico: così basta riaprire l'app per vedere i dati
  // freschi, senza doverla reinstallare o riaprire due volte.
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(err => console.error("SW registration failed", err));
  });
}
