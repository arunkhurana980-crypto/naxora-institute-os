const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");
const savedUser = JSON.parse(localStorage.getItem("naxora_user") || "null");

if (!token) window.location.href = "index.html";

document.querySelector("#profilePill").textContent = `${savedUser?.name || "User"} • Certificates`;

const form = document.querySelector("#certificateForm");
const certificateId = document.querySelector("#certificateId");
const documentType = document.querySelector("#documentType");
const certificateType = document.querySelector("#certificateType");
const certificateTitle = document.querySelector("#certificateTitle");
const documentNumber = document.querySelector("#documentNumber");
const studentName = document.querySelector("#studentName");
const studentEmail = document.querySelector("#studentEmail");
const rollNo = document.querySelector("#rollNo");
const batchName = document.querySelector("#batchName");
const courseName = document.querySelector("#courseName");
const duration = document.querySelector("#duration");
const grade = document.querySelector("#grade");
const statusInput = document.querySelector("#status");
const issueDate = document.querySelector("#issueDate");
const validUntil = document.querySelector("#validUntil");
const photoUrl = document.querySelector("#photoUrl");
const phone = document.querySelector("#phone");
const bloodGroup = document.querySelector("#bloodGroup");
const emergencyContact = document.querySelector("#emergencyContact");
const authorizedBy = document.querySelector("#authorizedBy");
const designation = document.querySelector("#designation");
const instituteAddress = document.querySelector("#instituteAddress");
const skillsCovered = document.querySelector("#skillsCovered");
const address = document.querySelector("#address");
const formTitle = document.querySelector("#formTitle");
const statsBox = document.querySelector("#certificateStats");
const list = document.querySelector("#certificatesList");
const pageMessage = document.querySelector("#pageMessage");
const certificatePreview = document.querySelector("#certificatePreview");
const idCardPreview = document.querySelector("#idCardPreview");

function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function setMessage(text, ok = true) {
  pageMessage.textContent = `${ok ? "✅" : "❌"} ${text}`;
}

function dateText(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function statCard(titleText, value, label, icon) {
  return `
    <article class="stat-card">
      <div class="stat-icon">${icon}</div>
      <h3>${titleText}</h3>
      <div class="stat-value">${value}</div>
      <p class="stat-label">${label}</p>
    </article>
  `;
}

function getPayload() {
  return {
    documentType: documentType.value,
    certificateType: certificateType.value,
    certificateTitle: certificateTitle.value.trim(),
    documentNumber: documentNumber.value.trim(),
    studentName: studentName.value.trim(),
    studentEmail: studentEmail.value.trim(),
    rollNo: rollNo.value.trim(),
    batchName: batchName.value.trim(),
    courseName: courseName.value.trim(),
    duration: duration.value.trim(),
    grade: grade.value.trim(),
    status: statusInput.value,
    issueDate: issueDate.value || undefined,
    validUntil: validUntil.value || undefined,
    photoUrl: photoUrl.value.trim(),
    phone: phone.value.trim(),
    bloodGroup: bloodGroup.value.trim(),
    emergencyContact: emergencyContact.value.trim(),
    authorizedBy: authorizedBy.value.trim(),
    designation: designation.value.trim(),
    instituteAddress: instituteAddress.value.trim(),
    skillsCovered: skillsCovered.value.trim(),
    address: address.value.trim(),
  };
}

function clearForm() {
  form.reset();
  certificateId.value = "";
  documentType.value = "certificate";
  certificateType.value = "course-completion";
  certificateTitle.value = "Certificate of Completion";
  statusInput.value = "issued";
  issueDate.value = todayValue();
  authorizedBy.value = "Institute Director";
  designation.value = "Director";
  formTitle.textContent = "Create Certificate / ID Card";
  updatePreview();
}

function fillForm(item) {
  certificateId.value = item.id;
  documentType.value = item.documentType || "certificate";
  certificateType.value = item.certificateType || "course-completion";
  certificateTitle.value = item.certificateTitle || "";
  documentNumber.value = item.documentNumber || "";
  studentName.value = item.studentName || "";
  studentEmail.value = item.studentEmail || "";
  rollNo.value = item.rollNo || "";
  batchName.value = item.batchName || "";
  courseName.value = item.courseName || "";
  duration.value = item.duration || "";
  grade.value = item.grade || "";
  statusInput.value = item.status || "issued";
  issueDate.value = item.issueDate ? new Date(item.issueDate).toISOString().slice(0, 10) : "";
  validUntil.value = item.validUntil ? new Date(item.validUntil).toISOString().slice(0, 10) : "";
  photoUrl.value = item.photoUrl || "";
  phone.value = item.phone || "";
  bloodGroup.value = item.bloodGroup || "";
  emergencyContact.value = item.emergencyContact || "";
  authorizedBy.value = item.authorizedBy || "";
  designation.value = item.designation || "";
  instituteAddress.value = item.instituteAddress || "";
  skillsCovered.value = item.skillsCovered || "";
  address.value = item.address || item.verificationNote || "";
  formTitle.textContent = "Edit Certificate / ID Card";
  updatePreview();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderStats(data) {
  statsBox.innerHTML = [
    statCard("Documents", data.totalDocuments || 0, `${data.issuedCount || 0} issued`, "🎖️"),
    statCard("Certificates", data.certificatesCount || 0, `${data.typeCount || 0} types`, "📜"),
    statCard("ID Cards", data.idCardsCount || 0, `${data.expiredCount || 0} expired`, "🪪"),
    statCard("Draft / Revoked", `${data.draftCount || 0}/${data.revokedCount || 0}`, `${data.scheduledCount || 0} scheduled`, "🛡️"),
  ].join("");
}

function renderPreviewCard(data) {
  const institute = savedUser?.instituteName || "NAXORA Institute";
  const issue = data.issueDate ? dateText(data.issueDate) : dateText(new Date());
  const certNo = data.documentNumber || "Auto generated after save";

  certificatePreview.innerHTML = `
    <div class="cert-watermark">NAXORA</div>
    <div class="cert-border">
      <div class="cert-head">
        <div class="cert-logo">N</div>
        <div><h2>${institute}</h2><p>${data.instituteAddress || "Premium AI Powered Coaching Institute"}</p></div>
      </div>
      <p class="cert-small">Document No: ${certNo}</p>
      <h1>${data.certificateTitle || "Certificate of Completion"}</h1>
      <p class="cert-line">This certificate is proudly presented to</p>
      <h3>${data.studentName || "Student Name"}</h3>
      <p class="cert-body">for successfully completing <b>${data.courseName || "Course Name"}</b>${data.duration ? ` during ${data.duration}` : ""}. ${data.grade ? `Performance: ${data.grade}.` : ""}</p>
      <p class="cert-skills">${data.skillsCovered || "Skills covered will appear here."}</p>
      <div class="cert-footer">
        <div><b>${issue}</b><span>Issue Date</span></div>
        <div class="seal">VERIFIED</div>
        <div><b>${data.authorizedBy || "Institute Director"}</b><span>${data.designation || "Director"}</span></div>
      </div>
    </div>
  `;

  idCardPreview.innerHTML = `
    <div class="id-bg"></div>
    <div class="id-top"><span class="id-logo">N</span><b>${institute}</b></div>
    <div class="id-photo">${data.photoUrl ? `<img src="${data.photoUrl}" alt="Student photo">` : "👤"}</div>
    <h3>${data.studentName || "Student Name"}</h3>
    <p>${data.courseName || data.batchName || "Student"}</p>
    <div class="id-rows">
      <span>Roll No</span><b>${data.rollNo || "—"}</b>
      <span>Batch</span><b>${data.batchName || "—"}</b>
      <span>Phone</span><b>${data.phone || "—"}</b>
      <span>Blood</span><b>${data.bloodGroup || "—"}</b>
      <span>Valid</span><b>${data.validUntil ? dateText(data.validUntil) : "—"}</b>
    </div>
    <div class="id-qr">QR</div>
  `;

  certificatePreview.style.display = data.documentType === "id-card" ? "none" : "block";
  idCardPreview.style.display = data.documentType === "id-card" ? "block" : "none";
}

function updatePreview() {
  renderPreviewCard(getPayload());
}

function renderDocuments(items = []) {
  if (!items.length) {
    list.innerHTML = `<p class="empty-state">Abhi certificate ya ID card available nahi hai.</p>`;
    return;
  }

  list.innerHTML = items.map((item) => `
    <article class="certificate-card ${item.documentType}">
      <div class="certificate-top">
        <div>
          <span class="badge">${item.documentType}</span>
          <span class="badge">${item.certificateType}</span>
          <span class="badge ${item.status}">${item.status}</span>
        </div>
        <strong>${item.documentNumber || "No number"}</strong>
      </div>
      <h3>${item.certificateTitle}</h3>
      <p><b>${item.studentName}</b> • ${item.courseName || item.batchName || "No course"}</p>
      <div class="certificate-meta">
        <span>Issue: ${dateText(item.issueDate)}</span>
        <span>Valid: ${dateText(item.validUntil)}</span>
        <span>Roll: ${item.rollNo || "—"}</span>
      </div>
      <div class="card-actions">
        <button data-action="edit" data-id="${item.id}">Edit</button>
        <button data-action="print" data-id="${item.id}">Preview/Print</button>
        <button data-action="issue" data-id="${item.id}">Issue</button>
        <button data-action="revoke" data-id="${item.id}">Revoke</button>
        <button data-action="delete" data-id="${item.id}" class="danger">Delete</button>
      </div>
    </article>
  `).join("");
}

function getFilters() {
  const params = new URLSearchParams();
  const search = document.querySelector("#searchInput").value.trim();
  const docType = document.querySelector("#documentTypeFilter").value;
  const certType = document.querySelector("#certificateTypeFilter").value;
  const status = document.querySelector("#statusFilter").value;
  if (search) params.set("search", search);
  if (docType) params.set("documentType", docType);
  if (certType) params.set("certificateType", certType);
  if (status) params.set("status", status);
  return params.toString();
}

async function loadCertificates() {
  try {
    const query = getFilters();
    const response = await fetch(`${API}/certificates${query ? `?${query}` : ""}`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Certificates load failed");
    renderStats(data);
    renderDocuments(data.certificates || []);
    setMessage("Certificates & ID cards load ho gaye.");
  } catch (error) {
    setMessage(error.message, false);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const id = certificateId.value;
    const response = await fetch(`${API}/certificates${id ? `/${id}` : ""}`, {
      method: id ? "PUT" : "POST",
      headers: authHeaders(),
      body: JSON.stringify(getPayload()),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Save failed");
    clearForm();
    await loadCertificates();
    setMessage(data.message || "Document save ho gaya");
  } catch (error) {
    setMessage(error.message, false);
  }
});

list.addEventListener("click", async (event) => {
  const btn = event.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;

  if (action === "edit" || action === "print") {
    const response = await fetch(`${API}/certificates/${id}`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) return setMessage(data.message || "Document read failed", false);
    fillForm(data.certificate);
    if (action === "print") setTimeout(() => window.print(), 350);
    return;
  }

  if (action === "delete") {
    if (!confirm("Document delete karna hai?")) return;
    const response = await fetch(`${API}/certificates/${id}`, { method: "DELETE", headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) return setMessage(data.message || "Delete failed", false);
    await loadCertificates();
    return setMessage(data.message || "Deleted");
  }

  const status = action === "revoke" ? "revoked" : "issued";
  const response = await fetch(`${API}/certificates/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  const data = await response.json();
  if (!response.ok) return setMessage(data.message || "Status update failed", false);
  await loadCertificates();
  setMessage(data.message || "Updated");
});

[documentType, certificateType, certificateTitle, documentNumber, studentName, studentEmail, rollNo, batchName, courseName, duration, grade, statusInput, issueDate, validUntil, photoUrl, phone, bloodGroup, emergencyContact, authorizedBy, designation, instituteAddress, skillsCovered, address].forEach((el) => {
  el.addEventListener("input", updatePreview);
  el.addEventListener("change", updatePreview);
});

["#searchInput", "#documentTypeFilter", "#certificateTypeFilter", "#statusFilter"].forEach((selector) => {
  document.querySelector(selector).addEventListener("input", loadCertificates);
  document.querySelector(selector).addEventListener("change", loadCertificates);
});

document.querySelector("#refreshBtn").addEventListener("click", loadCertificates);
document.querySelector("#clearBtn").addEventListener("click", clearForm);
document.querySelector("#printPreviewBtn").addEventListener("click", () => window.print());
document.querySelector("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("naxora_token");
  localStorage.removeItem("naxora_user");
  window.location.href = "index.html";
});

clearForm();
loadCertificates();
