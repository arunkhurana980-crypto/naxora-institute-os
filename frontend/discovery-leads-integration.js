const form = document.getElementById("part63Form");
const statusEl = document.getElementById("part63Status");
const funnelEl = document.getElementById("part63Funnel");
const journeysEl = document.getElementById("part63Journeys");
const summaryEl = document.getElementById("part63Summary");
const stagesEl = document.getElementById("part63Stages");
const checklistEl = document.getElementById("part63Checklist");

async function safeJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function params() { return new URLSearchParams(new FormData(form)); }

function renderFunnel(funnel = {}) {
  const items = [
    ["Public Profiles", funnel.publicProfiles], ["Comparison Ready", funnel.comparisonReady], ["Enquiries", funnel.enquiries], ["Consented", funnel.consentedEnquiries],
    ["CRM Leads", funnel.crmLeads], ["Open Follow-ups", funnel.openFollowups], ["Converted", funnel.convertedAdmissions], ["Lead→Conversion", `${funnel.leadToConversionRate || 0}%`]
  ];
  funnelEl.innerHTML = items.map(([label, value]) => `<div class="part63-stat"><b>${escapeHtml(value ?? 0)}</b><span>${escapeHtml(label)}</span></div>`).join("");
}

function renderStages(stages = []) {
  stagesEl.innerHTML = stages.map((stage, index) => `<article class="part63-stage"><b>${index + 1}. ${escapeHtml(stage.label)}</b><p>${escapeHtml(stage.purpose)}</p><a class="part63-mini-link dark" href="${escapeHtml(stage.route)}">Open ${escapeHtml(stage.owner)}</a></article>`).join("");
}

function renderJourneys(rows = []) {
  if (!rows.length) { journeysEl.innerHTML = `<div class="part63-empty">No connected journeys found. Pehle Part 59 profile, Part 60 enquiry ya Part 58 CRM lead test karo.</div>`; return; }
  journeysEl.innerHTML = rows.map((row) => {
    const tags = [row.city, row.distanceLabel, row.verified ? "Verified" : "Unverified", row.demoLabel, ...(row.courses || []).slice(0, 2)].filter(Boolean);
    return `<article class="part63-journey"><span class="part63-health ${escapeHtml(row.journeyHealth)}">${escapeHtml(row.journeyHealth)}</span><h3>${escapeHtml(row.name)}</h3><p>${escapeHtml(row.tagline || "Public profile available.")}</p><div class="part63-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div><div class="part63-metrics"><div><b>${escapeHtml(row.enquiryCount)}</b><span>Enquiries</span></div><div><b>${escapeHtml(row.crmLeadCount)}</b><span>CRM Leads</span></div><div><b>${escapeHtml(row.convertedCount)}</b><span>Converted</span></div></div><p><b>Next:</b> ${escapeHtml(row.nextAction)}</p><div class="part63-actions"><a class="part63-mini-link dark" href="${escapeHtml(row.profileUrl)}">Profile</a><a class="part63-mini-link blue" href="${escapeHtml(row.compareUrl)}">Compare</a><a class="part63-mini-link" href="${escapeHtml(row.callbackUrl)}">Callback</a><a class="part63-mini-link dark" href="${escapeHtml(row.crmUrl)}">CRM</a></div></article>`;
  }).join("");
}

async function loadStatus() { try { const data = await safeJson("/api/part63/status"); statusEl.innerHTML = `<p><b>${escapeHtml(data.part)}</b></p><p>Status: <span class="part63-badge">${escapeHtml(data.status)}</span></p><p>DB Mode: <span class="part63-badge">${escapeHtml(data.dbMode)}</span></p><p>${escapeHtml(data.purpose)}</p>`; } catch (error) { statusEl.textContent = error.message; } }
async function loadConfig() { try { const data = await safeJson("/api/part63/config"); renderStages(data.stages || []); } catch (error) { stagesEl.innerHTML = `<div class="part63-empty">${escapeHtml(error.message)}</div>`; } }
async function loadChecklist() { try { const data = await safeJson("/api/part63/checklist"); checklistEl.innerHTML = (data.checklist || []).map((item) => `<li>${escapeHtml(item)}</li>`).join(""); } catch (error) { checklistEl.innerHTML = `<li>${escapeHtml(error.message)}</li>`; } }
async function loadJourney() { journeysEl.innerHTML = `<div class="part63-empty">Loading integrated journey...</div>`; try { const data = await safeJson(`/api/part63/journey?${params().toString()}`); summaryEl.textContent = `${data.count} institute journey result(s). Funnel updated.`; renderFunnel(data.funnel || {}); renderStages(data.stages || []); renderJourneys(data.institutes || []); } catch (error) { journeysEl.innerHTML = `<div class="part63-empty">${escapeHtml(error.message)}</div>`; } }
form.addEventListener("submit", (event) => { event.preventDefault(); loadJourney(); });
loadStatus(); loadConfig(); loadChecklist(); loadJourney();
