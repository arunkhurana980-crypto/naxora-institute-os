const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");

if (!token) window.location.href = "index.html";

const $ = (selector) => document.querySelector(selector);
const getValue = (id) => $(`#${id}`).value.trim();
const setValue = (id, value = "") => { $(`#${id}`).value = value ?? ""; };

const assignmentForm = $("#assignmentForm");
const assignmentsList = $("#assignmentsList");
let currentAssignments = [];

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function dateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function dateText(value) {
  if (!value) return "Not set";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(value) {
  const labels = { draft: "Draft", active: "Active", closed: "Closed" };
  return labels[value] || value;
}

function submissionLabel(value) {
  const labels = { pending: "Pending", submitted: "Submitted", checked: "Checked" };
  return labels[value] || value;
}

function priorityLabel(value) {
  const labels = { low: "Low", normal: "Normal", high: "High" };
  return labels[value] || value;
}

function logoutOnAuthError(error) {
  const message = String(error.message || "").toLowerCase();
  if (message.includes("token") || message.includes("login") || message.includes("authorized")) {
    localStorage.removeItem("naxora_token");
    localStorage.removeItem("naxora_user");
    setTimeout(() => (window.location.href = "index.html"), 900);
  }
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

function assignmentPayload() {
  return {
    title: getValue("title"),
    description: getValue("description"),
    subject: getValue("subject"),
    topic: getValue("topic"),
    batchName: getValue("batchName"),
    assignedTo: getValue("assignedTo") || "batch",
    studentName: getValue("studentName"),
    teacherName: getValue("teacherName"),
    dueDate: getValue("dueDate"),
    maxMarks: Number(getValue("maxMarks") || 100),
    priority: getValue("priority") || "normal",
    status: getValue("status") || "active",
    submissionStatus: getValue("submissionStatus") || "pending",
    descriptionText: getValue("description"),
    submissionsText: getValue("submissionsText"),
    resourceLink: getValue("resourceLink"),
    teacherRemarks: getValue("teacherRemarks"),
  };
}

function clearAssignmentForm() {
  ["assignmentId", "title", "description", "subject", "topic", "batchName", "studentName", "teacherName", "dueDate", "submissionsText", "resourceLink", "teacherRemarks"].forEach((id) => setValue(id, ""));
  setValue("assignedTo", "batch");
  setValue("maxMarks", "100");
  setValue("priority", "normal");
  setValue("status", "active");
  setValue("submissionStatus", "pending");
  $("#assignmentFormHeading").textContent = "Add New Homework";
  $("#saveAssignmentBtn").textContent = "Save Homework";
}

function fillSampleAssignment() {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  setValue("title", "JWT Auth Practice Homework");
  setValue("subject", "Web Development");
  setValue("topic", "JWT + Protected Routes");
  setValue("batchName", "Full Stack Batch A");
  setValue("assignedTo", "batch");
  setValue("studentName", "");
  setValue("teacherName", "Arun Sir");
  setValue("dueDate", dateInputValue(tomorrow));
  setValue("maxMarks", "50");
  setValue("priority", "high");
  setValue("status", "active");
  setValue("submissionStatus", "pending");
  setValue("description", "1. Login API banao.\n2. JWT token generate karo.\n3. Protected /api/me route banao.\n4. Screenshot ke saath submit karo.");
  setValue("submissionsText", "Arun Khurana\nRohit\nPriya");
  setValue("resourceLink", "");
  setValue("teacherRemarks", "Submit karte time code clean aur commented hona chahiye.");
}

function renderStats(data) {
  $("#totalAssignments").textContent = String(data.totalAssignments || 0);
  $("#activeAssignments").textContent = String(data.activeAssignments || 0);
  $("#pendingAssignments").textContent = String(data.pendingAssignments || 0);
  $("#checkedAssignments").textContent = String(data.checkedAssignments || 0);
  $("#overdueAssignments").textContent = String(data.overdueAssignments || 0);
}

function renderAssignments(data) {
  currentAssignments = data.assignments || [];
  renderStats(data);

  if (!currentAssignments.length) {
    assignmentsList.innerHTML = `<div class="empty-state">Abhi koi homework nahi mila. Pehla assignment add karo.</div>`;
    return;
  }

  assignmentsList.innerHTML = currentAssignments.map((item) => {
    const submissions = item.submissions || [];
    const preview = submissions.slice(0, 8).map((sub) => `
      <span class="submission-pill">${escapeHTML(sub.studentName)} • ${submissionLabel(sub.status)}</span>
    `).join("");

    return `
      <article class="data-card" data-id="${item.id}">
        <div class="card-main">
          <div>
            <h3>${escapeHTML(item.title)}</h3>
            <p>${escapeHTML(item.description)}</p>
            <div class="meta-grid">
              <span><b>Subject:</b> ${escapeHTML(item.subject)}</span>
              <span><b>Topic:</b> ${escapeHTML(item.topic || "-")}</span>
              <span><b>Batch:</b> ${escapeHTML(item.batchName)}</span>
              <span><b>Assigned:</b> ${item.assignedTo === "student" ? escapeHTML(item.studentName || "Student") : "Full Batch"}</span>
              <span><b>Teacher:</b> ${escapeHTML(item.teacherName || "-")}</span>
              <span><b>Due:</b> ${dateText(item.dueDate)}</span>
              <span><b>Marks:</b> ${item.maxMarks || 0}</span>
              <span><b>Status:</b> <em class="status-${item.status}">${statusLabel(item.status)}</em></span>
              <span><b>Submission:</b> <em class="submission-${item.submissionStatus}">${submissionLabel(item.submissionStatus)}</em></span>
              <span><b>Priority:</b> <em class="priority-${item.priority}">${priorityLabel(item.priority)}</em></span>
            </div>
            ${item.teacherRemarks ? `<div class="answer-preview"><b>Teacher Remarks:</b> ${escapeHTML(item.teacherRemarks)}</div>` : ""}
            ${preview ? `<div class="submission-preview">${preview}</div>` : ""}
            ${item.resourceLink ? `<p class="small-muted">Resource: ${escapeHTML(item.resourceLink)}</p>` : ""}
          </div>
          <div class="card-actions">
            <button data-action="submitted" data-id="${item.id}" class="ghost-inline">Mark Submitted</button>
            <button data-action="checked" data-id="${item.id}" class="ghost-inline">Mark Checked</button>
            <button data-action="edit" data-id="${item.id}" class="ghost-inline">Edit</button>
            <button data-action="delete" data-id="${item.id}" class="danger-btn">Delete</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

async function loadAssignments() {
  $("#assignmentsListMessage").textContent = "Assignments loading…";
  try {
    const params = new URLSearchParams({
      search: getValue("assignmentSearch"),
      subject: getValue("subjectFilter"),
      status: getValue("statusFilter"),
      submissionStatus: getValue("submissionFilter"),
      priority: getValue("priorityFilter"),
    });
    const data = await apiRequest(`/assignments?${params.toString()}`);
    renderAssignments(data);
    $("#assignmentsListMessage").textContent = "✅ Assignments loaded.";
  } catch (error) {
    $("#assignmentsListMessage").textContent = `❌ ${error.message}`;
    logoutOnAuthError(error);
  }
}

assignmentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = getValue("assignmentId");
  $("#assignmentMessage").textContent = id ? "Assignment update ho raha hai…" : "Assignment save ho raha hai…";

  try {
    const data = await apiRequest(id ? `/assignments/${id}` : "/assignments", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(assignmentPayload()),
    });

    $("#assignmentMessage").textContent = `✅ ${data.message}`;
    clearAssignmentForm();
    await loadAssignments();
  } catch (error) {
    $("#assignmentMessage").textContent = `❌ ${error.message}`;
    logoutOnAuthError(error);
  }
});

assignmentsList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;
  const item = currentAssignments.find((assignment) => assignment.id === id);
  if (!item) return;

  if (action === "edit") {
    setValue("assignmentId", item.id);
    setValue("title", item.title);
    setValue("description", item.description);
    setValue("subject", item.subject);
    setValue("topic", item.topic);
    setValue("batchName", item.batchName);
    setValue("assignedTo", item.assignedTo);
    setValue("studentName", item.studentName);
    setValue("teacherName", item.teacherName);
    setValue("dueDate", dateInputValue(item.dueDate));
    setValue("maxMarks", String(item.maxMarks || 100));
    setValue("priority", item.priority);
    setValue("status", item.status);
    setValue("submissionStatus", item.submissionStatus);
    setValue("submissionsText", (item.submissions || []).map((s) => s.studentName).join("\n"));
    setValue("resourceLink", item.resourceLink);
    setValue("teacherRemarks", item.teacherRemarks);
    $("#assignmentFormHeading").textContent = "Edit Homework";
    $("#saveAssignmentBtn").textContent = "Update Homework";
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (action === "delete") {
    if (!confirm("Is assignment ko delete karna hai?")) return;
    try {
      const data = await apiRequest(`/assignments/${id}`, { method: "DELETE" });
      $("#assignmentsListMessage").textContent = `✅ ${data.message}`;
      await loadAssignments();
    } catch (error) {
      $("#assignmentsListMessage").textContent = `❌ ${error.message}`;
      logoutOnAuthError(error);
    }
    return;
  }

  if (["submitted", "checked"].includes(action)) {
    try {
      const data = await apiRequest(`/assignments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          submissionStatus: action,
          status: action === "checked" ? "closed" : item.status,
          teacherRemarks: action === "checked" ? (item.teacherRemarks || "Checked by teacher") : item.teacherRemarks,
        }),
      });
      $("#assignmentsListMessage").textContent = `✅ ${data.message}`;
      await loadAssignments();
    } catch (error) {
      $("#assignmentsListMessage").textContent = `❌ ${error.message}`;
      logoutOnAuthError(error);
    }
  }
});

["assignmentSearch", "subjectFilter", "statusFilter", "submissionFilter", "priorityFilter"].forEach((id) => {
  $(`#${id}`).addEventListener("input", loadAssignments);
  $(`#${id}`).addEventListener("change", loadAssignments);
});

$("#clearAssignmentBtn").addEventListener("click", clearAssignmentForm);
$("#sampleAssignmentBtn").addEventListener("click", fillSampleAssignment);
$("#refreshAssignmentsBtn").addEventListener("click", loadAssignments);
$("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("naxora_token");
  localStorage.removeItem("naxora_user");
  window.location.href = "index.html";
});

clearAssignmentForm();
loadAssignments();
