/* =========================
   EmonNet - main.js
   Works with your HTML + CSS
   Features:
   - Mobile nav toggle + outside click close
   - Active nav link on scroll + smooth offset
   - Skills progress animation when visible
   - Project ongoing shine + reveal on scroll
   - Projects filter (all/done/ongoing/planned)
   - PDF modal preview (cards + CV button)
   - Toast notifications
   - Back to top button (fixed)
   - WhatsApp floating chat + quick WhatsApp
   - File upload name preview
   - Footer year
   - Newsletter UI (no backend)
   - EmailJS contact form (optional config)
========================= */

(() => {
  const $ = (sel, parent = document) => parent.querySelector(sel);
  const $$ = (sel, parent = document) => [...parent.querySelectorAll(sel)];

  /* ===== Helpers ===== */
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const toast = (msg, type = "info") => {
    const el = $("#toast");
    if (!el) return;

    el.textContent = msg;
    el.classList.add("show");

    // subtle style per type (optional)
    el.style.borderColor =
      type === "success"
        ? "rgba(34,197,94,.35)"
        : type === "error"
        ? "rgba(220,38,38,.25)"
        : "rgba(15,23,42,.12)";
    el.style.background =
      type === "success"
        ? "rgba(34,197,94,.08)"
        : type === "error"
        ? "rgba(220,38,38,.06)"
        : "#fff";

    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 2600);
  };

  /* ===== Footer year ===== */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ===== Mobile Nav ===== */
  const navToggle = $("#navToggle");
  const navLinks = $("#navLinks");

  const setNavOpen = (open) => {
    if (!navToggle || !navLinks) return;
    navToggle.classList.toggle("open", open);
    navLinks.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  };

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      const isOpen = navLinks.classList.contains("open");
      setNavOpen(!isOpen);
    });

    // Close nav on click link (mobile)
    navLinks.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      setNavOpen(false);
    });

    // Close on outside click / ESC
    document.addEventListener("click", (e) => {
      if (window.innerWidth > 760) return;
      if (!navLinks.classList.contains("open")) return;
      const inside = e.target.closest("#navLinks, #navToggle");
      if (!inside) setNavOpen(false);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setNavOpen(false);
    });
  }

  /* ===== Smooth anchor with sticky offset ===== */
  const getNavOffset = () => {
    const nav = $(".nav");
    return nav ? nav.offsetHeight + 10 : 84;
  };

  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();

      const top = target.getBoundingClientRect().top + window.scrollY - getNavOffset();
      window.scrollTo({ top, behavior: "smooth" });
    });
  });

  /* ===== Active nav link on scroll ===== */
  const sections = ["#home", "#about", "#documents", "#projects", "#contact"]
    .map((id) => $(id))
    .filter(Boolean);

  const navAnchors = $$(".nav-link");

  const setActiveLink = () => {
    if (!sections.length || !navAnchors.length) return;

    const scrollPos = window.scrollY + getNavOffset() + 10;

    let currentId = "#home";
    for (const sec of sections) {
      const top = sec.offsetTop;
      if (scrollPos >= top) currentId = `#${sec.id}`;
    }

    navAnchors.forEach((a) => {
      a.classList.toggle("active", a.getAttribute("href") === currentId);
    });
  };

  window.addEventListener("scroll", setActiveLink, { passive: true });
  window.addEventListener("load", setActiveLink);

  /* ===== Back to top (button) ===== */
  const toTop = $("#toTop");
  const toTopInline = $$('.btn[href="#top"], a[href="#top"]'); // your "Back to Top" button

  const updateTopBtn = () => {
    if (!toTop) return;
    const show = window.scrollY > 500;
    toTop.classList.toggle("show", show);
  };

  if (toTop) {
    toTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    window.addEventListener("scroll", updateTopBtn, { passive: true });
    updateTopBtn();
  }

  // Ensure inline back-to-top also uses smooth + offset safe
  toTopInline.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  /* ===== File upload name preview ===== */
  const fileInput = $("#diagramFile");
  const fileNameEl = $("#fileName");
  if (fileInput && fileNameEl) {
    fileInput.addEventListener("change", () => {
      const f = fileInput.files && fileInput.files[0];
      fileNameEl.textContent = f ? f.name : "No file chosen";
    });
  }

  /* ===== Projects filter ===== */
  const filterWrap = $("#projectsFilter");
  const cards = $$(".project-card");

  if (filterWrap && cards.length) {
    filterWrap.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-btn");
      if (!btn) return;

      const filter = btn.dataset.filter || "all";
      $$(".filter-btn", filterWrap).forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      cards.forEach((card) => {
        const st = card.dataset.status;
        const show = filter === "all" ? true : st === filter;
        card.style.display = show ? "" : "none";
      });
    });
  }

  /* ===== Intersection Observer: reveal + ongoing shine + skill bars ===== */
  const onViewObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add("inview");

        // Skills animation
        if (en.target.classList.contains("skill")) {
          const level = clamp(parseInt(en.target.dataset.level || "0", 10), 0, 100);
          const bar = $(".bar span", en.target);
          if (bar) bar.style.width = `${level}%`;
        }
      });
    },
    { threshold: 0.25 }
  );

  // reveal items
  $$(".reveal").forEach((el) => onViewObserver.observe(el));

  // ongoing project shine
  $$(".project-ongoing").forEach((el) => onViewObserver.observe(el));

  // skills
  $$(".skill").forEach((el) => onViewObserver.observe(el));

  /* ===== Docs tabs ===== */
  const docTabs = $("#docTabs");
  if (docTabs) {
    docTabs.addEventListener("click", (e) => {
      const btn = e.target.closest(".tab-btn");
      if (!btn) return;

      const tab = btn.dataset.tab;
      if (!tab) return;

      $$(".tab-btn", docTabs).forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      $$(".doc-pane").forEach((pane) => {
        pane.classList.toggle("active", pane.dataset.pane === tab);
      });
    });
  }

  /* ===== PDF Modal preview ===== */
  const pdfModal = $("#pdfModal");
  const pdfFrame = $("#pdfFrame");
  const pdfTitle = $("#pdfTitle");
  const pdfCloseBtn = $("#pdfCloseBtn");
  const pdfCloseBg = $("#pdfCloseBg");

  const openPDF = (file, title) => {
    if (!pdfModal || !pdfFrame) return;
    pdfTitle && (pdfTitle.innerHTML = `<i class="fa-solid fa-file-pdf"></i> ${title || "Preview"}`);

    // iframe open same tab (no new tab)
    pdfFrame.src = file;
    pdfModal.classList.add("open");
    pdfModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };

  const closePDF = () => {
    if (!pdfModal || !pdfFrame) return;
    pdfModal.classList.remove("open");
    pdfModal.setAttribute("aria-hidden", "true");
    pdfFrame.src = "";
    document.body.style.overflow = "";
  };

  // open from cards
  $$(".pdf-card").forEach((card) => {
    card.addEventListener("click", () => {
      const file = card.dataset.pdf;
      const title = card.dataset.title;
      if (!file) return toast("PDF file not found in button data.", "error");
      openPDF(file, title);
    });
  });

  // CV button
  const cvBtn = $("#cvPreviewBtn");
  if (cvBtn) {
    cvBtn.addEventListener("click", () => {
      const file = cvBtn.dataset.pdf;
      const title = cvBtn.dataset.title || "CV Preview";
      if (!file) return toast("CV PDF file is missing.", "error");
      openPDF(file, title);
    });
  }

  if (pdfCloseBtn) pdfCloseBtn.addEventListener("click", closePDF);
  if (pdfCloseBg) pdfCloseBg.addEventListener("click", closePDF);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && pdfModal?.classList.contains("open")) closePDF();
  });

  /* ===== WhatsApp floating chat ===== */
  const waChat = $("#waChat");
  const waPanel = $("#waPanel");
  const waClose = $("#waClose");
  const waSend = $("#waSend");
  const waInput = $("#waInput");

  const toggleWaPanel = (open) => {
    if (!waPanel) return;
    waPanel.classList.toggle("open", open);
    waPanel.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) setTimeout(() => waInput?.focus(), 50);
  };

  if (waChat && waPanel) {
    waChat.addEventListener("click", () => {
      toggleWaPanel(!waPanel.classList.contains("open"));
    });

    waClose?.addEventListener("click", () => toggleWaPanel(false));

    document.addEventListener("click", (e) => {
      if (!waPanel.classList.contains("open")) return;
      const inside = e.target.closest("#waPanel, #waChat");
      if (!inside) toggleWaPanel(false);
    });

    const sendWhatsApp = () => {
      const phone = waPanel.dataset.phone || "8801713086375";
      const msg = (waInput?.value || "").trim();
      const text = encodeURIComponent(msg || "Hello Emon, I want to discuss a project.");
      const url = `https://wa.me/${phone}?text=${text}`;
      window.open(url, "_blank", "noopener,noreferrer");
      waInput && (waInput.value = "");
    };

    waSend?.addEventListener("click", sendWhatsApp);
    waInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendWhatsApp();
    });
  }

  /* ===== WhatsApp quick button (Contact card) ===== */
  const waQuick = $("#waQuick");
  if (waQuick) {
    waQuick.addEventListener("click", () => {
      const msg = encodeURIComponent("Hello Emon, I need quick help.");
      window.open(`https://wa.me/8801713086375?text=${msg}`, "_blank", "noopener,noreferrer");
    });
  }

  /* ===== Newsletter (UI only) ===== */
  const newsBtn = $("#newsBtn");
  const newsEmail = $("#newsEmail");
  if (newsBtn && newsEmail) {
    newsBtn.addEventListener("click", () => {
      const val = (newsEmail.value || "").trim();
      if (!val) return toast("Email optional — you can also message me from Contact.", "info");
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      if (!ok) return toast("Please enter a valid email address.", "error");
      toast("Thanks! (UI only) — Please use Contact form to actually reach me.", "success");
      newsEmail.value = "";
    });
  }

  /* ===== EmailJS Contact Form =====
     NOTE: Attachment via EmailJS needs special handling.
     Here we send message text + file name (not actual file) by default.
     If you really want attachment, tell me your EmailJS template settings.
  */
  const contactForm = $("#contactForm");
  if (contactForm) {
    // Safe init: won't break if not configured
    try {
      // window.emailjs && emailjs.init("YOUR_PUBLIC_KEY");
      // Keep as-is; user will set public key
    } catch (e) {}

    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const sendBtn = $("#sendBtn");
      sendBtn && (sendBtn.disabled = true);

      const fd = new FormData(contactForm);
      const name = (fd.get("name") || "").toString().trim();
      const email = (fd.get("email") || "").toString().trim();
      const subject = (fd.get("subject") || "").toString().trim();
      const message = (fd.get("message") || "").toString().trim();

      const f = fileInput?.files?.[0];
      const fileLabel = f ? `${f.name} (${Math.round(f.size / 1024)} KB)` : "No file";

      // Basic validation
      if (!name || !email || !subject || !message) {
        toast("Please fill all required fields.", "error");
        sendBtn && (sendBtn.disabled = false);
        return;
      }

      // If EmailJS not configured, show UI success message
      if (!window.emailjs || !window.emailjs.send) {
        toast("Message prepared (EmailJS not configured). Add EmailJS keys in main.js.", "info");
        contactForm.reset();
        if (fileNameEl) fileNameEl.textContent = "No file chosen";
        sendBtn && (sendBtn.disabled = false);
        return;
      }

      // ===== Replace these with your EmailJS values =====
      const SERVICE_ID = "YOUR_SERVICE_ID";
      const TEMPLATE_ID = "YOUR_TEMPLATE_ID";
      const PUBLIC_KEY = "YOUR_PUBLIC_KEY"; // used in emailjs.init()

      try {
        // init once
        if (!window.__emailjs_inited) {
          emailjs.init(PUBLIC_KEY);
          window.__emailjs_inited = true;
        }

        const params = {
          from_name: name,
          reply_to: email,
          subject,
          message,
          file_info: fileLabel
        };

        await emailjs.send(SERVICE_ID, TEMPLATE_ID, params);
        toast("Message sent successfully!", "success");
        contactForm.reset();
        if (fileNameEl) fileNameEl.textContent = "No file chosen";
      } catch (err) {
        console.error(err);
        toast("Failed to send. Please try again or WhatsApp me.", "error");
      } finally {
        sendBtn && (sendBtn.disabled = false);
      }
    });
  }

})();
