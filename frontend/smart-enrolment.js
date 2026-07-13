const $ = (selector) => document.querySelector(selector);
const apiStatus = $("#apiStatus");
const courseSelect = $("#courseSelect");
const batchSelect = $("#batchSelect");
const expectedFee = $("#expectedFee");
const documentChecklist = $("#documentChecklist");
const consentList = $("#consentList");
const form = $("#enrolmentForm");
const formMessage = $("#formMessage");
const enrolmentList = $("#enrolmentList");
const recordCount = $("#recordCount");
const checklistBox = $("#part56Checklist");
const studentIdPreview = $("#studentIdPreview");

let part56Config = { courses: [], batches: [], documents: [], consentItems: [] };

function showMessage(text, type = "ok") {
  formMessage.textContent = text;
  formMessage.className = `nx-message ${type}`;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Request failed: ${response.status}`);
  }
  return data;
}

function renderConfig(config) {
  part56Config = config;
  courseSelect.innerHTML = `<option value="">Select course</option>` + config.courses.map((course) => (
    `<option value="${course.id}" data-fee="${course.defaultFee}">${course.name} · ₹${course.defaultFee}</option>`
  )).join("");
  batchSelect.innerHTML = `<option value="">Select batch</option>` + config.batches.map((batch) => (
    `<option value="${batch.id}">${batch.name} · ${batch.timing} · ${batch.available} seats</option>`
  )).join("");
  documentChecklist.innerHTML = config.documents.map((doc) => (
    `<label class="nx-doc-item nx-check"><input type="checkbox" name="doc_${doc.key}" ${doc.key === "consentSigned" ? "disabled" : ""} /> ${doc.label} ${doc.required ? "*" : ""}</label>`
  )).join("");
  consentList.innerHTML = config.consentItems.map((item) => `<li>${item}</li>`).join("");
}

function formPayload() {
  const data = new FormData(form);
  return {
    studentName: data.get("studentName"),
    studentPhone: data.get("studentPhone"),
    studentEmail: data.get("studentEmail"),
    studentClass: data.get("studentClass"),
    dateOfBirth: data.get("dateOfBirth"),
    address: data.get("address"),
    parentName: data.get("parentName"),
    parentPhone: data.get("parentPhone"),
    parentEmail: data.get("parentEmail"),
    guardianRelation: data.get("guardianRelation"),
    courseId: data.get("courseId"),
    batchId: data.get("batchId"),
    expectedFee: Number(data.get("expectedFee") || 0),
    discount: Number(data.get("discount") || 0),
    installmentAllowed: data.get("installmentAllowed") === "on",
    documents: {
      studentPhoto: data.get("doc_studentPhoto") === "on",
      parentGuardianId: data.get("doc_parentGuardianId") === "on",
      previousMarksheet: data.get("doc_previousMarksheet") === "on",
      addressProof: data.get("doc_addressProof") === "on",
      note: data.get("documentNote")
    },
    consentAccepted: data.get("consentAccepted") === "on",
    notes: data.get("notes"),
    source: "web-smart-enrolment"
  };
}

function renderEnrolments(records) {
  recordCount.textContent = records.length;
  if (!records.length) {
    enrolmentList.innerHTML = `<p class="nx-empty">No enrolments yet. Form submit karke first smart admission save karo.</p>`;
    return;
  }
  enrolmentList.innerHTML = records.map((row) => (
    `<div class="nx-enrolment-item">
      <strong>${row.studentName || "Student"}</strong>
      <small>${row.studentId || "ID pending"} · ${row.courseName || "Course"} · ${row.batchName || "Batch"}</small><br />
      <small>Parent: ${row.parentName || "-"} · Phone: ${row.parentPhone || "-"}</small><br />
      <span class="nx-pill nx-pill-blue">${row.status || "submitted"}</span>
    </div>`
  )).join("");
}

async function loadEverything() {
  try {
    const [status, config, enrolments, checklist] = await Promise.all([
      fetchJson("/api/part56/status"),
      fetchJson("/api/part56/form-config"),
      fetchJson("/api/part56/enrolments"),
      fetchJson("/api/part56/checklist")
    ]);
    apiStatus.textContent = `${status.status} · ${status.dbMode}`;
    renderConfig(config);
    renderEnrolments(enrolments.enrolments || []);
    checklistBox.innerHTML = (checklist.checklist || []).map((item) => `<div>✅ ${item}</div>`).join("");
  } catch (error) {
    apiStatus.textContent = "API error";
    showMessage(error.message, "err");
  }
}

async function previewId() {
  try {
    const data = await fetchJson("/api/part56/preview-student-id", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formPayload())
    });
    studentIdPreview.textContent = data.studentId;
  } catch (error) {
    showMessage(error.message, "err");
  }
}

courseSelect?.addEventListener("change", () => {
  const selected = courseSelect.options[courseSelect.selectedIndex];
  expectedFee.value = selected?.dataset?.fee || "";
  previewId();
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("Saving enrolment...", "ok");
  try {
    const data = await fetchJson("/api/part56/enrolments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formPayload())
    });
    studentIdPreview.textContent = data.enrolment?.studentId || studentIdPreview.textContent;
    showMessage(`Saved: ${data.enrolment?.studentId || "Smart enrolment"}`, "ok");
    form.reset();
    await loadEverything();
  } catch (error) {
    showMessage(error.message, "err");
  }
});

$("#previewIdBtn")?.addEventListener("click", previewId);
$("#reloadBtn")?.addEventListener("click", loadEverything);

loadEverything();
