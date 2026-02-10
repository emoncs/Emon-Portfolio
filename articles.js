(() => {
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];

  const toast = (msg) => {
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2400);
  };

  const fmtDate = (iso) => {
    const d = new Date(iso);
    const opt = { year: "numeric", month: "short", day: "2-digit" };
    return d.toLocaleDateString(undefined, opt);
  };

  const fmtTime = (iso) => {
    const d = new Date(iso);
    const opt = { hour: "2-digit", minute: "2-digit" };
    return d.toLocaleTimeString(undefined, opt);
  };

  const readingTime = (text) => {
    const words = String(text || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    const mins = Math.max(1, Math.round(words / 200));
    return `${mins} min read`;
  };

  const enc = (s) =>
    String(s || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[m]));

  let all = [];
  let activeTag = "all";
  let q = "";

  const grid = $("#grid");
  const featured = $("#featured");
  const empty = $("#empty");

  const stTotal = $("#stTotal");
  const stFeatured = $("#stFeatured");
  const stLatest = $("#stLatest");

  const articleHref = (id) => `article.html?id=${encodeURIComponent(id)}`;

  const matches = (a) => {
    const tags = (a.tags || []).map((t) => String(t).toLowerCase());
    const tagOk = activeTag === "all" ? true : tags.includes(activeTag);

    const text = `${a.title || ""} ${a.summary || ""} ${(a.tags || []).join(" ")}`.toLowerCase();
    const qOk = !q ? true : text.includes(q.toLowerCase());

    return tagOk && qOk;
  };

  const buildTags = () => {
    const wrap = $("#chips");
    if (!wrap) return;

    const set = new Set();
    all.forEach((a) => (a.tags || []).forEach((t) => set.add(String(t))));

    const tags = ["all", ...[...set].sort((a, b) => a.localeCompare(b))];

    wrap.innerHTML = "";
    tags.forEach((t, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip" + (i === 0 ? " active" : "");
      btn.dataset.tag = t === "all" ? "all" : String(t).toLowerCase();
      btn.textContent = t === "all" ? "All" : t;
      wrap.appendChild(btn);
    });
  };

  const renderFeatured = () => {
    if (!featured) return;

    const feats = all
      .filter((a) => a.featured === true)
      .slice()
      .sort((x, y) => new Date(y.datetime) - new Date(x.datetime));

    const f = feats[0];

    featured.innerHTML = f
      ? `
      <article class="featured-card" data-id="${enc(f.id)}" aria-label="Featured article">
        <a class="f-link" href="${enc(articleHref(f.id))}" aria-label="Read: ${enc(f.title)}">
          <div class="f-media">
            <img src="${enc(f.cover || "default.jpg")}" alt="${enc(f.title)}" onerror="this.src='default.jpg'">
          </div>
          <div class="f-body">
            <h3 class="f-title">${enc(f.title)}</h3>
            <p class="f-sum">${enc(f.summary || "")}</p>

            <div class="meta">
              <span class="badge"><i class="fa-regular fa-calendar"></i> ${enc(fmtDate(f.datetime))} • ${enc(fmtTime(f.datetime))}</span>
              <span class="badge"><i class="fa-regular fa-clock"></i> ${enc(readingTime(f.content || ""))}</span>
              ${f.verified ? `<span class="badge ok"><i class="fa-solid fa-circle-check"></i> Verified</span>` : ``}
            </div>

            <div class="tags" aria-label="Tags">
              ${(f.tags || []).slice(0, 5).map((t) => `<span class="tag">${enc(t)}</span>`).join("")}
            </div>
          </div>
        </a>
      </article>
    `
      : `<div class="muted small">No featured post yet.</div>`;
  };

  const renderGrid = () => {
    if (!grid) return;

    const sorted = all
      .slice()
      .sort((x, y) => new Date(y.datetime) - new Date(x.datetime));

    const list = sorted.filter(matches);

    grid.innerHTML = list
      .map((a) => {
        const cover = a.cover || "default.jpg";
        const ribbonText = a.featured ? "FEATURED" : "ARTICLE";
        const ribbonCls = a.featured ? "r-featured" : "r-article";
        const href = articleHref(a.id);

        return `
        <article class="card" data-id="${enc(a.id)}" aria-label="${enc(a.title)}">
          <a class="card-link" href="${enc(href)}" aria-label="Read: ${enc(a.title)}">
            <div class="media">
              <img src="${enc(cover)}" alt="${enc(a.title)}" onerror="this.src='default.jpg'">
              <span class="ribbon ${ribbonCls}">${ribbonText}</span>
              ${a.verified ? `<span class="verified" title="Verified"><i class="fa-solid fa-check"></i></span>` : ``}
            </div>

            <div class="body">
              <h3 class="title">${enc(a.title)}</h3>
              <p class="summary">${enc(a.summary || "")}</p>

              <div class="meta">
                <span class="badge"><i class="fa-regular fa-calendar"></i> ${enc(fmtDate(a.datetime))} • ${enc(fmtTime(a.datetime))}</span>
                <span class="badge"><i class="fa-regular fa-clock"></i> ${enc(readingTime(a.content || ""))}</span>
              </div>

              <div class="tags" aria-label="Tags">
                ${(a.tags || []).slice(0, 4).map((t) => `<span class="tag">${enc(t)}</span>`).join("")}
              </div>
            </div>
          </a>
        </article>
      `;
      })
      .join("");

    if (empty) empty.hidden = list.length !== 0;

    stTotal && (stTotal.textContent = String(all.length));
    const feats = all.filter((a) => a.featured === true);
    stFeatured && (stFeatured.textContent = String(feats.length));

    const newest = sorted[0];
    stLatest && (stLatest.textContent = newest?.datetime ? fmtDate(newest.datetime) : "—");
  };

  const render = () => {
    renderFeatured();
    renderGrid();
  };

  const bind = () => {
    document.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (chip && chip.dataset.tag) {
        $$(".chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        activeTag = chip.dataset.tag;
        render();
        return;
      }
    });

    const search = $("#search");
    if (search) {
      search.addEventListener("input", (e) => {
        q = e.target.value || "";
        render();
      });
    }

    const year = $("#year");
    if (year) year.textContent = new Date().getFullYear();

    const prefetch = (href) => {
      if (!href) return;
      if (document.querySelector(`link[rel="prefetch"][href="${href}"]`)) return;
      const l = document.createElement("link");
      l.rel = "prefetch";
      l.href = href;
      document.head.appendChild(l);
    };

    document.addEventListener("mouseover", (e) => {
      const a = e.target.closest('a[href^="article.html?id="]');
      if (a) prefetch(a.getAttribute("href"));
    });
  };

  const loadJson = async () => {
    try {
      const res = await fetch("./articles.json", { cache: "no-store" });
      if (!res.ok) throw new Error("articles.json not found");
      const data = await res.json();

      all = Array.isArray(data) ? data : [];
      all.sort((x, y) => new Date(y.datetime) - new Date(x.datetime));

      buildTags();
      render();
    } catch (err) {
      console.error(err);
      toast("Articles data not found. Run with Live Server + check articles.json name/path.");
      all = [];
      buildTags();
      render();
    }
  };

  bind();
  loadJson();
})();
