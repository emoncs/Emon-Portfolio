(() => {
  const $ = (s, p = document) => p.querySelector(s);

  const toast = (msg) => {
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2400);
  };

  const enc = (s) =>
    String(s || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[m]));

  const fmtDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  };

  const fmtTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  const readingTime = (text) => {
    const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
    const mins = Math.max(1, Math.round(words / 200));
    return `${mins} min read`;
  };

  // plaintext -> HTML (supports headings + code blocks + lists)
  const renderContent = (raw) => {
    const text = String(raw || "").replace(/\r\n/g, "\n").trim();
    if (!text) return "<p class='muted'>No content.</p>";

    const lines = text.split("\n");
    let html = "";
    let inCode = false;
    let codeBuf = [];

    const flushCode = () => {
      if (!codeBuf.length) return;
      html += `<pre><code>${enc(codeBuf.join("\n"))}</code></pre>`;
      codeBuf = [];
    };

    const flushPara = (para) => {
      const p = para.join(" ").trim();
      if (!p) return;
      html += `<p>${enc(p)}</p>`;
    };

    let para = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim().startsWith("```")) {
        if (!inCode) { flushPara(para); para = []; inCode = true; }
        else { inCode = false; flushCode(); }
        continue;
      }

      if (inCode) { codeBuf.push(line); continue; }

      if (line.startsWith("## ")) { flushPara(para); para = []; html += `<h2>${enc(line.replace(/^##\s+/, ""))}</h2>`; continue; }
      if (line.startsWith("### ")) { flushPara(para); para = []; html += `<h3>${enc(line.replace(/^###\s+/, ""))}</h3>`; continue; }
      if (line.startsWith("> ")) { flushPara(para); para = []; html += `<blockquote>${enc(line.replace(/^>\s+/, ""))}</blockquote>`; continue; }

      if (/^\s*[-•]\s+/.test(line)) {
        flushPara(para); para = [];
        const items = [];
        let j = i;
        while (j < lines.length && /^\s*[-•]\s+/.test(lines[j])) {
          items.push(lines[j].replace(/^\s*[-•]\s+/, "").trim());
          j++;
        }
        html += `<ul>${items.map(it => `<li>${enc(it)}</li>`).join("")}</ul>`;
        i = j - 1;
        continue;
      }

      if (!line.trim()) { flushPara(para); para = []; continue; }
      para.push(line.trim());
    }

    flushPara(para);
    flushCode();
    return html;
  };

  const qs = new URLSearchParams(window.location.search);
  const id = (qs.get("id") || "").trim();

  const els = {
    loading: $("#loading"),
    state: $("#state"),
    post: $("#post"),

    coverImg: $("#coverImg"),
    title: $("#title"),
    summary: $("#summary"),
    ribbons: $("#ribbons"),
    datePill: $("#datePill"),
    timePill: $("#timePill"),
    verifiedPill: $("#verifiedPill"),
    tags: $("#tags"),
    content: $("#content"),
    copyBtn: $("#copyBtn"),
    shareBtn: $("#shareBtn"),
    progress: $("#progress"),
  };

  const setState = (ok, msg) => {
    if (els.loading) els.loading.style.display = ok ? "none" : "";
    if (els.post) els.post.hidden = !ok;

    if (!ok) {
      if (els.state) {
        els.state.hidden = false;
        els.state.innerHTML = `
          <div style="display:flex;gap:12px;align-items:center">
            <div style="width:18px;height:18px;border-radius:50%;background:rgba(234,88,12,.18);border:1px solid rgba(234,88,12,.25)"></div>
            <div>
              <div class="st-title">${enc(msg || "Something went wrong")}</div>
              <div class="muted">Open from <b>articles.html</b> or check the URL.</div>
            </div>
          </div>
        `;
      }
    } else {
      els.state && (els.state.hidden = true);
    }
  };

  const makeRibbons = (a) => {
    const list = [];
    if (a.featured) list.push(`<span class="ribbon featured">FEATURED</span>`);
    const t = String(a.title || "").toLowerCase();
    if (t.includes("ccna")) list.push(`<span class="ribbon ccna">CCNA</span>`);
    if (t.includes("ccnp")) list.push(`<span class="ribbon ccnp">CCNP</span>`);
    return list.join("");
  };

  const bindShare = () => {
    const url = window.location.href;

    els.copyBtn?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(url);
        toast("Link copied!");
      } catch {
        const ta = document.createElement("textarea");
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        toast("Link copied!");
      }
    });

    els.shareBtn?.addEventListener("click", async () => {
      if (navigator.share) {
        try { await navigator.share({ title: document.title, url }); } catch {}
      } else {
        toast("Share not supported. Use copy link.");
      }
    });
  };

  const bindProgress = () => {
    const update = () => {
      if (!els.progress) return;
      const h = document.documentElement;
      const max = Math.max(1, h.scrollHeight - h.clientHeight);
      const pct = Math.min(100, Math.max(0, (h.scrollTop / max) * 100));
      els.progress.style.width = pct + "%";
    };
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  };

  const load = async () => {
    if (!id) { setState(false, "Article ID missing"); return; }

    try {
      const res = await fetch("./articles.json", { cache: "no-store" });
      if (!res.ok) throw new Error("articles.json not found");

      const data = await res.json();
      const all = Array.isArray(data) ? data : [];
      const a = all.find((x) => String(x.id) === id);

      if (!a) { setState(false, "Article not found"); return; }

      document.title = `${a.title || "Article"} | Emon Net`;

      if (els.coverImg) {
        els.coverImg.src = a.cover || "default.jpg";
        els.coverImg.alt = a.title || "Cover";
        els.coverImg.onerror = () => { els.coverImg.src = "default.jpg"; };
      }

      els.title && (els.title.textContent = a.title || "Untitled");
      els.summary && (els.summary.textContent = a.summary || "");
      els.ribbons && (els.ribbons.innerHTML = makeRibbons(a));

      els.datePill && (els.datePill.innerHTML = `<i class="fa-regular fa-calendar"></i> ${enc(fmtDate(a.datetime))}`);
      els.timePill && (els.timePill.innerHTML = `<i class="fa-regular fa-clock"></i> ${enc(fmtTime(a.datetime))} • ${enc(readingTime(a.content || ""))}`);

      if (els.verifiedPill) els.verifiedPill.hidden = !a.verified;

      if (els.tags) {
        els.tags.innerHTML = (a.tags || []).slice(0, 8).map(t => `<span class="tag">${enc(t)}</span>`).join("");
      }

      if (els.content) {
        els.content.innerHTML = renderContent(a.content);
      }

      setState(true);
      bindShare();
      bindProgress();

      const y = $("#year");
      if (y) y.textContent = new Date().getFullYear();
    } catch (err) {
      console.error(err);
      setState(false, "Failed to load articles.json");
      toast("Run with Live Server / Vercel (fetch needs http://)");
    }
  };

  load();
})();
