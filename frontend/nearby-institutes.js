const form = document.getElementById("part61SearchForm");
const statusEl = document.getElementById("part61Status");
const metaEl = document.getElementById("part61Meta");
const resultsEl = document.getElementById("part61Results");
const summaryEl = document.getElementById("part61ResultSummary");
const checklistEl = document.getElementById("part61Checklist");
const useLocationBtn = document.getElementById("useMyLocation");
const resetBtn = document.getElementById("resetPart61");

async function safeJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function renderMeta(data = {}) {
  metaEl.innerHTML = [
    ["Results", data.count ?? 0],
    ["Radius", `${data.radiusKm || 25} km`],
    ["Mode", data.mode || "mock"],
    ["Origin", data.origin?.label || data.filters?.city || "City/filter"]
  ].map(([label, value]) => `<div class="part61-stat"><b>${escapeHtml(value)}</b><span>${escapeHtml(label)}</span></div>`).join("");
}

function renderInstitutes(rows = []) {
  if (!rows.length) {
    resultsEl.innerHTML = `<div class="part61-empty">No institutes found. City/course filter thoda broad karke try karo.</div>`;
    return;
  }
  resultsEl.innerHTML = rows.map((row) => {
    const tags = [row.city, row.distanceLabel, row.verified ? "Verified" : "Unverified", ...(row.courseSummary || []).slice(0, 3)].filter(Boolean);
    return `
      <article class="part61-result-card">
        <div>
          <h3>${escapeHtml(row.name)}</h3>
          <p>${escapeHtml(row.tagline || row.description || "Institute profile available.")}</p>
          <p><b>Area:</b> ${escapeHtml([row.area, row.city, row.state].filter(Boolean).join(", "))}</p>
          <p><b>Status:</b> <span class="${row.verified ? "part61-verified" : "part61-not-verified"}">${escapeHtml(row.verificationLabel || (row.verified ? "Verified" : "Unverified"))}</span></p>
          <div class="part61-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
        </div>
        <div class="part61-result-actions">
          <a class="part61-mini-link gold" href="${escapeHtml(row.callbackUrl)}">Request Callback</a>
          <a class="part61-mini-link" href="${escapeHtml(row.profileUrl)}">View Profile</a>
          <a class="part61-mini-link" href="/api/part61/profile/${encodeURIComponent(row.profileId || row.slug)}" target="_blank">API Detail</a>
        </div>
      </article>
    `;
  }).join("");
}

function getSearchUrl() {
  const params = new URLSearchParams(new FormData(form));
  if (!form.verifiedOnly.checked) params.delete("verifiedOnly");
  if (!form.lat.value || !form.lng.value) {
    params.delete("lat");
    params.delete("lng");
  }
  return `/api/part61/nearby?${params.toString()}`;
}

async function loadStatus() {
  try {
    const data = await safeJson("/api/part61/status");
    statusEl.innerHTML = `
      <p><b>${escapeHtml(data.part)}</b></p>
      <p>Status: <span class="part61-badge">${escapeHtml(data.status)}</span></p>
      <p>DB Mode: <span class="part61-badge">${escapeHtml(data.dbMode)}</span></p>
      <p>${escapeHtml(data.purpose)}</p>
    `;
  } catch (error) {
    statusEl.textContent = error.message;
  }
}

async function loadChecklist() {
  try {
    const data = await safeJson("/api/part61/checklist");
    checklistEl.innerHTML = (data.checklist || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  } catch (error) {
    checklistEl.innerHTML = `<li>${escapeHtml(error.message)}</li>`;
  }
}

async function searchNearby() {
  resultsEl.innerHTML = `<div class="part61-empty">Searching nearby institutes...</div>`;
  try {
    const data = await safeJson(getSearchUrl());
    summaryEl.textContent = `${data.count} institute(s) found. Filters: city=${data.filters?.city || "any"}, course=${data.filters?.course || "any"}.`;
    renderMeta(data);
    renderInstitutes(data.institutes || []);
  } catch (error) {
    resultsEl.innerHTML = `<div class="part61-empty">${escapeHtml(error.message)}</div>`;
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  searchNearby();
});

resetBtn.addEventListener("click", () => {
  form.reset();
  form.city.value = "Delhi";
  form.radiusKm.value = "25";
  form.lat.value = "";
  form.lng.value = "";
  searchNearby();
});

useLocationBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("Browser geolocation supported nahi hai. City filter use karo.");
    return;
  }
  navigator.geolocation.getCurrentPosition((position) => {
    form.lat.value = position.coords.latitude;
    form.lng.value = position.coords.longitude;
    summaryEl.textContent = "Location selected. Search Nearby dabao.";
    searchNearby();
  }, () => {
    alert("Location permission nahi mili. City filter use karo.");
  }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
});

loadStatus();
loadChecklist();
searchNearby();
