const featuresGrid = document.getElementById("featuresGrid");
const checklist = document.getElementById("checklist");
const featureCount = document.getElementById("featureCount");
const outputBox = document.getElementById("outputBox");
const leadForm = document.getElementById("leadForm");
const loadDemoBtn = document.getElementById("loadDemoBtn");
const runVaniBtn = document.getElementById("runVaniBtn");
const vaniCommand = document.getElementById("vaniCommand");

async function apiJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Accept": "application/json", "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || `Request failed ${response.status}`);
  return data;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function formLead() {
  const fd = new FormData(leadForm);
  const lead = {};
  for (const [key, value] of fd.entries()) lead[key] = value;
  const role = lead.role || "counsellor";
  delete lead.role;
  lead.consentAccepted = true;
  return { role, lead };
}

function show(data) {
  outputBox.textContent = JSON.stringify(data, null, 2);
}

async function loadStatic() {
  const [features, checks] = await Promise.all([
    apiJson("/api/part71/features"),
    apiJson("/api/part71/checklist")
  ]);
  featureCount.textContent = String(features.count || features.features.length);
  featuresGrid.innerHTML = features.features.map((feature) => `
    <article class="copilot-card">
      <span class="copilot-pill">${escapeHtml(feature.id)}</span>
      <h3>${escapeHtml(feature.title)}</h3>
      <p><strong>Problem solved:</strong> ${escapeHtml(feature.problemSolved)}</p>
      <p><strong>Owner benefit:</strong> ${escapeHtml(feature.ownerBenefit)}</p>
      <p><strong>Parent benefit:</strong> ${escapeHtml(feature.parentBenefit)}</p>
    </article>
  `).join("");
  checklist.innerHTML = checks.checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

const actionMap = {
  reply: "/api/part71/reply-draft",
  priority: "/api/part71/lead-priority",
  followup: "/api/part71/followup-suggestions",
  courses: "/api/part71/course-recommendations",
  conversation: "/api/part71/conversation-support"
};

document.querySelectorAll("[data-action]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const payload = formLead();
    if (btn.dataset.action === "conversation") payload.message = payload.lead.message || "Parent fee and demo class pooch raha hai";
    outputBox.textContent = "Generating safe preview...";
    try {
      const data = await apiJson(actionMap[btn.dataset.action], { method: "POST", body: JSON.stringify(payload) });
      show(data);
    } catch (error) {
      show({ success: false, error: error.message });
    }
  });
});

runVaniBtn?.addEventListener("click", async () => {
  const payload = formLead();
  payload.command = vaniCommand.value;
  outputBox.textContent = "Running VANI admission command...";
  try {
    const data = await apiJson("/api/part71/vani/command", { method: "POST", body: JSON.stringify(payload) });
    show(data);
  } catch (error) {
    show({ success: false, error: error.message });
  }
});

loadDemoBtn?.addEventListener("click", async () => {
  outputBox.textContent = "Loading Part 71 demo...";
  try { show(await apiJson("/api/part71/demo")); }
  catch (error) { show({ success: false, error: error.message }); }
});

loadStatic().catch((error) => {
  featuresGrid.innerHTML = `<article class="copilot-card"><h3>Load error</h3><p>${escapeHtml(error.message)}</p></article>`;
});
