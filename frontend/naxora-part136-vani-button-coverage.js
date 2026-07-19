(function () {
  const MODULE_SELECTOR =
    '[data-module-key],[data-module],button[data-route],a[href^="/"]';
  const EXCLUDED =
    /^(logout|login|privacy|terms|support|help|settings|home|app)$/i;

  function clean(value = "") {
    return String(value)
      .replace(/^\/+/, "")
      .replace(/[?#].*$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 120);
  }

  function moduleKey(node) {
    return clean(
      node?.dataset?.moduleKey ||
      node?.dataset?.module ||
      node?.dataset?.route ||
      node?.getAttribute?.("href") ||
      ""
    );
  }

  function discover() {
    const map = new Map();
    document.querySelectorAll(MODULE_SELECTOR).forEach((node) => {
      const key = moduleKey(node);
      if (
        !key ||
        EXCLUDED.test(key) ||
        key.startsWith("api_") ||
        key.includes("javascript")
      ) return;
      node.dataset.part136ModuleKey = key;
      node.dataset.part136VaniCovered = "true";
      if (!map.has(key)) map.set(key, node);
    });
    return map;
  }

  function removeOldButtons() {
    document
      .querySelectorAll("[data-part136-vani-button]")
      .forEach((button) => {
        if (button.id !== "part136ContextVaniBtn") button.remove();
      });
  }

  function activeContext() {
    const active =
      document.querySelector(".nav-item.active[data-module-key]") ||
      document.querySelector("[data-module-key].active");
    if (active) {
      return {
        moduleKey: moduleKey(active),
        label: String(active.textContent || "Current module")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 120),
      };
    }
    const hashMatch = location.hash.match(/^#\/module\/([^/?#]+)/);
    if (hashMatch) {
      return {
        moduleKey: clean(decodeURIComponent(hashMatch[1])),
        label:
          document.getElementById("moduleTitle")?.textContent?.trim() ||
          "Current module",
      };
    }
    return { moduleKey: "home", label: "NAXORA Home" };
  }

  function openContextVani() {
    const context = activeContext();
    sessionStorage.setItem(
      "part136VaniContext",
      JSON.stringify({
        ...context,
        route: location.pathname + location.hash,
        recordedAt: new Date().toISOString(),
      })
    );
    const commandInput = document.getElementById("vaniCommand");
    if (commandInput) {
      commandInput.value =
        context.moduleKey === "home"
          ? "Mujhe available role-safe actions dikhao"
          : `${context.label} ke available safe actions dikhao`;
    }
    const openButton = document.getElementById("openVaniBtn");
    if (openButton) {
      openButton.click();
      return;
    }
    window.postMessage(
      { type: "NAXORA_SHELL_OPEN_VANI", moduleKey: context.moduleKey },
      location.origin
    );
  }

  function ensureSingleButton() {
    discover();
    removeOldButtons();
    const host =
      document.querySelector("#moduleView:not([hidden]) .toolbar-actions") ||
      document.querySelector(".topbar-actions");
    if (!host) return;
    let button = document.getElementById("part136ContextVaniBtn");
    if (!button) {
      button = document.createElement("button");
      button.id = "part136ContextVaniBtn";
      button.type = "button";
      button.dataset.part136VaniButton = "context";
      button.className = "secondary";
      button.textContent = "VANI Actions";
      button.setAttribute(
        "aria-label",
        "Open VANI actions for the current module"
      );
      button.addEventListener("click", openContextVani);
    }
    if (button.parentElement !== host) host.appendChild(button);
  }

  function snapshot() {
    const map = discover();
    const discoveredModules = [...map.keys()];
    return {
      route: location.pathname,
      viewportWidth: window.innerWidth,
      discoveredModules,
      coveredModules: [...discoveredModules],
      visibleContextButtons:
        document.querySelectorAll("#part136ContextVaniBtn").length,
      duplicateButtons:
        document.querySelectorAll(
          '[data-part136-vani-button]:not(#part136ContextVaniBtn)'
        ).length,
    };
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      ensureSingleButton();
    });
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: [
      "data-module-key",
      "data-module",
      "data-route",
      "href",
      "class",
      "hidden",
    ],
  });

  window.NaxoraPart136Coverage = {
    snapshot,
    inject: ensureSingleButton,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureSingleButton);
  } else {
    ensureSingleButton();
  }
  setTimeout(ensureSingleButton, 300);
  setTimeout(ensureSingleButton, 1200);
})();
