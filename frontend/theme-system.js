/* NAXORA Institute OS - Part 37 Dark / Light / System Theme System */
(() => {
  const STORAGE_KEY = "naxora-theme-mode";
  const SYSTEM_QUERY = "(prefers-color-scheme: light)";
  const validModes = new Set(["dark", "light", "system"]);

  function getStoredMode() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return validModes.has(saved) ? saved : "dark";
  }

  function resolveMode(mode) {
    if (mode === "system") {
      return window.matchMedia && window.matchMedia(SYSTEM_QUERY).matches ? "light" : "dark";
    }
    return validModes.has(mode) ? mode : "dark";
  }

  function applyMode(mode, persist = true) {
    const safeMode = validModes.has(mode) ? mode : "dark";
    const resolved = resolveMode(safeMode);
    if (persist) localStorage.setItem(STORAGE_KEY, safeMode);

    document.documentElement.dataset.theme = resolved;
    document.body.dataset.theme = resolved;
    document.documentElement.dataset.themeMode = safeMode;
    document.body.dataset.themeMode = safeMode;

    let meta = document.querySelector('meta[name="color-scheme"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "color-scheme");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", resolved === "light" ? "light" : "dark");

    document.dispatchEvent(new CustomEvent("naxora:theme-change", { detail: { mode: safeMode, resolved } }));
    syncControls(safeMode, resolved);
  }

  function syncControls(mode, resolved) {
    document.querySelectorAll("[data-theme-choice]").forEach((btn) => {
      const isActive = btn.dataset.themeChoice === mode;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", String(isActive));
    });

    const themeModeSelect = document.getElementById("themeMode");
    if (themeModeSelect && validModes.has(themeModeSelect.value) && themeModeSelect.value !== mode) {
      themeModeSelect.value = mode;
    }

    const status = document.getElementById("themeStatusText");
    if (status) {
      status.textContent = `Current mode: ${mode.toUpperCase()} • Applied theme: ${resolved.toUpperCase()}`;
    }
  }

  function createFloatingSwitcher() {
    if (document.querySelector(".nx-theme-switcher")) return;
    const switcher = document.createElement("div");
    switcher.className = "nx-theme-switcher";
    switcher.setAttribute("aria-label", "Theme switcher");
    switcher.innerHTML = `
      <button type="button" title="Dark mode" data-theme-choice="dark">🌙</button>
      <button type="button" title="Light mode" data-theme-choice="light">☀️</button>
      <button type="button" title="System mode" data-theme-choice="system">💻</button>
    `;
    switcher.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-theme-choice]");
      if (!btn) return;
      applyMode(btn.dataset.themeChoice);
    });
    document.body.appendChild(switcher);
  }

  function connectThemeCards() {
    document.querySelectorAll("[data-theme-choice]").forEach((btn) => {
      btn.addEventListener("click", () => applyMode(btn.dataset.themeChoice));
    });

    const themeModeSelect = document.getElementById("themeMode");
    if (themeModeSelect) {
      themeModeSelect.addEventListener("change", () => {
        if (validModes.has(themeModeSelect.value)) applyMode(themeModeSelect.value);
      });
    }
  }

  function addThemeNavLink() {
    const navs = document.querySelectorAll(".sidebar nav");
    navs.forEach((nav) => {
      if (nav.querySelector('a[href="theme.html"]')) return;
      const link = document.createElement("a");
      link.href = "theme.html";
      link.textContent = "Theme";
      if (location.pathname.endsWith("theme.html")) link.classList.add("active");
      const settings = nav.querySelector('a[href="settings.html"]');
      if (settings) settings.insertAdjacentElement("afterend", link);
      else nav.appendChild(link);
    });
  }

  function initSystemListener() {
    if (!window.matchMedia) return;
    const media = window.matchMedia(SYSTEM_QUERY);
    const handler = () => {
      if (getStoredMode() === "system") applyMode("system", false);
    };
    if (media.addEventListener) media.addEventListener("change", handler);
    else if (media.addListener) media.addListener(handler);
  }

  window.NaxoraTheme = {
    set: applyMode,
    get: getStoredMode,
    resolve: () => resolveMode(getStoredMode()),
    reset: () => applyMode("dark"),
  };

  document.addEventListener("DOMContentLoaded", () => {
    createFloatingSwitcher();
    connectThemeCards();
    addThemeNavLink();
    applyMode(getStoredMode(), false);
    initSystemListener();
  });
})();
