const API = (() => {
  const host = window.location.hostname || "127.0.0.1";
  if (window.location.port === "5000") return `${window.location.origin}/api`;
  return `http://${host}:5000/api`;
})();

const token = localStorage.getItem("token");
const msg = document.getElementById("pitchMessage");
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

function setMessage(text, danger = false){
  msg.textContent = text || "";
  msg.style.color = danger ? "#fca5a5" : "#86efac";
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

function renderStats(dashboard, roi){
  document.getElementById("pitchStats").innerHTML = [
    ["Target", dashboard.target],
    ["Recommended", dashboard.recommendedPrice],
    ["Bundle Offer", dashboard.bundleOffer],
    ["ROI Multiple", `${roi.roiMultiple}x`]
  ].map(([label, value]) => `<div class="pitch-card"><span>${label}</span><strong>${value}</strong></div>`).join("");
}

function renderRoi(roi){
  document.getElementById("roiResult").innerHTML = `
    <div class="section-head"><h2>Estimated Value</h2><p>Client ko money proof simple language me dikhao.</p></div>
    <div class="big-money">${money(roi.monthlyBenefit)}</div>
    <p class="roi-line"><b>Net gain:</b> ${money(roi.netGain)} / month</p>
    <p class="roi-line"><b>Time saving value:</b> ${money(roi.timeSavingValue)}</p>
    <p class="roi-line"><b>Extra admissions value:</b> ${money(roi.admissionValue)}</p>
    <p class="roi-line"><b>Recovered dues:</b> ${money(roi.missedDuesRecovered)}</p>
    <p class="roi-line">${roi.pitchLine}</p>`;
}

function renderPricing(plans){
  document.getElementById("pricingGrid").innerHTML = plans.map((plan, index) => `
    <div class="pricing-card ${index === 2 || index === 3 ? "featured" : ""}">
      <h3>${plan.plan}</h3>
      <p>${plan.bestFor}</p>
      <div class="price">${money(plan.monthly)}<small>/mo</small></div>
      <p>${plan.pitch}</p>
      <ul>${plan.features.map(f => `<li>${f}</li>`).join("")}</ul>
      <button class="primary small-btn">${plan.cta}</button>
    </div>`).join("");
}

function renderComparison(rows){
  document.getElementById("comparisonList").innerHTML = rows.map(row => `
    <div class="comparison-card">
      <p><b>${row.feature}</b></p>
      <p>❌ ${row.manual}</p>
      <p>✅ ${row.naxora}<br><small>${row.impact}</small></p>
    </div>`).join("");
}

function renderFlow(rows){
  document.getElementById("pitchFlow").innerHTML = rows.map(row => `
    <div class="flow-card">
      <div class="flow-step">${row.step}</div>
      <div><h3>${row.title} <small>• ${row.minutes}</small></h3><p>${row.show}</p></div>
    </div>`).join("");
}

function renderObjections(rows){
  document.getElementById("objections").innerHTML = rows.map(row => `
    <div class="objection-card"><b>${row.objection}</b><p>${row.answer}</p></div>`).join("");
}

function renderLinks(rows){
  document.getElementById("demoLinks").innerHTML = rows.map(row => `
    <a class="demo-link" href="${row.url}">↗ ${row.label}<span>${row.url}</span></a>`).join("");
}

async function loadPitch(){
  try {
    const data = await api("/client-pitch");
    renderStats(data.dashboard, data.roi);
    renderRoi(data.roi);
    renderPricing(data.pricing);
    renderComparison(data.comparison);
    renderFlow(data.dashboard.pitchFlow);
    renderObjections(data.objections);
    renderLinks(data.dashboard.demoLinks);
    setMessage("Part 46 Client Pitch Dashboard loaded successfully.");
  } catch (err) {
    setMessage(`Failed to load client pitch: ${err.message}`, true);
  }
}

document.getElementById("roiForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = Object.fromEntries(new FormData(e.currentTarget).entries());
  try {
    const data = await api("/client-pitch/roi", { method: "POST", body: JSON.stringify(input) });
    renderRoi(data.roi);
    setMessage("ROI updated.");
  } catch (err) {
    setMessage(`ROI error: ${err.message}`, true);
  }
});

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "index.html";
});

loadPitch();
