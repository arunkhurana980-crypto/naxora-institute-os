const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");
const savedUser = JSON.parse(localStorage.getItem("naxora_user") || "null");

const greeting = document.querySelector("#greeting");
const subtitle = document.querySelector("#subtitle");
const statsGrid = document.querySelector("#overview");
const moduleList = document.querySelector("#moduleList");
const quickActions = document.querySelector("#quickActions");
const profilePill = document.querySelector("#profilePill");
const profileInfo = document.querySelector("#profileInfo");
const dashboardMessage = document.querySelector("#dashboardMessage");

if (!token) {
  window.location.href = "index.html";
}

function roleLabel(role) {
  const labels = { admin: "Admin", teacher: "Teacher", student: "Student", parent: "Parent" };
  return labels[role] || "User";
}

function renderDashboard(data) {
  greeting.textContent = data.greeting;
  subtitle.textContent = `${data.institute} • ${roleLabel(data.role)} Dashboard`;
  profilePill.textContent = `${savedUser?.name || "User"} • ${roleLabel(data.role)}`;

  statsGrid.innerHTML = data.cards.map((card) => `
    <article class="stat-card">
      <div class="stat-icon">${card.icon}</div>
      <h3>${card.title}</h3>
      <div class="stat-value">${card.value}</div>
      <p class="stat-label">${card.label}</p>
    </article>
  `).join("");

  moduleList.innerHTML = data.roadmapModules.map((module) => `
    <div class="module-item">
      <div class="module-name"><span>${module.icon}</span><span>${module.name}</span></div>
      <span class="badge">${module.status}</span>
    </div>
  `).join("");

  quickActions.innerHTML = data.quickActions.map((action, index) => `
    <button class="action-btn" data-action="${action}">${index + 1}. ${action}</button>
  `).join("");

  profileInfo.textContent = `${savedUser?.name || "User"} | ${savedUser?.email || "email missing"} | Role: ${roleLabel(data.role)}`;
}

async function loadDashboard() {
  dashboardMessage.textContent = "Secure dashboard data loading…";
  try {
    const response = await fetch(`${API}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Dashboard load failed");
    renderDashboard(data);
    dashboardMessage.textContent = "✅ Dashboard connected with backend successfully.";
  } catch (error) {
    dashboardMessage.textContent = `❌ ${error.message}`;
    if (error.message.toLowerCase().includes("token") || error.message.toLowerCase().includes("login")) {
      localStorage.removeItem("naxora_token");
      localStorage.removeItem("naxora_user");
      setTimeout(() => (window.location.href = "index.html"), 900);
    }
  }
}

document.querySelector("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("naxora_token");
  localStorage.removeItem("naxora_user");
  window.location.href = "index.html";
});

document.querySelector("#refreshBtn").addEventListener("click", loadDashboard);

quickActions.addEventListener("click", (event) => {
  const btn = event.target.closest(".action-btn");
  if (!btn) return;

  if (["Add new student", "View all students"].includes(btn.dataset.action)) {
    window.location.href = "students.html";
    return;
  }

  if (["Add new teacher", "View all teachers"].includes(btn.dataset.action)) {
    window.location.href = "teachers.html";
    return;
  }

  if (["Add staff member", "View staff"].includes(btn.dataset.action)) {
    window.location.href = "staff.html";
    return;
  }

  if (["Add parent profile", "View parent portal"].includes(btn.dataset.action)) {
    window.location.href = "parents.html";
    return;
  }

  if (["Add progress report", "View progress"].includes(btn.dataset.action)) {
    window.location.href = "progress.html";
    return;
  }

  if (["Create course", "Create batch", "View courses and batches"].includes(btn.dataset.action)) {
    window.location.href = "batches.html";
    return;
  }

  if (["Mark attendance", "View attendance report"].includes(btn.dataset.action)) {
    window.location.href = "attendance.html";
    return;
  }

  if (["Add fee record", "View fee collection"].includes(btn.dataset.action)) {
    window.location.href = "fees.html";
    return;
  }

  if (["Ask AI doubt", "View doubt history"].includes(btn.dataset.action)) {
    window.location.href = "doubts.html";
    return;
  }

  if (["Schedule live class", "View live classes", "Live class subscription"].includes(btn.dataset.action)) {
    window.location.href = "live-classes.html";
    return;
  }

  if (["Create notification", "View notifications"].includes(btn.dataset.action)) {
    window.location.href = "notifications.html";
    return;
  }

  if (["Add homework", "View assignments"].includes(btn.dataset.action)) {
    window.location.href = "assignments.html";
    return;
  }

  if (["Create test", "View results"].includes(btn.dataset.action)) {
    window.location.href = "tests.html";
    return;
  }

  if (["Build question paper", "View question papers"].includes(btn.dataset.action)) {
    window.location.href = "test-builder.html";
    return;
  }

  if (["Add bank question", "View question bank"].includes(btn.dataset.action)) {
    window.location.href = "question-bank.html";
    return;
  }

  if (["Add timetable slot", "View weekly timetable"].includes(btn.dataset.action)) {
    window.location.href = "timetable.html";
    return;
  }

  if (["Add enquiry", "View enquiries"].includes(btn.dataset.action)) {
    window.location.href = "enquiries.html";
    return;
  }

  if (["Today follow-ups", "Hot lead board"].includes(btn.dataset.action)) {
    window.location.href = "followups.html";
    return;
  }

  if (["Add subscription", "View subscriptions"].includes(btn.dataset.action)) {
    window.location.href = "subscriptions.html";
    return;
  }

  if (["Add payment record", "View payments"].includes(btn.dataset.action)) {
    window.location.href = "payments.html";
    return;
  }

  if (["Open super admin", "View institutes", "SaaS control room"].includes(btn.dataset.action)) {
    window.location.href = "super-admin.html";
    return;
  }

  if (["Create announcement", "View announcements"].includes(btn.dataset.action)) {
    window.location.href = "announcements.html";
    return;
  }

  if (["Create certificate", "Generate ID card"].includes(btn.dataset.action)) {
    window.location.href = "certificates.html";
    return;
  }

  if (["Add study material", "View library"].includes(btn.dataset.action)) {
    window.location.href = "library.html";
    return;
  }

  if (["Add income", "Add expense", "View finance report"].includes(btn.dataset.action)) {
    window.location.href = "finance.html";
    return;
  }

  dashboardMessage.textContent = `ℹ️ "${btn.dataset.action}" ka real database form next parts me banega.`;
});

loadDashboard();
