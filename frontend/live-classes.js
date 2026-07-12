const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");
const savedUser = JSON.parse(localStorage.getItem("naxora_user") || "null");
if (!token) window.location.href = "index.html";

const $ = (id) => document.querySelector(`#${id}`);
const getValue = (id) => ($(id)?.value || "").trim();
const authHeaders = (extra = {}) => ({ Authorization: `Bearer ${token}`, ...extra });
const escapeHtml = (v="") => String(v).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"}[c]));
const splitCsv = (v="") => v.split(",").map(x => x.trim()).filter(Boolean);
const formatDate = (value) => value ? new Date(value).toLocaleString() : "No date";
function dateForInput(value){ if(!value) return ""; const d = new Date(value); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0,16); }

function renderStats(data={}) {
  const cards = [
    ["Total Classes", data.totalClasses || 0],
    ["Live Now", data.liveNow || 0],
    ["Scheduled", data.scheduled || 0],
    ["Comments", data.totalComments || 0],
    ["Live Add-ons", data.activeLiveSubscriptions || 0],
  ];
  $("liveStats").innerHTML = cards.map(([t,v]) => `<div class="mini-stat"><span>${t}</span><b>${v}</b></div>`).join("");
}
function classPayload() {
  return {
    title: getValue("title"), subject: getValue("subject"), topic: getValue("topic"), batchName: getValue("batchName"), courseName: getValue("courseName"), teacherName: getValue("teacherName"), startAt: getValue("startAt"), durationMinutes: Number(getValue("durationMinutes") || 60), platform: getValue("platform"), status: getValue("status"), classUrl: getValue("classUrl"), recordingUrl: getValue("recordingUrl"), resources: splitCsv(getValue("resources")), description: getValue("description"), maxStudents: Number(getValue("maxStudents") || 100), enrolledStudents: Number(getValue("enrolledStudents") || 0), chatEnabled: $("chatEnabled").checked, commentsEnabled: $("commentsEnabled").checked, liveSubscriptionRequired: $("liveSubscriptionRequired").checked,
  };
}
function fillClass(item){
  $("classId").value = item.id; $("classFormTitle").textContent = "Edit Live Class";
  ["title","subject","topic","batchName","courseName","teacherName","durationMinutes","platform","status","classUrl","recordingUrl","description","maxStudents","enrolledStudents"].forEach(id => { $(id).value = item[id] ?? ""; });
  $("startAt").value = dateForInput(item.startAt); $("resources").value = (item.resources || []).join(", "); $("chatEnabled").checked = item.chatEnabled !== false; $("commentsEnabled").checked = item.commentsEnabled !== false; $("liveSubscriptionRequired").checked = item.liveSubscriptionRequired !== false; window.scrollTo({top:0, behavior:"smooth"});
}
function clearClass(){ $("classId").value = ""; $("classForm").reset(); $("durationMinutes").value = 60; $("maxStudents").value = 100; $("enrolledStudents").value = 0; $("chatEnabled").checked = true; $("commentsEnabled").checked = true; $("liveSubscriptionRequired").checked = true; $("classFormTitle").textContent = "Schedule Live Class"; }
function renderClass(item){
  const resources = (item.resources || []).map(x => `<span class="resource-chip">${escapeHtml(x)}</span>`).join("");
  return `<article class="live-card ${item.status === "live" ? "live" : ""}" data-id="${item.id}">
    <span class="live-badge">${item.status === "live" ? "🔴" : "🎥"} ${escapeHtml(item.status)}</span>
    <h3>${escapeHtml(item.title)}</h3>
    <p>${escapeHtml(item.description || item.topic || "Live class details")}</p>
    <div class="live-meta"><span>📚 ${escapeHtml(item.subject)}</span><span>🏫 ${escapeHtml(item.batchName)}</span><span>👩‍🏫 ${escapeHtml(item.teacherName)}</span><span>🕒 ${formatDate(item.startAt)}</span><span>💬 ${item.totalComments || 0}</span></div>
    <div>${resources}</div>
    <div class="class-actions">
      ${item.classUrl ? `<a class="primary" href="${escapeHtml(item.classUrl)}" target="_blank">Join</a>` : `<button data-action="mock-join">Join</button>`}
      <button data-action="comments">Comments</button>
      <button data-action="live">Go Live</button>
      <button data-action="complete">Complete</button>
      <button data-action="edit">Edit</button>
      <button class="danger" data-action="delete">Delete</button>
    </div>
  </article>`;
}
async function loadClasses(){
  try{
    const params = new URLSearchParams(); const search = getValue("classSearch"), status = getValue("statusFilter"); if(search) params.set("search", search); if(status) params.set("status", status);
    const res = await fetch(`${API}/live-classes?${params.toString()}`, {headers:authHeaders()}); const data = await res.json(); if(!res.ok) throw new Error(data.message || "Live classes load failed");
    renderStats(data); const list = data.classes || []; $("classList").innerHTML = list.length ? list.map(renderClass).join("") : `<p class="empty-state">Abhi live class nahi hai. Upar se schedule karo.</p>`;
  }catch(e){ $("classList").innerHTML = `<p class="empty-state">❌ ${escapeHtml(e.message)}</p>`; }
}
async function saveClass(e){
  e.preventDefault(); $("classMessage").textContent = "Saving…";
  try{ const id = getValue("classId"); const res = await fetch(id ? `${API}/live-classes/${id}` : `${API}/live-classes`, {method:id?"PUT":"POST", headers:authHeaders({"Content-Type":"application/json"}), body:JSON.stringify(classPayload())}); const data = await res.json(); if(!res.ok) throw new Error(data.message || "Save failed"); $("classMessage").textContent = `✅ ${data.message}`; clearClass(); await loadClasses(); }
  catch(e){ $("classMessage").textContent = `❌ ${e.message}`; }
}
async function updateClassStatus(id,status){ const res = await fetch(`${API}/live-classes/${id}/status`, {method:"PATCH", headers:authHeaders({"Content-Type":"application/json"}), body:JSON.stringify({status})}); const data = await res.json(); if(!res.ok) throw new Error(data.message || "Status update failed"); await loadClasses(); }
async function deleteClass(id){ if(!confirm("Delete live class?")) return; const res = await fetch(`${API}/live-classes/${id}`, {method:"DELETE", headers:authHeaders()}); const data = await res.json(); if(!res.ok) throw new Error(data.message || "Delete failed"); await loadClasses(); }
async function getClass(id){ const res = await fetch(`${API}/live-classes/${id}`, {headers:authHeaders()}); const data = await res.json(); if(!res.ok) throw new Error(data.message || "Class not found"); return data.liveClass; }
async function loadComments(id){
  $("selectedClassId").value = id; $("commentsTitle").textContent = "Comments / Class Chat";
  const item = await getClass(id); $("commentsTitle").textContent = `Comments: ${item.title}`;
  const res = await fetch(`${API}/live-classes/${id}/comments`, {headers:authHeaders()}); const data = await res.json(); if(!res.ok) throw new Error(data.message || "Comments load failed");
  const comments = data.comments || []; $("commentList").innerHTML = comments.length ? comments.map(c => `<div class="comment-item"><b>${escapeHtml(c.authorName)} • ${escapeHtml(c.authorRole)}</b><p>${escapeHtml(c.text)}</p><small>${formatDate(c.createdAt)}</small></div>`).join("") : `<p class="empty-state">Abhi comments nahi hain.</p>`;
}
async function addComment(e){
  e.preventDefault(); const id = getValue("selectedClassId"); const text = getValue("commentText"); if(!id) return alert("Pehle kisi class ke Comments button par click karo"); if(!text) return;
  const res = await fetch(`${API}/live-classes/${id}/comments`, {method:"POST", headers:authHeaders({"Content-Type":"application/json"}), body:JSON.stringify({text, authorName:savedUser?.name || "NAXORA User"})}); const data = await res.json(); if(!res.ok) throw new Error(data.message || "Comment failed"); $("commentText").value = ""; await loadComments(id); await loadClasses();
}
async function loadPlans(){
  try{ const res = await fetch(`${API}/live-classes/subscriptions/plans`); const data = await res.json(); const plans = data.plans || []; $("planCards").innerHTML = plans.map(p => `<article class="plan-card"><h3>${escapeHtml(p.planName)}</h3><b>₹${p.price}/mo</b><ul>${(p.features||[]).map(f=>`<li>${escapeHtml(f)}</li>`).join("")}</ul></article>`).join(""); }
  catch(e){ $("planCards").innerHTML = `<p class="empty-state">Plans load nahi hue</p>`; }
}
async function loadSubscriptions(){
  try{ const res = await fetch(`${API}/live-classes/subscriptions`, {headers:authHeaders()}); const data = await res.json(); if(!res.ok) throw new Error(data.message || "Subscription load failed"); renderStats(data); const items = data.subscriptions || []; $("subscriptionList").innerHTML = items.length ? items.map(s => `<div class="subscription-item"><b>${escapeHtml(s.instituteName)} • ${escapeHtml(s.planName)}</b><p>₹${s.price}/${s.billingCycle} • ${s.status} • ${s.maxLiveClasses} classes • ${s.maxStudentsPerClass} students/class</p></div>`).join("") : `<p class="empty-state">Live Classes add-on subscription abhi nahi hai.</p>`; }
  catch(e){ $("subscriptionList").innerHTML = `<p class="empty-state">❌ ${escapeHtml(e.message)}</p>`; }
}
async function saveSubscription(e){
  e.preventDefault(); $("subscriptionMessage").textContent = "Saving…";
  try{ const payload = {instituteName:getValue("subInstituteName"), planName:getValue("subPlanName"), status:getValue("subStatus"), paymentMode:getValue("subPaymentMode")}; const res = await fetch(`${API}/live-classes/subscriptions`, {method:"POST", headers:authHeaders({"Content-Type":"application/json"}), body:JSON.stringify(payload)}); const data = await res.json(); if(!res.ok) throw new Error(data.message || "Subscription save failed"); $("subscriptionMessage").textContent = `✅ ${data.message}`; await loadSubscriptions(); }
  catch(e){ $("subscriptionMessage").textContent = `❌ ${e.message}`; }
}

$("classForm").addEventListener("submit", saveClass); $("clearClassBtn").addEventListener("click", clearClass); $("refreshClasses").addEventListener("click", loadClasses); $("statusFilter").addEventListener("change", loadClasses); $("classSearch").addEventListener("input", () => setTimeout(loadClasses, 250)); $("commentForm").addEventListener("submit", addComment); $("subscriptionForm").addEventListener("submit", saveSubscription); $("logoutBtn").addEventListener("click", () => { localStorage.clear(); window.location.href = "index.html"; });
$("classList").addEventListener("click", async (e) => { const card = e.target.closest(".live-card"); if(!card) return; const id = card.dataset.id; const action = e.target.dataset.action; try{ if(action === "mock-join") alert("Internal live room placeholder: yahan future me video room/stream attach hoga."); if(action === "comments") await loadComments(id); if(action === "live") await updateClassStatus(id,"live"); if(action === "complete") await updateClassStatus(id,"completed"); if(action === "delete") await deleteClass(id); if(action === "edit") fillClass(await getClass(id)); }catch(err){ alert(err.message); } });

loadPlans(); loadSubscriptions(); loadClasses();
