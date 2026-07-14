const formType = document.getElementById("formType");
const transcript = document.getElementById("transcript");
const parseBtn = document.getElementById("parseBtn");
const voiceBtn = document.getElementById("voiceBtn");
const demoBtn = document.getElementById("demoBtn");
const draftBox = document.getElementById("draftBox");
const confirmCheck = document.getElementById("confirmCheck");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const targetsGrid = document.getElementById("targetsGrid");
const activityList = document.getElementById("activityList");
const statusPill = document.getElementById("statusPill");
const voiceNote = document.getElementById("voiceNote");
let currentDraft = null;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch]));
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function postJson(url, body) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok || data.success === false) throw new Error(data.message || `${res.status} ${res.statusText}`);
  return data;
}

function renderDraft(draft) {
  currentDraft = draft;
  confirmCheck.checked = false;
  saveBtn.disabled = true;
  cancelBtn.disabled = false;
  const fields = Object.entries(draft.fields || {}).map(([key, value]) => `
    <div class="field-row"><strong>${escapeHtml(key)}</strong><span>${value === null || value === "" ? "<em class='missing'>missing</em>" : escapeHtml(value)}</span></div>
  `).join("");
  const missing = (draft.missingFields || []).length ? `<p class="missing">Missing required: ${draft.missingFields.map(escapeHtml).join(", ")}</p>` : `<p>All required fields look filled. Please verify before save.</p>`;
  draftBox.innerHTML = `
    <p><b>${escapeHtml(draft.formTitle)}</b> • Confidence ${escapeHtml(draft.confidence)}%</p>
    ${fields}
    ${missing}
    <p class="vani70-note">Draft ID: ${escapeHtml(draft.draftId)}</p>
  `;
}

function renderTargets(targets) {
  targetsGrid.innerHTML = targets.map((target) => `
    <article class="target-card">
      <h3>${escapeHtml(target.title)}</h3>
      <p>${escapeHtml(target.description)}</p>
      <small>Required: ${target.requiredFields.map(escapeHtml).join(", ")}</small>
    </article>
  `).join("");
}

function renderActivity(activity = []) {
  if (!activity.length) {
    activityList.innerHTML = `<div class="vani70-empty">No VANI activity yet.</div>`;
    return;
  }
  activityList.innerHTML = activity.slice(0, 25).map((item) => `
    <div class="activity-item"><b>${escapeHtml(item.type)}</b><br><span>${escapeHtml(item.formType || item.reason || item.mode || "VANI")}</span><br><small>${escapeHtml(item.createdAt)}</small></div>
  `).join("");
}

async function refreshActivity() {
  const data = await getJson("/api/part70/activity");
  renderActivity(data.activity || []);
}

parseBtn.addEventListener("click", async () => {
  parseBtn.disabled = true;
  draftBox.innerHTML = `<div class="vani70-empty">VANI draft bana rahi hai...</div>`;
  try {
    const data = await postJson("/api/part70/parse", { transcript: transcript.value, formType: formType.value });
    renderDraft(data.draft);
    await refreshActivity();
  } catch (error) {
    draftBox.innerHTML = `<div class="vani70-empty">Error: ${escapeHtml(error.message)}</div>`;
  } finally {
    parseBtn.disabled = false;
  }
});

confirmCheck.addEventListener("change", () => {
  saveBtn.disabled = !(confirmCheck.checked && currentDraft);
});

saveBtn.addEventListener("click", async () => {
  if (!currentDraft) return;
  saveBtn.disabled = true;
  try {
    const data = await postJson("/api/part70/confirm-save", { draftId: currentDraft.draftId, confirmed: true, confirmedBy: "Arun demo" });
    draftBox.innerHTML = `<div class="vani70-empty">✅ ${escapeHtml(data.message)}<br>Mode: ${escapeHtml(data.mode)}</div>`;
    currentDraft = null;
    confirmCheck.checked = false;
    cancelBtn.disabled = true;
    await refreshActivity();
  } catch (error) {
    draftBox.innerHTML += `<p class="missing">${escapeHtml(error.message)}</p>`;
  }
});

cancelBtn.addEventListener("click", async () => {
  if (!currentDraft) return;
  await postJson("/api/part70/cancel", { draftId: currentDraft.draftId });
  currentDraft = null;
  confirmCheck.checked = false;
  saveBtn.disabled = true;
  cancelBtn.disabled = true;
  draftBox.innerHTML = `<div class="vani70-empty">Draft cancelled.</div>`;
  await refreshActivity();
});

demoBtn.addEventListener("click", async () => {
  const data = await getJson("/api/part70/demo");
  renderDraft(data.samples[0]);
  await refreshActivity();
});

voiceBtn.addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    voiceNote.textContent = "Is browser me Speech Recognition supported nahi hai. Text command use karo.";
    return;
  }
  const rec = new SpeechRecognition();
  rec.lang = "hi-IN";
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  voiceNote.textContent = "Listening... Hindi/Hinglish me command bolo.";
  rec.onresult = (event) => {
    transcript.value = event.results[0][0].transcript;
    voiceNote.textContent = "Voice captured. Ab Generate Draft dabao.";
  };
  rec.onerror = () => { voiceNote.textContent = "Voice capture failed. Text mode use karo."; };
  rec.start();
});

async function init() {
  try {
    const [status, config, activity] = await Promise.all([getJson("/api/part70/status"), getJson("/api/part70/config"), getJson("/api/part70/activity")]);
    statusPill.textContent = status.status === "active" ? "ACTIVE" : "CHECK";
    formType.innerHTML = (config.formTargets || []).map((target) => `<option value="${escapeHtml(target.id)}">${escapeHtml(target.title)}</option>`).join("");
    renderTargets(config.formTargets || []);
    renderActivity(activity.activity || []);
  } catch (error) {
    statusPill.textContent = "ERROR";
    draftBox.innerHTML = `<div class="vani70-empty">Part 70 load error: ${escapeHtml(error.message)}</div>`;
  }
}
init();
