const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const personaGrid = document.querySelector("#personaGrid");
const metrics = document.querySelector("#metrics");
const walkthroughList = document.querySelector("#walkthroughList");
const demoMessage = document.querySelector("#demoMessage");

function renderMetrics(data) {
  metrics.innerHTML = data.pitchCards.map((card) => `
    <article class="stat-card">
      <div class="stat-icon">${card.icon}</div>
      <h3>${card.label}</h3>
      <div class="stat-value">${card.value}</div>
      <p class="stat-label">Sales demo data</p>
    </article>
  `).join("");
}

function renderPersonas(personas) {
  personaGrid.innerHTML = personas.map((persona) => `
    <article class="persona-card">
      <div class="persona-top">
        <div class="persona-icon">${persona.icon}</div>
        <div>
          <h3>${persona.title}</h3>
          <p class="mini">${persona.email}</p>
        </div>
      </div>
      <p>${persona.description}</p>
      <div class="persona-pages">${persona.primaryPages.map((page) => `<span>${page}</span>`).join("")}</div>
      <p><b>Best for:</b> ${persona.bestFor}</p>
      <button class="demo-login-btn" data-persona="${persona.id}">Start ${persona.title}</button>
    </article>
  `).join("");
}

function renderWalkthrough(steps) {
  walkthroughList.innerHTML = steps.map((step) => `
    <div class="walk-step">
      <div class="step-number">${step.step}</div>
      <div>
        <h3>${step.title} • ${step.duration}</h3>
        <p>${step.script}</p>
      </div>
      <a href="${step.openPage.replace('/app/', '')}">Open</a>
    </div>
  `).join("");
}

async function loadDemoMode() {
  demoMessage.textContent = "Demo mode loading…";
  try {
    const [personaRes, walkRes] = await Promise.all([
      fetch(`${API}/demo-mode/personas`),
      fetch(`${API}/demo-mode/walkthrough`),
    ]);
    const personaData = await personaRes.json();
    const walkData = await walkRes.json();
    if (!personaRes.ok || !walkRes.ok) throw new Error("Demo mode API load failed");
    renderMetrics(personaData.metrics);
    renderPersonas(personaData.personas);
    renderWalkthrough(walkData.walkthrough);
    demoMessage.textContent = "✅ Sales demo mode ready.";
  } catch (error) {
    demoMessage.textContent = `❌ ${error.message}. Backend check karo: /api/demo-mode/status`;
  }
}

personaGrid.addEventListener("click", async (event) => {
  const btn = event.target.closest(".demo-login-btn");
  if (!btn) return;
  const persona = btn.dataset.persona;
  demoMessage.textContent = "Demo login activating…";
  try {
    const response = await fetch(`${API}/demo-mode/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Demo login failed");
    localStorage.setItem("naxora_token", data.token);
    localStorage.setItem("naxora_user", JSON.stringify(data.user));
    localStorage.setItem("naxora_demo_mode", persona);
    demoMessage.textContent = `✅ ${data.message}`;
    setTimeout(() => { window.location.href = "dashboard.html"; }, 600);
  } catch (error) {
    demoMessage.textContent = `❌ ${error.message}`;
  }
});

document.querySelector("#clearDemoBtn").addEventListener("click", () => {
  localStorage.removeItem("naxora_token");
  localStorage.removeItem("naxora_user");
  localStorage.removeItem("naxora_demo_mode");
  demoMessage.textContent = "Demo session cleared.";
});

loadDemoMode();
