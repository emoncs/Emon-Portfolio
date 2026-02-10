const $ = (s, p=document) => p.querySelector(s);

const els = {
  year: $("#year"),
  toast: $("#toast"),

  search: $("#search"),
  clearBtn: $("#clearBtn"),
  chips: $("#chips"),
  sortBy: $("#sortBy"),

  featured: $("#featured"),
  grid: $("#grid"),
  empty: $("#empty"),
  skeleton: $("#skeleton"),

  stTotal: $("#stTotal"),
  stFeatured: $("#stFeatured"),
  stLatest: $("#stLatest"),
  metaCount: $("#metaCount"),
  metaUpdated: $("#metaUpdated"),

  randomBtn: $("#randomBtn"),
  gridBtn: $("#gridBtn"),
  listBtn: $("#listBtn"),

  themeBtn: $("#themeBtn"),

  navToggle: $("#navToggle"),
  drawer: $("#drawer"),
  backdrop: $("#backdrop"),
  drawerClose: $("#drawerClose")
};

if (els.year) els.year.textContent = new Date().getFullYear();

const state = {
  q: "",
  tag: "all",
  sort: "new",
  view: "grid"
};

let ALL = [];

function toast(msg){
  if (!els.toast) return;
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => els.toast.classList.remove("show"), 2600);
}

function safeText(v){ return (v ?? "").toString().trim(); }
function parseDateISO(d){
  const x = safeText(d);
  const t = Date.parse(x);
  return Number.isFinite(t) ? t : null;
}
function formatShortDate(ms){
  try{
    return new Date(ms).toLocaleDateString(undefined, { year:"numeric", month:"short", day:"2-digit" });
  }catch{ return "—"; }
}
function debounce(fn, wait=160){
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

function updateURL(){
  const u = new URL(location.href);
  if (state.q) u.searchParams.set("q", state.q); else u.searchParams.delete("q");
  if (state.tag && state.tag !== "all") u.searchParams.set("tag", state.tag); else u.searchParams.delete("tag");
  if (state.sort && state.sort !== "new") u.searchParams.set("sort", state.sort); else u.searchParams.delete("sort");
  if (state.view && state.view !== "grid") u.searchParams.set("view", state.view); else u.searchParams.delete("view");
  history.replaceState(null, "", u.toString());
}
function readURL(){
  const u = new URL(location.href);
  state.q = safeText(u.searchParams.get("q"));
  state.tag = safeText(u.searchParams.get("tag")) || "all";
  state.sort = safeText(u.searchParams.get("sort")) || "new";
  state.view = safeText(u.searchParams.get("view")) || "grid";
}

function setView(v){
  state.view = v === "list" ? "list" : "grid";
  if (els.grid) els.grid.classList.toggle("list", state.view === "list");
  updateURL();
}

function openDrawer(){
  if (!els.drawer || !els.backdrop || !els.navToggle) return;
  els.drawer.classList.add("open");
  els.drawer.setAttribute("aria-hidden","false");
  els.backdrop.hidden = false;
  els.navToggle.setAttribute("aria-expanded","true");
  document.body.style.overflow = "hidden";
}
function closeDrawer(){
  if (!els.drawer || !els.backdrop || !els.navToggle) return;
  els.drawer.classList.remove("open");
  els.drawer.setAttribute("aria-hidden","true");
  els.backdrop.hidden = true;
  els.navToggle.setAttribute("aria-expanded","false");
  document.body.style.overflow = "";
}

els.navToggle?.addEventListener("click", () => {
  const open = els.drawer.classList.contains("open");
  open ? closeDrawer() : openDrawer();
});
els.drawerClose?.addEventListener("click", closeDrawer);
els.backdrop?.addEventListener("click", closeDrawer);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDrawer();
});

function applyTheme(theme){
  const root = document.documentElement;
  if (theme === "dark") root.setAttribute("data-theme","dark");
  else root.removeAttribute("data-theme");

  try{ localStorage.setItem("theme", theme); }catch{}
  const icon = els.themeBtn?.querySelector("i");
  if (icon){
    icon.className = theme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
  }
}

(function initTheme(){
  let saved = "";
  try{ saved = localStorage.getItem("theme") || ""; }catch{}
  if (saved === "dark" || saved === "light") return applyTheme(saved);
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(prefersDark ? "dark" : "light");
})();

els.themeBtn?.addEventListener("click", () => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  applyTheme(isDark ? "light" : "dark");
});

function getAllTags(items){
  const set = new Set();
  items.forEach(a => (Array.isArray(a.tags) ? a.tags : []).forEach(t => set.add(String(t))));
  return Array.from(set).sort((x,y)=> x.localeCompare(y));
}

function buildChips(tags){
  if (!els.chips) return;
  els.chips.innerHTML = `<button class="chip ${state.tag==="all" ? "active":""}" type="button" data-tag="all">All</button>`;
  tags.forEach(t => {
    const b = document.createElement("button");
    b.className = `chip ${state.tag===t ? "active":""}`;
    b.type = "button";
    b.dataset.tag = t;
    b.textContent = t;
    els.chips.appendChild(b);
  });

  els.chips.querySelectorAll(".chip").forEach(btn => {
    btn.addEventListener("click", () => {
      state.tag = btn.dataset.tag || "all";
      els.chips.querySelectorAll(".chip").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");
      updateURL();
      render();
    });
  });
}

function cardHTML(a){
  const title = safeText(a.title) || "Untitled";
  const summary = safeText(a.summary) || "";
  const url = safeText(a.url) || "#";
  const cover = safeText(a.cover) || "";
  const tags = Array.isArray(a.tags) ? a.tags : [];
  const featured = !!a.featured;
  const verified = a.verified !== false;

  const dms = parseDateISO(a.date) ?? parseDateISO(a.updated) ?? null;
  const dateBadge = dms ? formatShortDate(dms) : "—";
  const level = safeText(a.level) || "";
  const mins = Number.isFinite(+a.minutes) ? Math.max(1, Math.floor(+a.minutes)) : null;

  const badges = [
    `<span class="badge ok"><i class="fa-solid fa-calendar"></i> ${dateBadge}</span>`,
    level ? `<span class="badge"><i class="fa-solid fa-signal"></i> ${level}</span>` : "",
    mins ? `<span class="badge"><i class="fa-regular fa-clock"></i> ${mins} min</span>` : ""
  ].filter(Boolean).join("");

  const tagHTML = tags.slice(0, 4).map(t => `<span class="tag">${t}</span>`).join("");

  return `
  <a class="card-link" href="${url}" aria-label="Open article: ${title}">
    <article class="card">
      <div class="media">
        ${cover ? `<img src="${cover}" alt="${title}" loading="lazy" decoding="async">` : ``}
        <div class="ribbon ${featured ? "r-featured":"r-article"}">${featured ? "Featured":"Article"}</div>
        ${verified ? `<div class="verified" title="Verified"><i class="fa-solid fa-check"></i></div>` : ``}
      </div>
      <div class="body">
        <h3 class="title">${title}</h3>
        ${summary ? `<p class="summary">${summary}</p>` : ``}
        <div class="meta">${badges}</div>
        ${tagHTML ? `<div class="tags">${tagHTML}</div>` : ``}
      </div>
    </article>
  </a>`;
}

function featuredHTML(a){
  const title = safeText(a.title) || "Untitled";
  const summary = safeText(a.summary) || "";
  const url = safeText(a.url) || "#";
  const cover = safeText(a.cover) || "";
  const dms = parseDateISO(a.date) ?? parseDateISO(a.updated) ?? null;
  const dateBadge = dms ? formatShortDate(dms) : "—";
  const mins = Number.isFinite(+a.minutes) ? Math.max(1, Math.floor(+a.minutes)) : null;

  return `
  <a class="f-link" href="${url}" aria-label="Open featured article: ${title}">
    <article class="featured-card">
      <div class="f-media">
        ${cover ? `<img src="${cover}" alt="${title}" loading="lazy" decoding="async">` : ``}
      </div>
      <div class="f-body">
        <h3 class="f-title">${title}</h3>
        ${summary ? `<p class="f-sum">${summary}</p>` : ``}
        <div class="f-row">
          <span class="badge ok"><i class="fa-solid fa-calendar"></i> ${dateBadge}</span>
          ${mins ? `<span class="badge"><i class="fa-regular fa-clock"></i> ${mins} min</span>` : ``}
          <span class="badge"><i class="fa-solid fa-arrow-up-right-from-square"></i> Read</span>
        </div>
      </div>
    </article>
  </a>`;
}

function applyFilters(items){
  const q = state.q.toLowerCase();
  const tag = state.tag;

  let out = items.filter(a => a && a.active !== false);

  if (tag && tag !== "all"){
    out = out.filter(a => (Array.isArray(a.tags) ? a.tags : []).map(String).includes(tag));
  }

  if (q){
    out = out.filter(a => {
      const t = safeText(a.title).toLowerCase();
      const s = safeText(a.summary).toLowerCase();
      const body = safeText(a.excerpt).toLowerCase();
      const tags = (Array.isArray(a.tags) ? a.tags : []).join(" ").toLowerCase();
      return t.includes(q) || s.includes(q) || body.includes(q) || tags.includes(q);
    });
  }

  if (state.sort === "title"){
    out.sort((a,b)=> safeText(a.title).localeCompare(safeText(b.title)));
  } else {
    out.sort((a,b) => {
      const da = parseDateISO(a.date) ?? parseDateISO(a.updated) ?? 0;
      const db = parseDateISO(b.date) ?? parseDateISO(b.updated) ?? 0;
      return state.sort === "old" ? (da - db) : (db - da);
    });
  }

  return out;
}

function updateStats(allActive){
  const total = allActive.length;
  const featured = allActive.filter(a => !!a.featured).length;

  const latestMs = allActive
    .map(a => parseDateISO(a.date) ?? parseDateISO(a.updated) ?? 0)
    .filter(Boolean)
    .sort((a,b)=> b-a)[0];

  els.stTotal.textContent = String(total);
  els.stFeatured.textContent = String(featured);
  els.stLatest.textContent = latestMs ? formatShortDate(latestMs) : "—";

  els.metaCount.textContent = ` ${total} posts`;
  els.metaUpdated.textContent = ` Updated ${latestMs ? formatShortDate(latestMs) : "—"}`;
}

function render(){
  const allActive = ALL.filter(a => a && a.active !== false);
  updateStats(allActive);

  const filtered = applyFilters(ALL);

  const featured = filtered.filter(a => !!a.featured).slice(0, 3);
  els.featured.innerHTML = featured.length ? featured.map(featuredHTML).join("") : `<div class="muted small">No featured posts for current filter.</div>`;

  els.grid.innerHTML = filtered.map(cardHTML).join("");
  els.empty.hidden = filtered.length !== 0;

  els.clearBtn.hidden = !state.q;
  els.grid.classList.toggle("list", state.view === "list");
}

async function load(){

  try{
    const res = await fetch("articles.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("Failed to load articles.json");
    const data = await res.json();

    const items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
    ALL = items.map(x => ({
      id: x.id ?? x.slug ?? "",
      title: x.title ?? "",
      summary: x.summary ?? "",
      excerpt: x.excerpt ?? "",
      url: x.url ?? "",
      cover: x.cover ?? "",
      tags: Array.isArray(x.tags) ? x.tags : [],
      date: x.date ?? "",
      updated: x.updated ?? "",
      minutes: x.minutes ?? null,
      level: x.level ?? "",
      featured: !!x.featured,
      verified: x.verified !== false,
      active: x.active !== false
    }));

    const tags = getAllTags(ALL.filter(a => a.active !== false));
    buildChips(tags);

    if (els.search){
      els.search.value = state.q || "";
      els.clearBtn.hidden = !state.q;
    }
    if (els.sortBy) els.sortBy.value = state.sort || "new";

    setView(state.view);

    render();
  }catch(err){
    els.featured.innerHTML = "";
    els.grid.innerHTML = "";
    els.empty.hidden = false;
    toast("articles.json not loading");
  }finally{
  }
}

readURL();

els.search?.addEventListener("input", debounce((e) => {
  state.q = safeText(e.target.value);
  updateURL();
  render();
}, 140));

els.clearBtn?.addEventListener("click", () => {
  state.q = "";
  els.search.value = "";
  updateURL();
  render();
  els.search.focus();
});

els.sortBy?.addEventListener("change", (e) => {
  state.sort = e.target.value || "new";
  updateURL();
  render();
});

els.randomBtn?.addEventListener("click", () => {
  const pool = applyFilters(ALL);
  if (!pool.length) return toast("No article to open");
  const pick = pool[Math.floor(Math.random() * pool.length)];
  if (pick?.url) location.href = pick.url;
});

els.gridBtn?.addEventListener("click", () => setView("grid"));
els.listBtn?.addEventListener("click", () => setView("list"));

load();

