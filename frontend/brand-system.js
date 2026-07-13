(() => {
  const brand = {
    part: 54,
    product: "NAXORA Institute OS",
    versionTrack: "NAXORA OS 1.0",
    logo: "/assets/naxora-logo.svg",
    palette: {
      black: "#030509",
      gold: "#D4AF37",
      white: "#FFFFFF",
      electricBlue: "#00D4FF"
    },
    tagline: "AI-powered institute operating system",
    rule: "Black + Gold + White + Electric Blue, premium SaaS consistency"
  };

  window.NAXORA_BRAND = brand;
  document.body.dataset.naxoraBrand = "part54";

  const setLogo = (root = document) => {
    root.querySelectorAll(".logo").forEach((logo) => {
      const mark = logo.querySelector("span");
      if (mark && !mark.dataset.naxoraEnhanced) {
        mark.dataset.naxoraEnhanced = "true";
        mark.classList.add("naxora-logo-mark");
        mark.innerHTML = `<img src="${brand.logo}" alt="NAXORA logo" loading="lazy">`;
      }
      const text = logo.querySelector("b,strong");
      if (text) text.textContent = "NAXORA";
    });
  };

  const addWatermark = () => {
    if (document.querySelector(".naxora-brand-watermark")) return;
    const hiddenPages = ["system-audit", "branding"];
    const path = window.location.pathname.toLowerCase();
    if (hiddenPages.some((item) => path.includes(item))) return;
    const badge = document.createElement("div");
    badge.className = "naxora-brand-watermark";
    badge.innerHTML = `<span>NAXORA</span> Part 54 Brand`;
    document.body.appendChild(badge);
  };

  const polishAuthCopy = () => {
    const title = document.querySelector("#formTitle");
    const text = document.querySelector("#formText");
    if (title && /welcome back/i.test(title.textContent)) title.textContent = "Welcome to NAXORA";
    if (text && /dashboard/i.test(text.textContent)) text.textContent = "Secure access to your premium institute control room.";
    const heroLead = document.querySelector(".hero .lead");
    if (heroLead) heroLead.textContent = "Students, fees, attendance, live classes, AI tools, leads and growth dashboards — one premium branded OS.";
  };

  const addBrandPill = () => {
    const topbar = document.querySelector(".topbar > div:first-child");
    if (!topbar || topbar.querySelector(".naxora-brand-pill")) return;
    const pill = document.createElement("div");
    pill.className = "naxora-brand-pill";
    pill.textContent = "Official Brand System Active · Part 54";
    topbar.prepend(pill);
  };

  const cleanInternalDemoLinks = () => {
    const internal = new Set(["demo-mode.html", "client-pitch.html", "deployment.html", "system-debug.html", "final-testing.html"]);
    document.querySelectorAll(".sidebar a").forEach((link) => {
      const href = (link.getAttribute("href") || "").trim();
      if (internal.has(href)) link.dataset.internalOnly = "true";
      if (/\.html(#.*)?$/i.test(href) && !href.startsWith("http")) {
        link.setAttribute("href", href.replace(/\.html/i, ""));
      }
    });
  };

  const run = () => {
    setLogo();
    polishAuthCopy();
    addBrandPill();
    cleanInternalDemoLinks();
    addWatermark();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
