(() => {
  "use strict";

  const KEY = "habitudes-v1";
  const VIEW_KEY = "habitudes-vue";
  const COLORS = ["#a78bfa", "#fbbf24", "#60a5fa", "#4ade80", "#fb7185", "#22d3ee", "#fb923c", "#f472b6"];
  const ICONS = ["🛏️", "📖", "💧", "🏋️", "🧘", "🏃", "🥗", "🍎", "💊", "🎸", "🧹", "✍️", "🚭", "🦷", "🌿", "☀️"];
  const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const MONTHS_SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const WEEKDAYS = ["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"];
  const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

  const $ = (s) => document.querySelector(s);
  const pad = (n) => String(n).padStart(2, "0");
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const today = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Données ---------- */
  function defaults() {
    return {
      habits: [
        { id: "h1", name: "Sleep 8h+", color: COLORS[0], icon: "🛏️" },
        { id: "h2", name: "Lire", color: COLORS[1], icon: "📖" },
        { id: "h3", name: "Boire +2L d’eau", color: COLORS[2], icon: "💧" },
        { id: "h4", name: "Sport", color: COLORS[3], icon: "🏋️" }
      ],
      logs: {} // { idHabitude: { "2026-11-10": 1 } }
    };
  }

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.habits) && s.logs && typeof s.logs === "object") return s;
    } catch (e) { /* données absentes ou illisibles */ }
    return defaults();
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* stockage plein ou bloqué */ }
  }

  let state = load();
  let view = "year";
  try { view = localStorage.getItem(VIEW_KEY) || "year"; } catch (e) { /* ignore */ }
  let shown = { y: today().getFullYear(), m: today().getMonth() };

  const isDone = (id, k) => !!(state.logs[id] && state.logs[id][k]);

  function toggle(id, k) {
    if (k > keyOf(today())) return; // pas de coche dans le futur
    state.logs[id] = state.logs[id] || {};
    if (state.logs[id][k]) delete state.logs[id][k];
    else state.logs[id][k] = 1;
    save();
    render();
  }

  /* ---------- Vue historique (cartes) ---------- */
  function yearGrid(h) {
    const cols = 28, t = today(), tk = keyOf(t);
    const end = addDays(t, 6 - ((t.getDay() + 6) % 7)); // dimanche de la semaine en cours
    const start = addDays(end, -(cols * 7 - 1));
    let cells = "";
    for (let i = 0; i < cols * 7; i++) {
      const d = addDays(start, i), k = keyOf(d);
      const c = ["dot"];
      if (isDone(h.id, k)) c.push("on");
      if (k > tk) c.push("future");
      if (k === tk) c.push("today");
      cells += `<i class="${c.join(" ")}"></i>`;
    }
    return `<div class="grid" style="--cols:${cols}" aria-hidden="true">${cells}</div>`;
  }

  function yearView() {
    if (!state.habits.length) return emptyState();
    const tk = keyOf(today());
    return state.habits.map((h) => {
      const on = isDone(h.id, tk);
      return `<section class="card" style="--c:${h.color}">
        <div class="row">
          <button class="who" data-act="edit" data-id="${h.id}"><span class="tile">${h.icon}</span><span class="name">${esc(h.name)}</span></button>
          <button class="check${on ? " on" : ""}" data-act="today" data-id="${h.id}" aria-pressed="${on}" aria-label="${esc(h.name)} fait aujourd’hui">${CHECK}</button>
        </div>
        ${yearGrid(h)}
      </section>`;
    }).join("");
  }

  /* ---------- Vue 5 derniers jours ---------- */
  function weekView() {
    if (!state.habits.length) return emptyState();
    const t = today(), tk = keyOf(t);
    const days = [-4, -3, -2, -1, 0].map((n) => addDays(t, n));
    const a = days[0], b = days[4];
    const n = state.habits.length;
    const head = days.map((d) => `<span class="dh${keyOf(d) === tk ? " now" : ""}"><small>${WEEKDAYS[d.getDay()]}</small><b>${d.getDate()}</b></span>`).join("");
    const rows = state.habits.map((h) => {
      const cells = days.map((d) => {
        const k = keyOf(d), on = isDone(h.id, k);
        return `<button class="cell${on ? " on" : ""}" data-act="toggle" data-id="${h.id}" data-day="${k}" aria-pressed="${on}" aria-label="${esc(h.name)}, ${d.getDate()} ${MONTHS[d.getMonth()]}">${on ? CHECK : ""}</button>`;
      }).join("");
      return `<div class="trow" style="--c:${h.color}">
        <button class="who" data-act="edit" data-id="${h.id}"><span class="tile">${h.icon}</span><span class="name">${esc(h.name)}</span></button>
        <div class="cells">${cells}</div>
      </div>`;
    }).join("");
    return `<div class="sub"><span class="pill">5 derniers jours</span><span class="range">${a.getDate()} ${MONTHS_SHORT[a.getMonth()]} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]}</span></div>
      <div class="table"><div class="thead"><span>${n} habitude${n > 1 ? "s" : ""}</span><div class="cells">${head}</div></div>${rows}</div>`;
  }

  /* ---------- Vue mois ---------- */
  function monthView() {
    const t = today(), tk = keyOf(t);
    const { y, m } = shown;
    const isNow = y === t.getFullYear() && m === t.getMonth();
    let opts = "";
    for (let i = 0; i < 12; i++) {
      const d = new Date(t.getFullYear(), t.getMonth() - i, 1);
      const v = `${d.getFullYear()}-${d.getMonth()}`;
      opts += `<option value="${v}"${d.getFullYear() === y && d.getMonth() === m ? " selected" : ""}>${MONTHS[d.getMonth()]} ${d.getFullYear()}</option>`;
    }
    const lead = (new Date(y, m, 1).getDay() + 6) % 7;
    const count = new Date(y, m + 1, 0).getDate();
    const cards = state.habits.map((h) => {
      let cells = '<i class="dot blank"></i>'.repeat(lead);
      for (let d = 1; d <= count; d++) {
        const k = `${y}-${pad(m + 1)}-${pad(d)}`;
        const c = ["dot"];
        const on = isDone(h.id, k);
        if (on) c.push("on");
        if (k > tk) c.push("future");
        if (k === tk) c.push("today");
        cells += k > tk
          ? `<i class="${c.join(" ")}"></i>`
          : `<button class="${c.join(" ")}" data-act="toggle" data-id="${h.id}" data-day="${k}" aria-pressed="${on}" aria-label="${esc(h.name)}, ${d} ${MONTHS[m]}"></button>`;
      }
      const on = isDone(h.id, tk);
      const check = isNow ? `<button class="check${on ? " on" : ""}" data-act="today" data-id="${h.id}" aria-pressed="${on}" aria-label="${esc(h.name)} fait aujourd’hui">${CHECK}</button>` : "";
      return `<section class="mcard" style="--c:${h.color}">
        <div class="mhead">${check}<button class="mname" data-act="edit" data-id="${h.id}">${esc(h.name)}</button></div>
        <div class="mgrid">${cells}</div>
      </section>`;
    }).join("");
    return `<div class="sub"><label class="pill">${MONTHS[m]} ${y}${CHEVRON}<select id="month-sel" aria-label="Mois affiché">${opts}</select></label></div>
      ${state.habits.length ? `<div class="months">${cards}</div>` : emptyState()}`;
  }

  function emptyState() {
    return '<p class="empty">Aucune habitude pour l’instant.<br>Touchez + pour en créer une.</p>';
  }

  function render() {
    $("#view").innerHTML = view === "week" ? weekView() : view === "month" ? monthView() : yearView();
    document.querySelectorAll(".dock button").forEach((b) => {
      const on = b.dataset.view === view;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on);
    });
  }

  /* ---------- Fenêtres (ajout, modification, réglages) ---------- */
  const sheet = $("#sheet");

  function closeSheet() {
    sheet.hidden = true;
    sheet.innerHTML = "";
  }

  function openEditor(id) {
    const h = id ? state.habits.find((x) => x.id === id) : null;
    const draft = h ? { ...h } : { name: "", color: COLORS[state.habits.length % COLORS.length], icon: ICONS[0] };
    sheet.innerHTML = `<div class="backdrop" data-act="close"></div>
      <form class="panel" autocomplete="off">
        <h2>${h ? "Modifier l’habitude" : "Nouvelle habitude"}</h2>
        <input type="text" name="name" maxlength="30" placeholder="Nom de l’habitude" value="${esc(draft.name)}" required>
        <div class="picks">${COLORS.map((c) => `<button type="button" class="sw" style="--c:${c}" data-color="${c}" aria-label="Couleur ${c}"></button>`).join("")}</div>
        <div class="picks">${ICONS.map((i) => `<button type="button" class="ic" data-icon="${i}">${i}</button>`).join("")}</div>
        <div class="actions">
          ${h ? '<button type="button" class="danger" data-del="1">Supprimer</button>' : ""}
          <button type="submit" class="save">Enregistrer</button>
        </div>
      </form>`;
    const form = sheet.querySelector("form");
    const mark = () => {
      form.style.setProperty("--c", draft.color);
      form.querySelectorAll("[data-color]").forEach((b) => b.classList.toggle("sel", b.dataset.color === draft.color));
      form.querySelectorAll("[data-icon]").forEach((b) => b.classList.toggle("sel", b.dataset.icon === draft.icon));
    };
    form.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.color) draft.color = b.dataset.color;
      if (b.dataset.icon) draft.icon = b.dataset.icon;
      if (b.dataset.del) {
        if (confirm(`Supprimer « ${h.name} » et tout son historique ?`)) {
          state.habits = state.habits.filter((x) => x.id !== h.id);
          delete state.logs[h.id];
          save(); closeSheet(); render();
        }
        return;
      }
      mark();
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = form.elements.name.value.trim();
      if (!name) return;
      draft.name = name;
      if (h) Object.assign(h, draft);
      else state.habits.push({ ...draft, id: "h" + Date.now().toString(36) });
      save(); closeSheet(); render();
    });
    mark();
    sheet.hidden = false;
    if (!h) form.elements.name.focus();
  }

  function openSettings() {
    sheet.innerHTML = `<div class="backdrop" data-act="close"></div>
      <div class="panel">
        <h2>Réglages</h2>
        <p class="note">Vos habitudes sont enregistrées sur cet appareil. Exportez-les de temps en temps pour en garder une copie.</p>
        <button class="btn" data-act="export">Exporter mes données</button>
        <label class="btn">Importer une sauvegarde<input class="file" type="file" accept="application/json,.json"></label>
      </div>`;
    sheet.querySelector(".file").addEventListener("change", importData);
    sheet.hidden = false;
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `habitudes-${keyOf(today())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function importData(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const s = JSON.parse(reader.result);
        if (!s || !Array.isArray(s.habits) || !s.logs || typeof s.logs !== "object") throw new Error("format");
        if (!confirm("Remplacer vos habitudes actuelles par cette sauvegarde ?")) return;
        state = s;
        save(); closeSheet(); render();
      } catch (err) {
        alert("Ce fichier n’est pas une sauvegarde valide.");
      }
    };
    reader.readAsText(file);
  }

  /* ---------- Événements ---------- */
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const { act, id, day } = el.dataset;
    if (act === "today") toggle(id, keyOf(today()));
    else if (act === "toggle") toggle(id, day);
    else if (act === "edit") openEditor(id);
    else if (act === "add") openEditor();
    else if (act === "settings") openSettings();
    else if (act === "export") exportData();
    else if (act === "close") closeSheet();
    else if (act === "view") {
      view = el.dataset.view;
      try { localStorage.setItem(VIEW_KEY, view); } catch (err) { /* ignore */ }
      render();
    }
  });

  document.addEventListener("change", (e) => {
    if (e.target.id !== "month-sel") return;
    const [y, m] = e.target.value.split("-").map(Number);
    shown = { y, m };
    render();
  });

  // Nouveau jour : on remet l’affichage à jour au retour dans l’app
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && sheet.hidden) render();
  });

  render();

  /* ---------- Service worker (mode hors ligne) ---------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => { /* HTTPS requis */ });
    });
  }
})();