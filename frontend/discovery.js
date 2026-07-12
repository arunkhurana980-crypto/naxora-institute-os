const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");
const savedUser = JSON.parse(localStorage.getItem("naxora_user") || "null");
const profilePill = document.querySelector("#profilePill");
const adminZone = document.querySelector("#adminZone");
const publicListings = document.querySelector("#publicListings");
const publicMessage = document.querySelector("#publicMessage");
const myListings = document.querySelector("#myListings");
const leadList = document.querySelector("#leadList");
const discoveryStats = document.querySelector("#discoveryStats");
const leadDialog = document.querySelector("#leadDialog");
const leadForm = document.querySelector("#publicLeadForm");
const listingForm = document.querySelector("#listingForm");
const listingId = document.querySelector("#listingId");
const listingFormTitle = document.querySelector("#listingFormTitle");

profilePill.textContent = token ? `${savedUser?.name || "User"} • Discovery` : "Student Search";
if (!token) adminZone.style.display = "none";
function authHeaders(extra = {}) { return { Authorization: `Bearer ${token}`, ...extra }; }
function getValue(id) { return document.querySelector(`#${id}`).value.trim(); }
function escapeHtml(value = "") { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function label(value="") { return String(value).replaceAll("_", " "); }
function coursesText(value) { return Array.isArray(value) ? value.join(", ") : String(value || ""); }
function splitCsv(value) { return String(value || "").split(",").map(x => x.trim()).filter(Boolean); }

function renderInstituteCard(item, admin = false) {
  const courses = (item.courses || []).slice(0, 6).map(c => `<span>${escapeHtml(c)}</span>`).join("");
  return `<article class="institute-card" data-id="${item.id}">
    <div class="verified">${item.verifiedByNaxora ? "✅ NAXORA Verified" : "NAXORA Partner"}</div>
    <h3>${escapeHtml(item.instituteName)}</h3>
    <p>${escapeHtml(item.tagline || item.description || "Premium institute profile")}</p>
    <div class="institute-meta"><span class="pill">📍 ${escapeHtml(item.area || "Area")} • ${escapeHtml(item.city || "City")}</span><span class="pill">${escapeHtml(label(item.mode))}</span><span class="pill">⭐ ${Number(item.rating || 4.5).toFixed(1)}</span></div>
    <div class="course-list">${courses || "<span>Courses not set</span>"}</div>
    <div class="card-line"><span>Fees</span><b>${escapeHtml(item.feesRange || "Contact")}</b></div>
    <div class="card-line"><span>Leads</span><b>${item.leadCount || 0}</b></div>
    <div class="form-actions" style="margin-top:14px">
      ${admin ? `<button class="edit-btn" data-action="edit-listing">Edit</button><button class="edit-btn" data-action="delete-listing">Delete</button>` : `<button class="primary" data-action="send-lead">Send Enquiry</button>`}
      <a class="ghost-btn" href="tel:${escapeHtml(item.phone || "")}">Call</a>
      <a class="ghost-btn" href="https://wa.me/${escapeHtml((item.whatsapp || item.phone || "").replace(/\D/g,""))}" target="_blank">WhatsApp</a>
    </div>
  </article>`;
}

async function searchPublicListings(event) {
  if (event) event.preventDefault();
  publicMessage.textContent = "Institutes loading…";
  try {
    const params = new URLSearchParams();
    const city = getValue("searchCity"), area = getValue("searchArea"), course = getValue("searchCourse"), mode = getValue("searchMode");
    if (city) params.set("city", city); if (area) params.set("area", area); if (course) params.set("course", course); if (mode) params.set("mode", mode);
    const response = await fetch(`${API}/discovery/search?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Search failed");
    publicListings.innerHTML = (data.listings || []).length ? data.listings.map(x => renderInstituteCard(x)).join("") : `<p class="empty-state">Is area/course me abhi NAXORA partner institute nahi mila.</p>`;
    publicMessage.textContent = `✅ ${data.total || 0} NAXORA partner institutes found.`;
  } catch (error) { publicMessage.textContent = `❌ ${error.message}`; }
}

function readListingPayload() {
  return {
    instituteName: getValue("instituteName"), tagline: getValue("tagline"), phone: getValue("phone"), whatsapp: getValue("whatsapp"), city: getValue("city"), area: getValue("area"), district: getValue("district"), state: getValue("state"), address: getValue("address"), courses: splitCsv(getValue("courses")), classLevels: splitCsv(getValue("classLevels")), feesRange: getValue("feesRange"), mode: getValue("mode"), facilities: splitCsv(getValue("facilities")), description: getValue("description"), subscriptionStatus: getValue("subscriptionStatus"), isPublished: getValue("isPublished") === "true",
  };
}
function fillListing(item) {
  listingId.value = item.id; listingFormTitle.textContent = "Edit Institute Listing";
  ["instituteName","tagline","phone","whatsapp","city","area","district","state","address","feesRange","mode","description","subscriptionStatus"].forEach(id => { document.querySelector(`#${id}`).value = item[id] ?? ""; });
  document.querySelector("#courses").value = coursesText(item.courses); document.querySelector("#classLevels").value = coursesText(item.classLevels); document.querySelector("#facilities").value = coursesText(item.facilities); document.querySelector("#isPublished").value = String(item.isPublished !== false); window.scrollTo({top:0,behavior:"smooth"});
}
function clearListing() { listingId.value = ""; listingForm.reset(); listingFormTitle.textContent = "Create Institute Listing"; document.querySelector("#state").value = "Haryana"; }

async function loadMyListings() {
  if (!token) return;
  try {
    const response = await fetch(`${API}/discovery/my-listings`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Listings load failed");
    myListings.innerHTML = (data.listings || []).length ? data.listings.map(x => renderInstituteCard(x, true)).join("") : `<p class="empty-state">Abhi listing nahi hai. Upar se apna institute listing publish karo.</p>`;
    renderStats(data);
  } catch (error) { myListings.innerHTML = `<p class="empty-state">❌ ${escapeHtml(error.message)}</p>`; }
}
function renderStats(data) {
  const cards = [{t:"Listings",v:data.totalListings||0},{t:"Total Leads",v:data.totalLeads||0},{t:"New",v:data.newLeads||0},{t:"Converted",v:data.convertedLeads||0}];
  discoveryStats.innerHTML = cards.map(c => `<div class="mini-stat"><span>${c.t}</span><b>${c.v}</b></div>`).join("");
}
async function saveListing(event) {
  event.preventDefault();
  try {
    const id = listingId.value; const payload = readListingPayload();
    const response = await fetch(id ? `${API}/discovery/my-listings/${id}` : `${API}/discovery/my-listings`, { method: id ? "PUT" : "POST", headers: authHeaders({"Content-Type":"application/json"}), body: JSON.stringify(payload) });
    const data = await response.json(); if (!response.ok) throw new Error(data.message || "Listing save failed");
    publicMessage.textContent = `✅ ${data.message}`; clearListing(); await loadMyListings(); await searchPublicListings();
  } catch (error) { publicMessage.textContent = `❌ ${error.message}`; }
}
async function deleteListing(id) { if (!confirm("Delete listing?")) return; const r = await fetch(`${API}/discovery/my-listings/${id}`, {method:"DELETE", headers:authHeaders()}); const d = await r.json(); if (!r.ok) throw new Error(d.message || "Delete failed"); await loadMyListings(); await searchPublicListings(); }

async function loadLeads() {
  if (!token) return;
  try {
    const params = new URLSearchParams(); const search = getValue("leadSearch"), status = getValue("leadStatus"); if (search) params.set("search", search); if (status) params.set("status", status);
    const response = await fetch(`${API}/discovery/my-leads?${params.toString()}`, { headers: authHeaders() });
    const data = await response.json(); if (!response.ok) throw new Error(data.message || "Leads load failed");
    renderStats(data); const leads = data.leads || [];
    leadList.innerHTML = leads.length ? leads.map(lead => `<article class="lead-item" data-id="${lead.id}"><h4>${escapeHtml(lead.studentName)} • ${escapeHtml(lead.interestedCourse)}</h4><p>📞 ${escapeHtml(lead.phone)} • 📍 ${escapeHtml(lead.area || "")} ${escapeHtml(lead.city || "")} • ${escapeHtml(lead.classLevel || "")}</p><p>${escapeHtml(lead.message || "No message")}</p><div class="lead-actions"><button data-status="contacted">Contacted</button><button data-status="demo_booked">Demo</button><button data-status="converted">Converted</button><button data-status="lost">Lost</button></div></article>`).join("") : `<p class="empty-state">Abhi discovery leads nahi hain.</p>`;
  } catch (error) { leadList.innerHTML = `<p class="empty-state">❌ ${escapeHtml(error.message)}</p>`; }
}
async function updateLeadStatus(id, status) {
  const response = await fetch(`${API}/discovery/my-leads/${id}/status`, { method:"PATCH", headers:authHeaders({"Content-Type":"application/json"}), body: JSON.stringify({ status, leadTemperature: status === "converted" ? "hot" : "warm" }) });
  const data = await response.json(); if (!response.ok) throw new Error(data.message || "Status update failed"); await loadLeads();
}
function openLeadDialog(item) {
  document.querySelector("#leadInstituteId").value = item.id; document.querySelector("#leadDialogTitle").textContent = `Enquiry: ${item.instituteName}`; document.querySelector("#studentCourse").value = (item.courses || [""])[0] || ""; leadDialog.showModal();
}
async function submitPublicLead(event) {
  event.preventDefault();
  const payload = { instituteListingId: getValue("leadInstituteId"), studentName: getValue("studentName"), parentName: getValue("parentName"), phone: getValue("studentPhone"), email: getValue("studentEmail"), city: getValue("studentCity"), area: getValue("studentArea"), classLevel: getValue("studentClass"), interestedCourse: getValue("studentCourse"), message: getValue("studentMessage") };
  try {
    const response = await fetch(`${API}/discovery/leads`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) });
    const data = await response.json(); if (!response.ok) throw new Error(data.message || "Lead submit failed");
    document.querySelector("#leadFormMessage").textContent = `✅ ${data.message}`; leadForm.reset(); setTimeout(() => leadDialog.close(), 900); await searchPublicListings(); if (token) await loadLeads();
  } catch (error) { document.querySelector("#leadFormMessage").textContent = `❌ ${error.message}`; }
}

let currentPublic = [];
async function capturePublicListings() { await searchPublicListings(); }

document.querySelector("#searchForm").addEventListener("submit", searchPublicListings);
listingForm?.addEventListener("submit", saveListing);
document.querySelector("#clearListingBtn")?.addEventListener("click", clearListing);
document.querySelector("#loadLeadsBtn")?.addEventListener("click", loadLeads);
leadForm.addEventListener("submit", submitPublicLead);
document.querySelector("#closeLeadDialog").addEventListener("click", () => leadDialog.close());
document.querySelector("#logoutBtn").addEventListener("click", () => { localStorage.clear(); window.location.href = "index.html"; });

publicListings.addEventListener("click", async (event) => { const card = event.target.closest(".institute-card"); if (!card) return; const id = card.dataset.id; if (event.target.dataset.action === "send-lead") { const response = await fetch(`${API}/discovery/search`); const data = await response.json(); const item = (data.listings || []).find(x => x.id === id) || { id, instituteName: "Institute", courses: [] }; openLeadDialog(item); } });
myListings.addEventListener("click", async (event) => { const card = event.target.closest(".institute-card"); if (!card) return; const id = card.dataset.id; if (event.target.dataset.action === "edit-listing") { const response = await fetch(`${API}/discovery/my-listings`, { headers: authHeaders() }); const data = await response.json(); const item = (data.listings || []).find(x => x.id === id); if (item) fillListing(item); } if (event.target.dataset.action === "delete-listing") { try { await deleteListing(id); } catch(e) { alert(e.message); } } });
leadList.addEventListener("click", async (event) => { const button = event.target.closest("button[data-status]"); if (!button) return; const id = button.closest(".lead-item").dataset.id; try { await updateLeadStatus(id, button.dataset.status); } catch(e) { alert(e.message); } });

searchPublicListings(); loadMyListings(); loadLeads();
