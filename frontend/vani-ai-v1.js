const commandInput = document.getElementById("commandInput");
const searchBtn = document.getElementById("searchBtn");
const voiceBtn = document.getElementById("voiceBtn");
const clearBtn = document.getElementById("clearBtn");
const demoBtn = document.getElementById("demoBtn");
const historyBtn = document.getElementById("historyBtn");
const answerBox = document.getElementById("answerBox");
const resultsGrid = document.getElementById("resultsGrid");
const commandsGrid = document.getElementById("commandsGrid");
const examplesGrid = document.getElementById("examplesGrid");
const historyList = document.getElementById("historyList");
const targetStat = document.getElementById("targetStat");
const modeStat = document.getElementById("modeStat");
const countStat = document.getElementById("countStat");
const speechStatus = document.getElementById("speechStatus");

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

async function getJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Accept": "application/json", "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

function resultCard(row, target) {
  const entries = Object.entries(row).filter(([key]) => key !== "_id").slice(0, 8);
  return `<article class="vani-card"><h3>${escapeHtml(row.name || row.studentName || row.title || row.id || target)}</h3>${entries.map(([key, value]) => `<p><strong>${escapeHtml(key)}:</strong> ${escapeHtml(value)}</p>`).join("")}</article>`;
}

function renderSearch(data) {
  const target = data.detectedTarget?.target || "students";
  targetStat.textContent = target;
  modeStat.textContent = data.mode || "safe-demo";
  countStat.textContent = String(data.results?.length || 0);
  answerBox.textContent = data.responseText || "VANI response ready.";
  resultsGrid.innerHTML = (data.results || []).length
    ? data.results.map((row) => resultCard(row, target)).join("")
    : '<article class="vani-card"><h3>No result</h3><p>Command simple karke try karo: pending fees dikhao, Rahul student search karo, aaj absent students dikhao.</p></article>';
}

async function runSearch(command) {
  const clean = String(command || commandInput.value || "").trim();
  if (!clean) {
    answerBox.innerHTML = '<span class="vani-error">Pehle command likho ya speak button dabao.</span>';
    return;
  }
  answerBox.textContent = "VANI search kar rahi hai...";
  resultsGrid.innerHTML = "";
  const data = await getJson(`/api/part69/search?q=${encodeURIComponent(clean)}`);
  renderSearch(data);
  await loadHistory();
}

async function loadCommands() {
  const data = await getJson("/api/part69/commands");
  commandsGrid.innerHTML = data.commands.map((item) => `
    <article class="vani-card">
      <h3>${escapeHtml(item.title)}</h3>
      <p><strong>Target:</strong> ${escapeHtml(item.target)}</p>
      <p><strong>Route:</strong> ${escapeHtml(item.route)}</p>
      <p>${escapeHtml(item.examples[0])}</p>
    </article>
  `).join("");
  const examples = data.commands.flatMap((item) => item.examples.map((example) => ({ example, title: item.title }))).slice(0, 10);
  examplesGrid.innerHTML = examples.map((item) => `<button class="vani-chip" type="button" data-command="${escapeHtml(item.example)}"><strong>${escapeHtml(item.title)}:</strong><br>${escapeHtml(item.example)}</button>`).join("");
  examplesGrid.querySelectorAll("[data-command]").forEach((btn) => {
    btn.addEventListener("click", () => {
      commandInput.value = btn.dataset.command;
      runSearch(btn.dataset.command).catch(showError);
    });
  });
}

async function loadHistory() {
  const data = await getJson("/api/part69/history");
  historyList.innerHTML = data.history.length ? data.history.slice(0, 8).map((row) => `
    <div class="vani-history-row">
      <div><strong>${escapeHtml(row.command)}</strong><p>${escapeHtml(row.target)} • ${escapeHtml(row.resultCount)} results • ${escapeHtml(row.mode)}</p></div>
      <small>${escapeHtml(new Date(row.createdAt).toLocaleString())}</small>
    </div>
  `).join("") : '<div class="vani-history-row"><p>No VANI history yet.</p></div>';
}

function showError(error) {
  answerBox.innerHTML = `<span class="vani-error">${escapeHtml(error.message)}. Deploy ke baad /api/part69/status check karo.</span>`;
}

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "hi-IN";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  speechStatus.textContent = "Speech: ready";
  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript || "";
    commandInput.value = transcript;
    runSearch(transcript).catch(showError);
  };
  recognition.onerror = () => {
    speechStatus.textContent = "Speech: error";
  };
  recognition.onend = () => {
    voiceBtn.textContent = "🎙️ Speak";
  };
} else {
  speechStatus.textContent = "Speech: not supported";
  voiceBtn.title = "Is browser me Web Speech API supported nahi hai. Text command use karo.";
}

searchBtn?.addEventListener("click", () => runSearch().catch(showError));
clearBtn?.addEventListener("click", () => { commandInput.value = ""; answerBox.textContent = "Command likho ya speak button dabao."; resultsGrid.innerHTML = ""; });
voiceBtn?.addEventListener("click", () => {
  if (!recognition) {
    answerBox.textContent = "Is browser me speech supported nahi hai. Text command use karo.";
    return;
  }
  voiceBtn.textContent = "Listening...";
  recognition.start();
});
demoBtn?.addEventListener("click", async () => {
  answerBox.textContent = "Demo run ho raha hai...";
  const data = await getJson("/api/part69/demo");
  const first = data.samples?.[0];
  if (first) renderSearch(first);
  await loadHistory();
});
historyBtn?.addEventListener("click", () => loadHistory().catch(showError));

loadCommands().then(loadHistory).catch(showError);
