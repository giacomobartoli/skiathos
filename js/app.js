const MONTHS_IT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
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

function buildInfoUI(data) {
  const container = document.getElementById("infoContainer");
  const checkedKey = "skiathos-checklist-checked";
  const checked = new Set(JSON.parse(localStorage.getItem(checkedKey) || "[]"));

  const contactsHtml = `
    <section class="info-card">
      <h2 class="info-card-title">📇 Contatti e indirizzi</h2>
      <ul class="contact-list">
        ${data.contacts.map(c => `
          <li class="contact-item">
            <div class="contact-label">${c.label}</div>
            <div class="contact-value ${c.value === "Da inserire" ? "placeholder" : ""}">${
              c.tel
                ? `<a class="place-link" href="tel:${c.tel}">${c.value}</a>`
                : c.mapsQuery
                ? `<a class="place-link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.mapsQuery)}" target="_blank" rel="noopener">${c.value}</a>`
                : c.value
            }</div>
            ${c.note ? `<div class="contact-note">${c.note}</div>` : ""}
          </li>
        `).join("")}
      </ul>
    </section>
  `;

  const notesHtml = `
    <section class="info-card">
      <h2 class="info-card-title">🧭 Da sapere</h2>
      <ul class="practical-notes">
        ${data.practicalNotes.map(n => `<li>${n}</li>`).join("")}
      </ul>
    </section>
  `;

  const checklistHtml = `
    <section class="info-card">
      <h2 class="info-card-title">🧳 Checklist bagaglio</h2>
      <ul class="checklist" id="checklist">
        ${data.packingChecklist.map((item, i) => `
          <li>
            <label class="checklist-item">
              <input type="checkbox" data-i="${i}" ${checked.has(String(i)) ? "checked" : ""} />
              <span>${item}</span>
            </label>
          </li>
        `).join("")}
      </ul>
    </section>
  `;

  container.innerHTML = contactsHtml + notesHtml + checklistHtml;

  container.querySelectorAll("#checklist input[type=checkbox]").forEach(box => {
    box.addEventListener("change", () => {
      if (box.checked) checked.add(box.dataset.i);
      else checked.delete(box.dataset.i);
      localStorage.setItem(checkedKey, JSON.stringify([...checked]));
      box.closest(".checklist-item").classList.toggle("done", box.checked);
    });
    box.closest(".checklist-item").classList.toggle("done", box.checked);
  });
}

function buildSocialUI(itinerary, tips) {
  const container = document.getElementById("socialContainer");
  const places = itinerary.places || [];

  if (!places.length) {
    container.innerHTML = `<p class="social-empty">Nessun luogo ancora disponibile.</p>`;
    return;
  }

  container.innerHTML = `
    <p class="social-intro">Consigli pratici per i migliori scatti nei luoghi del viaggio.</p>
    <div class="social-list">
      ${places.map(p => {
        const tip = tips[p.slug]?.tip;
        return `
          <section class="social-card">
            ${p.image
              ? `<img class="social-img" src="${p.image}" alt="${p.label}" loading="lazy" />`
              : `<div class="social-img social-img-placeholder">🗺️</div>`}
            <div class="social-body">
              <h3 class="social-place">${p.label}</h3>
              <p class="social-tip">${tip || "Consigli in arrivo per questo luogo."}</p>
            </div>
          </section>
        `;
      }).join("")}
    </div>
  `;
}

function setupTabs() {
  const tabBar = document.getElementById("tabBar");
  tabBar.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      tabBar.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b === btn));
      document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === btn.dataset.page));
      window.scrollTo({ top: 0 });
    });
  });
}

setupTabs();

loadJSON("data/itinerary.json").then(buildUI).catch(err => {
  document.getElementById("daysContainer").innerHTML =
    `<p style="color:white;text-align:center;padding:2rem;">Impossibile caricare il programma. Riprova più tardi.</p>`;
  console.error(err);
});

loadJSON("data/info.json").then(buildInfoUI).catch(err => {
  document.getElementById("infoContainer").innerHTML =
    `<p class="social-empty">Impossibile caricare le info. Riprova più tardi.</p>`;
  console.error(err);
});

Promise.all([loadJSON("data/itinerary.json"), loadJSON("data/social-tips.json").catch(() => ({}))])
  .then(([itinerary, tips]) => buildSocialUI(itinerary, tips))
  .catch(err => {
    document.getElementById("socialContainer").innerHTML =
      `<p class="social-empty">Impossibile caricare i consigli. Riprova più tardi.</p>`;
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
