const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");
if (!token) window.location.href = "index.html";

const $ = (id) => document.querySelector(`#${id}`);
const getValue = (id) => ($(id)?.value || "").trim();
const authHeaders = (extra = {}) => ({ Authorization: `Bearer ${token}`, ...extra });
const escapeHtml = (v="") => String(v).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"}[c]));
const splitCsv = (v="") => v.split(",").map(x => x.trim()).filter(Boolean);
const money = (n=0) => `₹${Number(n||0).toLocaleString("en-IN")}`;
const formatDate = (value) => value ? new Date(value).toLocaleDateString("en-IN") : "No date";
let currentBatches = [];
let selectedEnrollmentBatchId = "";

function renderStats(data={}) {
  const cards = [
    ["Online Batches", data.totalBatches || 0],
    ["Open", data.openBatches || 0],
    ["Enrollments", data.totalEnrollments || 0],
    ["Active Access", data.activeAccess || 0],
    ["Pending Fees", data.pendingFees || 0],
    ["Revenue", money(data.revenue || 0)],
  ];
  $("accessStats").innerHTML = cards.map(([t,v]) => `<div class="mini-stat"><span>${t}</span><b>${v}</b></div>`).join("");
}
function batchPayload() {
  return {
    batchName:getValue("batchName"), courseName:getValue("courseName"), subject:getValue("subject"), teacherName:getValue("teacherName"),
    feeAmount:Number(getValue("feeAmount") || 0), billingCycle:getValue("billingCycle"), accessDurationDays:Number(getValue("accessDurationDays") || 30),
    maxStudents:Number(getValue("maxStudents") || 100), mode:getValue("mode"), status:getValue("status"), paymentMode:getValue("paymentMode"),
    tags:splitCsv(getValue("tags")), description:getValue("description"), liveClassAccess:$("liveClassAccess").checked, commentsAccess:$("commentsAccess").checked,
    recordingAccess:$("recordingAccess").checked, notesAccess:$("notesAccess").checked, certificateAccess:$("certificateAccess").checked,
    publicVisible:$("publicVisible").checked
  };
}
function enrollmentPayload() {
  return {
    studentName:getValue("studentName"), studentPhone:getValue("studentPhone"), studentEmail:getValue("studentEmail"), parentPhone:getValue("parentPhone"),
    paidAmount:Number(getValue("paidAmount") || 0), feeStatus:getValue("feeStatus"), accessStatus:getValue("accessStatus"), paymentReference:getValue("paymentReference"), notes:getValue("enrollmentNotes")
  };
}
function fillBatch(item){
  $("batchId").value=item.id; $("batchFormTitle").textContent="Edit Online Batch Access";
  ["batchName","courseName","subject","teacherName","feeAmount","billingCycle","accessDurationDays","maxStudents","mode","status","paymentMode","description"].forEach(id => { $(id).value = item[id] ?? ""; });
  $("tags").value=(item.tags||[]).join(", "); ["liveClassAccess","commentsAccess","recordingAccess","notesAccess","certificateAccess","publicVisible"].forEach(id => { $(id).checked = item[id] !== false; });
  window.scrollTo({top:0, behavior:"smooth"});
}
function clearBatch(){ $("batchId").value=""; $("batchForm").reset(); $("feeAmount").value=999; $("accessDurationDays").value=30; $("maxStudents").value=100; ["liveClassAccess","commentsAccess","recordingAccess","notesAccess","publicVisible"].forEach(id => $(id).checked=true); $("certificateAccess").checked=false; $("batchFormTitle").textContent="Create Online Batch Access"; }
function renderBatch(item){
  const features = [["Live", item.liveClassAccess], ["Comments", item.commentsAccess], ["Recording", item.recordingAccess], ["Notes", item.notesAccess], ["Certificate", item.certificateAccess]].filter(x=>x[1]).map(x=>`<span class="feature-chip">${x[0]}</span>`).join("");
  return `<article class="batch-card ${item.status}" data-id="${item.id}">
    <span class="access-badge">${escapeHtml(item.status)} • ${escapeHtml(item.mode)}</span>
    <h3>${escapeHtml(item.batchName)}</h3>
    <p>${escapeHtml(item.description || item.courseName)}</p>
    <div class="batch-meta"><span>📚 ${escapeHtml(item.courseName)}</span><span>👨‍🏫 ${escapeHtml(item.teacherName || "Teacher")}</span><span>💰 ${money(item.feeAmount)}/${escapeHtml(item.billingCycle)}</span><span>⏳ ${item.accessDurationDays} days</span><span>🪑 ${item.seatsLeft} seats left</span></div>
    <div>${features}</div>
    <div class="batch-actions">
      <button data-action="enrollments">Enrollments</button><button data-action="open">Open</button><button data-action="closed">Close</button><button data-action="edit">Edit</button><button class="danger" data-action="delete">Delete</button>
    </div>
  </article>`;
}
function populateBatchSelects(){
  const options = [`<option value="">Select online batch</option>`].concat(currentBatches.map(b => `<option value="${b.id}">${escapeHtml(b.batchName)} • ${money(b.feeAmount)}</option>`)).join("");
  $("enrollBatchId").innerHTML = options; $("checkBatchId").innerHTML = options;
}
async function loadBatches(){
  try{
    const params = new URLSearchParams(); const search=getValue("batchSearch"), status=getValue("statusFilter"); if(search) params.set("search", search); if(status) params.set("status", status);
    const res = await fetch(`${API}/online-batches?${params.toString()}`, {headers:authHeaders()}); const data = await res.json(); if(!res.ok) throw new Error(data.message || "Online batches load failed");
    currentBatches = data.batches || []; renderStats(data); populateBatchSelects(); $("batchList").innerHTML = currentBatches.length ? currentBatches.map(renderBatch).join("") : `<p class="empty-state">Abhi online batch access plan nahi hai.</p>`;
  }catch(e){ $("batchList").innerHTML = `<p class="empty-state">❌ ${escapeHtml(e.message)}</p>`; }
}
async function saveBatch(e){
  e.preventDefault(); $("batchMessage").textContent="Saving…";
  try{ const id=getValue("batchId"); const res = await fetch(id ? `${API}/online-batches/${id}` : `${API}/online-batches`, {method:id?"PUT":"POST", headers:authHeaders({"Content-Type":"application/json"}), body:JSON.stringify(batchPayload())}); const data=await res.json(); if(!res.ok) throw new Error(data.message || "Save failed"); $("batchMessage").textContent=`✅ ${data.message}`; clearBatch(); await loadBatches(); }
  catch(e){ $("batchMessage").textContent=`❌ ${e.message}`; }
}
async function getBatch(id){ const res=await fetch(`${API}/online-batches/${id}`, {headers:authHeaders()}); const data=await res.json(); if(!res.ok) throw new Error(data.message || "Batch not found"); return data.batch; }
async function updateBatchStatus(id,status){ const res=await fetch(`${API}/online-batches/${id}/status`, {method:"PATCH", headers:authHeaders({"Content-Type":"application/json"}), body:JSON.stringify({status})}); const data=await res.json(); if(!res.ok) throw new Error(data.message || "Status update failed"); await loadBatches(); }
async function deleteBatch(id){ if(!confirm("Delete online batch and enrollments?")) return; const res=await fetch(`${API}/online-batches/${id}`, {method:"DELETE", headers:authHeaders()}); const data=await res.json(); if(!res.ok) throw new Error(data.message || "Delete failed"); await loadBatches(); }
async function saveEnrollment(e){
  e.preventDefault(); const id=getValue("enrollBatchId"); if(!id) return alert("Pehle online batch select karo"); $("enrollmentMessage").textContent="Saving…";
  try{ const res=await fetch(`${API}/online-batches/${id}/enroll`, {method:"POST", headers:authHeaders({"Content-Type":"application/json"}), body:JSON.stringify(enrollmentPayload())}); const data=await res.json(); if(!res.ok) throw new Error(data.message || "Enrollment failed"); $("enrollmentMessage").textContent=`✅ ${data.message}`; $("enrollmentForm").reset(); await loadBatches(); await loadEnrollments(id); }
  catch(e){ $("enrollmentMessage").textContent=`❌ ${e.message}`; }
}
async function loadEnrollments(id){
  selectedEnrollmentBatchId=id; const res=await fetch(`${API}/online-batches/${id}/enrollments`, {headers:authHeaders()}); const data=await res.json(); if(!res.ok) throw new Error(data.message || "Enrollments load failed");
  $("enrollmentTitle").textContent=`Enrollments: ${data.batch.batchName}`; const items=data.enrollments||[];
  $("enrollmentList").innerHTML = items.length ? items.map(x => `<div class="enrollment-item" data-id="${x.id}"><b>${escapeHtml(x.studentName)} • ${escapeHtml(x.studentPhone)}</b><p>${escapeHtml(x.feeStatus)} / ${escapeHtml(x.accessStatus)} • Paid ${money(x.paidAmount)} • Expires ${formatDate(x.accessExpiresAt)}</p><div class="batch-actions"><button data-action="activate">Activate Paid</button><button data-action="block">Block</button></div></div>`).join("") : `<p class="empty-state">Is batch me abhi enrollment nahi hai.</p>`;
}
async function updateEnrollment(enrollmentId, feeStatus, accessStatus){ const res=await fetch(`${API}/online-batches/${selectedEnrollmentBatchId}/enrollments/${enrollmentId}/status`, {method:"PATCH", headers:authHeaders({"Content-Type":"application/json"}), body:JSON.stringify({feeStatus, accessStatus})}); const data=await res.json(); if(!res.ok) throw new Error(data.message || "Enrollment update failed"); await loadEnrollments(selectedEnrollmentBatchId); }
async function checkAccess(e){
  e.preventDefault(); const id=getValue("checkBatchId"); if(!id) return; $("accessResult").className="access-result"; $("accessResult").textContent="Checking…";
  try{ const res=await fetch(`${API}/online-batches/${id}/check-access`, {method:"POST", headers:authHeaders({"Content-Type":"application/json"}), body:JSON.stringify({studentPhone:getValue("checkPhone"), studentEmail:getValue("checkEmail")})}); const data=await res.json(); if(!res.ok) throw new Error(data.message || "Access check failed"); $("accessResult").className=`access-result ${data.allowed ? "allowed" : "blocked"}`; $("accessResult").innerHTML=`<b>${data.allowed ? "✅ Allowed" : "⛔ Blocked"}</b><p>${escapeHtml(data.message)}</p>${data.enrollment ? `<small>${escapeHtml(data.enrollment.studentName)} • expires ${formatDate(data.enrollment.accessExpiresAt)}</small>` : ""}`; }
  catch(err){ $("accessResult").className="access-result blocked"; $("accessResult").innerHTML=`❌ ${escapeHtml(err.message)}`; }
}

$("batchForm").addEventListener("submit", saveBatch); $("clearBatchBtn").addEventListener("click", clearBatch); $("refreshBatches").addEventListener("click", loadBatches); $("statusFilter").addEventListener("change", loadBatches); $("batchSearch").addEventListener("input", () => setTimeout(loadBatches, 250)); $("enrollmentForm").addEventListener("submit", saveEnrollment); $("accessCheckForm").addEventListener("submit", checkAccess); $("logoutBtn").addEventListener("click", () => { localStorage.clear(); window.location.href="index.html"; });
$("batchList").addEventListener("click", async (e) => { const card=e.target.closest(".batch-card"); if(!card) return; const id=card.dataset.id; const action=e.target.dataset.action; try{ if(action==="enrollments") await loadEnrollments(id); if(action==="open") await updateBatchStatus(id,"open"); if(action==="closed") await updateBatchStatus(id,"closed"); if(action==="delete") await deleteBatch(id); if(action==="edit") fillBatch(await getBatch(id)); }catch(err){ alert(err.message); } });
$("enrollmentList").addEventListener("click", async (e) => { const row=e.target.closest(".enrollment-item"); if(!row || !e.target.dataset.action) return; try{ if(e.target.dataset.action==="activate") await updateEnrollment(row.dataset.id,"paid","active"); if(e.target.dataset.action==="block") await updateEnrollment(row.dataset.id,"pending","blocked"); }catch(err){ alert(err.message); } });
loadBatches();
