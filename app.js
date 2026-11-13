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
      if (s && Array.isArray(s.habits) && s.logs && typeof s.logs === "object") return migrate(s);
    } catch (e) { /* données absentes ou illisibles */ }
    return migrate(defaults());
  }

  // Ajoute thèmes et réglages aux anciennes sauvegardes
  function migrate(s) {
    if (!Array.isArray(s.cats)) {
      s.cats = [
        { id: "c1", name: "Forme", icon: "🚴" },
        { id: "c2", name: "Santé", icon: "❤️" },
        { id: "c3", name: "Nutrition", icon: "🍴" },
        { id: "c4", name: "Mental", icon: "🧠" }
      ];
      const map = { h1: "c2", h2: "c4", h3: "c3", h4: "c1" };
      s.habits.forEach((h) => { if (map[h.id] && !h.cat) h.cat = map[h.id]; });
    }
    s.settings = Object.assign({ days: 5, names: true, filter: null, showFilter: false }, s.settings || {});
    return s;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* stockage plein ou bloqué */ }
  }

  let state = load();
  let view = "year";
  try { view = localStorage.getItem(VIEW_KEY) || "year"; } catch (e) { /* ignore */ }
  let shown = { y: today().getFullYear(), m: today().getMonth() };
  let page = "home";

  const isDone = (id, k) => !!(state.logs[id] && state.logs[id][k]);
  const list = () => state.habits.filter((h) => !state.settings.filter || h.cat === state.settings.filter);

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
    if (!list().length) return emptyState();
    const tk = keyOf(today());
    return list().map((h) => {
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
    const hs = list();
    const { days: N, names } = state.settings;
    const t = today(), tk = keyOf(t);
    const days = Array.from({ length: N }, (_, i) => addDays(t, i - N + 1));
    const a = days[0], b = days[N - 1];
    const cw = N <= 5 ? 32 : N === 6 ? 28 : 25;
    const label = N === 1 ? "Aujourd’hui" : `${N} derniers jours`;
    const fmt = (d) => `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
    const range = N === 1 ? fmt(b) : `${fmt(a)} – ${fmt(b)}`;
    const head = days.map((d) => `<span class="dh${keyOf(d) === tk ? " now" : ""}"><small>${WEEKDAYS[d.getDay()]}</small><b>${d.getDate()}</b></span>`).join("");
    const rows = hs.map((h) => {
      const cells = days.map((d) => {
        const k = keyOf(d), on = isDone(h.id, k);
        return `<button class="cell${on ? " on" : ""}" data-act="toggle" data-id="${h.id}" data-day="${k}" aria-pressed="${on}" aria-label="${esc(h.name)}, ${d.getDate()} ${MONTHS[d.getMonth()]}">${on ? CHECK : ""}</button>`;
      }).join("");
      return `<div class="trow" style="--c:${h.color}">
        <button class="who" data-act="edit" data-id="${h.id}" aria-label="${esc(h.name)}"><span class="tile">${h.icon}</span><span class="name">${esc(h.name)}</span></button>
        <div class="cells">${cells}</div>
      </div>`;
    }).join("");
    const n = hs.length;
    return `<div class="sub"><button class="pill" data-act="compact" aria-label="Régler le nombre de jours">${label}</button><span class="range">${range}</span></div>
      ${n ? `<div class="table${names ? "" : " nonames"}" style="--n:${N};--cw:${cw}px"><div class="thead"><span>${n} habitude${n > 1 ? "s" : ""}</span><div class="cells">${head}</div></div>${rows}</div>` : emptyState()}`;
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
    const cards = list().map((h) => {
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
      ${list().length ? `<div class="months">${cards}</div>` : emptyState()}`;
  }

  function emptyState() {
    return '<p class="empty">Aucune habitude pour l’instant.<br>Touchez + pour en créer une.</p>';
  }

  function render() {
    document.body.classList.toggle("stats", page === "stats");
    $("#view").innerHTML = page === "stats" ? statsView() : chipsBar() + (view === "week" ? weekView() : view === "month" ? monthView() : yearView());
    const fb = document.querySelector('[data-act="filter"]'), sb = document.querySelector('[data-act="stats"]');
    fb.classList.toggle("on", !!state.settings.showFilter);
    fb.setAttribute("aria-pressed", !!state.settings.showFilter);
    sb.classList.toggle("on", page === "stats");
    sb.setAttribute("aria-pressed", page === "stats");
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
    const draft = h ? { ...h } : { name: "", color: COLORS[state.habits.length % COLORS.length], icon: ICONS[0], cat: state.settings.filter || null };
    sheet.innerHTML = `<div class="backdrop" data-act="close"></div>
      <form class="panel" autocomplete="off">
        <h2>${h ? "Modifier l’habitude" : "Nouvelle habitude"}</h2>
        <input type="text" name="name" maxlength="30" placeholder="Nom de l’habitude" value="${esc(draft.name)}" required>
        <div class="picks">${COLORS.map((c) => `<button type="button" class="sw" style="--c:${c}" data-color="${c}" aria-label="Couleur ${c}"></button>`).join("")}</div>
        <div class="picks">${ICONS.map((i) => `<button type="button" class="ic" data-icon="${i}">${i}</button>`).join("")}</div>
        ${state.cats.length ? `<p class="lbl">Thème</p><div class="picks"><button type="button" class="tag" data-cat="">Aucun</button>${state.cats.map((c) => `<button type="button" class="tag" data-cat="${c.id}">${c.icon} ${esc(c.name)}</button>`).join("")}</div>` : ""}
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
      form.querySelectorAll("[data-cat]").forEach((b) => b.classList.toggle("sel", (b.dataset.cat || null) === (draft.cat || null)));
    };
    form.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.color) draft.color = b.dataset.color;
      if (b.dataset.icon) draft.icon = b.dataset.icon;
      if ("cat" in b.dataset) draft.cat = b.dataset.cat || null;
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
        state = migrate(s);
        save(); closeSheet(); render();
      } catch (err) {
        alert("Ce fichier n’est pas une sauvegarde valide.");
      }
    };
    reader.readAsText(file);
  }

  /* ---------- Filtre par thème ---------- */
  const LIST = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>';

  function chipsBar() {
    const s = state.settings;
    if (!s.showFilter) return "";
    const f = s.filter;
    return `<div class="chips"><button class="chip all${f ? "" : " sel"}" data-act="cat" data-id="" aria-label="Tous les thèmes">${LIST}</button><span class="sep"></span>${state.cats.map((c) => `<button class="chip${f === c.id ? " sel" : ""}" data-act="cat" data-id="${c.id}"><span>${c.icon}</span>${esc(c.name)}</button>`).join("")}<button class="chip" data-act="themes">✎ Thèmes</button></div>`;
  }

  /* ---------- Gestion des thèmes ---------- */
  const CAT_ICONS = ["🚴", "❤️", "🍴", "🧠", "🧘", "💼", "📚", "🎯", "🌙", "💰", "🏠", "🎨"];

  function openThemes() {
    sheet.innerHTML = `<div class="backdrop" data-act="close"></div>
      <div class="panel">
        <h2>Thèmes</h2>
        ${state.cats.length ? state.cats.map((c) => `<button class="catrow" data-act="catedit" data-id="${c.id}"><span class="tile" style="--c:#8b7cf6">${c.icon}</span><span class="name">${esc(c.name)}</span><span class="edit">Modifier</span></button>`).join("") : '<p class="note">Aucun thème pour l’instant.</p>'}
        <button class="btn" data-act="catnew">+ Nouveau thème</button>
      </div>`;
    sheet.hidden = false;
  }

  function openCatEditor(id) {
    const c = id ? state.cats.find((x) => x.id === id) : null;
    const draft = c ? { ...c } : { name: "", icon: CAT_ICONS[0] };
    sheet.innerHTML = `<div class="backdrop" data-act="close"></div>
      <form class="panel" autocomplete="off">
        <h2>${c ? "Modifier le thème" : "Nouveau thème"}</h2>
        <input type="text" name="name" maxlength="20" placeholder="Nom du thème" value="${esc(draft.name)}" required>
        <div class="picks">${CAT_ICONS.map((i) => `<button type="button" class="ic" data-icon="${i}">${i}</button>`).join("")}</div>
        <div class="actions">
          ${c ? '<button type="button" class="danger" data-del="1">Supprimer</button>' : ""}
          <button type="submit" class="save">Enregistrer</button>
        </div>
      </form>`;
    const form = sheet.querySelector("form");
    const mark = () => form.querySelectorAll("[data-icon]").forEach((b) => b.classList.toggle("sel", b.dataset.icon === draft.icon));
    form.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.icon) draft.icon = b.dataset.icon;
      if (b.dataset.del) {
        if (confirm(`Supprimer le thème « ${c.name} » ? Les habitudes restent, sans thème.`)) {
          state.cats = state.cats.filter((x) => x.id !== c.id);
          state.habits.forEach((h) => { if (h.cat === c.id) h.cat = null; });
          if (state.settings.filter === c.id) state.settings.filter = null;
          save(); render(); openThemes();
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
      if (c) Object.assign(c, draft);
      else state.cats.push({ ...draft, id: "c" + Date.now().toString(36) });
      save(); render(); openThemes();
    });
    mark();
    sheet.hidden = false;
    if (!c) form.elements.name.focus();
  }

  /* ---------- Réglages de la liste compacte ---------- */
  function openCompact() {
    sheet.innerHTML = `<div class="backdrop" data-act="close"></div>
      <div class="panel">
        <h2>Paramètres de la liste compacte</h2>
        <p class="note">Choisis le nombre de jours à afficher dans la liste compacte.</p>
        <div class="nums">${[1, 2, 3, 4, 5, 6, 7].map((n) => `<button data-n="${n}">${n}</button>`).join("")}</div>
        <p class="note">Choisis si les noms des habitudes sont masqués ou non.</p>
        <div class="seg"><button data-names="0">Masqué</button><button data-names="1">Visible</button></div>
      </div>`;
    const panel = sheet.querySelector(".panel");
    const mark = () => {
      panel.querySelectorAll("[data-n]").forEach((b) => b.classList.toggle("sel", +b.dataset.n === state.settings.days));
      panel.querySelectorAll("[data-names]").forEach((b) => b.classList.toggle("sel", (b.dataset.names === "1") === state.settings.names));
    };
    panel.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.n) state.settings.days = +b.dataset.n;
      if (b.dataset.names) state.settings.names = b.dataset.names === "1";
      save(); render(); mark();
    });
    mark();
    sheet.hidden = false;
  }

  /* ---------- Statistiques ---------- */
  const st = { period: "30", habit: "all" };
  const PERIODS = [["7", "7 jours"], ["30", "30 jours"], ["90", "3 mois"], ["365", "1 an"], ["all", "Tout"]];
  const ACCENT = "#8b7cf6";
  const parseKey = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };

  function areaChart(days, counts, color) {
    const n = days.length;
    let buckets = [];
    if (n <= 31) {
      days.forEach((d, i) => buckets.push({ l: String(d.getDate()), v: counts[i] }));
    } else if (n <= 120) {
      for (let i = 0; i < n; i += 7) {
        buckets.push({ l: `${days[i].getDate()} ${MONTHS_SHORT[days[i].getMonth()]}`, v: counts.slice(i, i + 7).reduce((a, b) => a + b, 0) });
      }
    } else {
      const map = new Map();
      days.forEach((d, i) => {
        const k = d.getFullYear() * 12 + d.getMonth();
        const o = map.get(k) || { l: MONTHS_SHORT[d.getMonth()], v: 0 };
        o.v += counts[i];
        map.set(k, o);
      });
      buckets = [...map.values()];
    }
    const W = 340, H = 170, pl = 8, pr = 8, pt = 14, pb = 26;
    const m = buckets.length;
    const max = Math.max(1, ...buckets.map((b) => b.v));
    const x = (i) => pl + (m === 1 ? (W - pl - pr) / 2 : (i * (W - pl - pr)) / (m - 1));
    const y = (v) => pt + (1 - v / max) * (H - pt - pb);
    const line = "M" + buckets.map((b, i) => `${x(i).toFixed(1)},${y(b.v).toFixed(1)}`).join("L");
    const area = `${line}L${x(m - 1).toFixed(1)},${H - pb}L${x(0).toFixed(1)},${H - pb}Z`;
    const step = Math.max(1, Math.ceil(m / 6));
    const labels = buckets.map((b, i) => (i % step === 0 ? `<text x="${x(i).toFixed(1)}" y="${H - 6}" text-anchor="middle">${b.l}</text>` : "")).join("");
    const id = "g" + Math.random().toString(36).slice(2, 7);
    return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Évolution des réalisations"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".5"/><stop offset="1" stop-color="${color}" stop-opacity=".04"/></linearGradient></defs><line class="axis" x1="${pl}" x2="${W - pr}" y1="${H - pb}" y2="${H - pb}"/><path d="${area}" fill="url(#${id})" stroke="none"/><path d="${line}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>${labels}<text x="${pl}" y="${pt - 3}">max ${max}</text></svg>`;
  }

  function donut(segs, center) {
    const R = 50, C = 2 * Math.PI * R, tot = segs.reduce((a, s) => a + s.v, 0);
    let off = 0;
    const arcs = tot
      ? segs.map((s) => {
          const len = (s.v / tot) * C;
          const el = `<circle cx="70" cy="70" r="${R}" fill="none" stroke="${s.color}" stroke-width="18" stroke-linecap="butt" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 70 70)"/>`;
          off += len;
          return el;
        }).join("")
      : `<circle cx="70" cy="70" r="${R}" fill="none" stroke="#26262b" stroke-width="18"/>`;
    const legend = tot
      ? segs.map((s) => `<li><i style="background:${s.color}"></i><span>${esc(s.name)}</span><b>${s.v} · ${Math.round((s.v / tot) * 100)} %</b></li>`).join("")
      : "<li>Aucune réalisation sur cette période</li>";
    return `<div class="donut"><svg viewBox="0 0 140 140" class="chart" role="img" aria-label="Répartition">${arcs}<text x="70" y="78" text-anchor="middle" class="ctr">${center}</text></svg><ul>${legend}</ul></div>`;
  }

  function weekdayBars(wd, color) {
    const W = 340, H = 150, pt = 18, pb = 22, bw = 30, gap = (W - 7 * bw) / 8;
    const max = Math.max(1, ...wd), top = Math.max(...wd);
    const names = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];
    const bars = wd.map((v, i) => {
      const h = (v / max) * (H - pt - pb), x = gap + i * (bw + gap), y = H - pb - h;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw}" height="${Math.max(h, 2).toFixed(1)}" rx="8" fill="${color}" opacity="${v === top && v > 0 ? 1 : 0.5}"/><text x="${(x + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${names[i]}</text>${v ? `<text class="val" x="${(x + bw / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle">${v}</text>` : ""}`;
    }).join("");
    return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Réalisations par jour de la semaine">${bars}</svg>`;
  }

  function statsView() {
    const title = '<h1 class="stitle">Statistiques</h1>';
    if (!state.habits.length) return title + emptyState();
    const t = today();
    let hs = st.habit === "all" ? state.habits : state.habits.filter((h) => h.id === st.habit);
    if (!hs.length) { st.habit = "all"; hs = state.habits; }
    let n = st.period === "all" ? 0 : +st.period;
    if (!n) {
      let first = null;
      hs.forEach((h) => Object.keys(state.logs[h.id] || {}).forEach((k) => { if (!first || k < first) first = k; }));
      n = first ? Math.max(7, Math.round((t - parseKey(first)) / 864e5) + 1) : 30;
    }
    const days = Array.from({ length: n }, (_, i) => addDays(t, i - n + 1));
    const keys = days.map(keyOf);
    const counts = keys.map((k) => hs.filter((h) => isDone(h.id, k)).length);
    const total = counts.reduce((a, b) => a + b, 0);
    const rate = Math.round((total / (n * hs.length)) * 100);
    const full = (k) => hs.every((h) => isDone(h.id, k));
    let cur = 0, d = t;
    if (!full(keyOf(d))) d = addDays(d, -1);
    while (cur < 3650 && full(keyOf(d))) { cur++; d = addDays(d, -1); }
    let best = 0, run = 0;
    keys.forEach((k) => { run = full(k) ? run + 1 : 0; if (run > best) best = run; });
    const color = hs.length === 1 ? hs[0].color : ACCENT;
    const wd = Array(7).fill(0);
    days.forEach((dt, i) => { wd[(dt.getDay() + 6) % 7] += counts[i]; });

    const pchips = PERIODS.map(([v, l]) => `<button class="chip${st.period === v ? " sel" : ""}" data-act="stp" data-v="${v}">${l}</button>`).join("");
    const hchips = `<button class="chip${st.habit === "all" ? " sel" : ""}" data-act="sth" data-v="all">Toutes</button>` +
      state.habits.map((h) => `<button class="chip${st.habit === h.id ? " sel" : ""}" data-act="sth" data-v="${h.id}"><span>${h.icon}</span>${esc(h.name)}</button>`).join("");
    const kpi = (ic, v, l) => `<div class="kpi"><span class="kic">${ic}</span><b>${v}</b><small>${l}</small></div>`;
    const box = (h, body) => `<section class="box"><h3>${h}</h3>${body}</section>`;
    const unit = n <= 31 ? "jour" : n <= 120 ? "semaine" : "mois";

    let segs, center;
    if (st.habit === "all") {
      segs = state.habits.map((h) => ({ name: h.name, color: h.color, v: keys.filter((k) => isDone(h.id, k)).length })).filter((s) => s.v > 0);
      center = total;
    } else {
      segs = [{ name: "Fait", color: hs[0].color, v: total }, { name: "Manqué", color: "#2a2a30", v: n * hs.length - total }];
      center = rate + " %";
    }
    const rates = st.habit === "all"
      ? box("Taux de réussite par habitude", state.habits.map((h) => {
          const r = Math.round((keys.filter((k) => isDone(h.id, k)).length / n) * 100);
          return `<div class="hrow" style="--c:${h.color}"><span class="hn">${h.icon} ${esc(h.name)}</span><span class="track"><i style="width:${r}%"></i></span><b>${r} %</b></div>`;
        }).join(""))
      : "";

    return `${title}
      <div class="chips small">${pchips}</div>
      <div class="chips small">${hchips}</div>
      <div class="kpis">
        ${kpi("#", total, "Réalisations")}
        ${kpi("%", rate + " %", "Taux de réussite")}
        ${kpi("🔥", cur + " j", "Série actuelle")}
        ${kpi("🏆", best + " j", "Meilleure série")}
      </div>
      ${st.habit === "all" ? '<p class="hint">Une série compte les jours où toutes les habitudes sont cochées.</p>' : ""}
      ${box(`Réalisations / ${unit}`, areaChart(days, counts, color))}
      ${box(st.habit === "all" ? "Répartition par habitude" : "Fait / manqué", donut(segs, center))}
      ${box("Par jour de la semaine", weekdayBars(wd, color))}
      ${rates}`;
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
    else if (act === "filter") {
      state.settings.showFilter = !state.settings.showFilter;
      if (!state.settings.showFilter) state.settings.filter = null;
      save(); render();
    }
    else if (act === "stats") { page = page === "stats" ? "home" : "stats"; window.scrollTo(0, 0); render(); }
    else if (act === "cat") { state.settings.filter = id || null; save(); render(); }
    else if (act === "themes") openThemes();
    else if (act === "catedit") openCatEditor(id);
    else if (act === "catnew") openCatEditor();
    else if (act === "compact") openCompact();
    else if (act === "stp") { st.period = el.dataset.v; render(); }
    else if (act === "sth") { st.habit = el.dataset.v; render(); }
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