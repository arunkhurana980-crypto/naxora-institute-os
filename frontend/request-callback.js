const form = document.getElementById("part60Form");
const messageEl = document.getElementById("part60Message");
const statusEl = document.getElementById("part60Status");
const analyticsEl = document.getElementById("part60Analytics");
const listEl = document.getElementById("part60List");
const refreshBtn = document.getElementById("refreshPart60");
const profileIdInput = document.getElementById("profileIdInput");

function setMsg(text, type = "") {
  messageEl.textContent = text;
  messageEl.className = `part60-message ${type}`.trim();
}

async function safeJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.errors?.join(" ") || "Request failed");
  return data;
}

function getQueryParam(name) {
  const value = new URLSearchParams(window.location.search).get(name);
  return value ? value.trim() : "";
}

function applyQueryDefaults() {
  const profileId = getQueryParam("profileId") || getQueryParam("slug");
  const course = getQueryParam("course");
  if (profileId && profileIdInput) profileIdInput.value = profileId;
  if (course && form?.courseInterest) form.courseInterest.value = course;
}

async function loadStatus() {
  try {
    const data = await safeJson("/api/part60/status");
    statusEl.innerHTML = `
      <p><b>${data.part}</b></p>
      <p>Status: <span class="part60-badge">${data.status}</span></p>
      <p>DB Mode: <span class="part60-badge">${data.dbMode}</span></p>
      <p>${data.purpose}</p>
    `;
  } catch (error) {
    statusEl.textContent = error.message;
  }
}

function renderAnalytics(analytics = {}) {
  analyticsEl.innerHTML = [
    ["Total", analytics.total || 0],
    ["Open", analytics.open || 0],
    ["Contacted", analytics.contacted || 0],
    ["Converted", analytics.converted || 0]
  ].map(([label, value]) => `<div class="part60-stat"><b>${value}</b><span>${label}</span></div>`).join("");
}

function renderList(rows = []) {
  if (!rows.length) {
    listEl.textContent = "No callback/enquiry requests yet.";
    return;
  }
  listEl.innerHTML = rows.slice(0, 10).map((row) => `
    <article class="part60-item">
      <h3>${row.studentName || "Student"} <span class="part60-badge">${row.status || "new"}</span></h3>
      <p><b>Course:</b> ${row.courseInterest || "-"}</p>
      <p><b>Phone:</b> ${row.phone || "-"} · <b>Timing:</b> ${row.preferredTiming || "-"}</p>
      <p><b>Profile:</b> ${row.profileName || row.profileId || "-"}</p>
      <p><b>Created:</b> ${row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}</p>
    </article>
  `).join("");
}

async function loadEnquiries() {
  try {
    const data = await safeJson("/api/part60/enquiries");
    renderAnalytics(data.analytics || {});
    renderList(data.enquiries || []);
  } catch (error) {
    listEl.textContent = error.message;
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMsg("Saving enquiry...", "");
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  payload.consentAccepted = formData.get("consentAccepted") === "on";
  try {
    const data = await safeJson("/api/part60/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setMsg(`${data.message} Request ID: ${data.request?.requestId || "saved"}`, "success");
    form.reset();
    applyQueryDefaults();
    await loadEnquiries();
  } catch (error) {
    setMsg(error.message, "error");
  }
});

refreshBtn?.addEventListener("click", loadEnquiries);
applyQueryDefaults();
loadStatus();
loadEnquiries();
