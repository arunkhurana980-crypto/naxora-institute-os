const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);

const statusBox = document.querySelector("#part55Status");
const roleCards = document.querySelector("#roleCards");
const roleSelect = document.querySelector("#roleSelect");
const permissionSelect = document.querySelector("#permissionSelect");
const accessResult = document.querySelector("#accessResult");
const matrixBody = document.querySelector("#matrixBody");
const protectedAreas = document.querySelector("#protectedAreas");
const checkAccessBtn = document.querySelector("#checkAccessBtn");

function setStatus(type, message) {
  if (!statusBox) return;
  statusBox.classList.remove("ok", "fail");
  statusBox.classList.add(type);
  statusBox.textContent = message;
}

function renderRoles(roles) {
  if (!roleCards || !roleSelect) return;
  roleCards.innerHTML = roles.map((role) => `
    <article class="role-card">
      <span class="role-badge">${role.badge}</span>
      <h3>${role.label}</h3>
      <p>${role.description}</p>
      <p><strong>Scope:</strong> ${role.scope} · <strong>Default:</strong> ${role.defaultLanding}</p>
    </article>
  `).join("");
  roleSelect.innerHTML = roles.map((role) => `<option value="${role.key}">${role.label}</option>`).join("");
}

function renderPermissions(permissions) {
  if (!permissionSelect) return;
  permissionSelect.innerHTML = permissions.map((permission) => `<option value="${permission.key}">${permission.key} — ${permission.title}</option>`).join("");
}

function renderMatrix(matrix) {
  if (!matrixBody) return;
  matrixBody.innerHTML = matrix.map((role) => `
    <tr>
      <td><strong>${role.label}</strong><br><small>${role.key}</small></td>
      <td>${role.scope}</td>
      <td>
        <div class="permission-tags">
          ${(role.hasFullAccess ? ["ALL PERMISSIONS"] : role.permissions).slice(0, 14).map((item) => `<span class="permission-tag">${item}</span>`).join("")}
          ${!role.hasFullAccess && role.permissions.length > 14 ? `<span class="permission-tag">+${role.permissions.length - 14} more</span>` : ""}
        </div>
      </td>
      <td>${role.defaultLanding}</td>
    </tr>
  `).join("");
}

function renderProtectedAreas(areas) {
  if (!protectedAreas) return;
  protectedAreas.innerHTML = areas.map((area) => `
    <article class="protected-card">
      <h3>${area.area}</h3>
      <p><strong>Route:</strong> ${area.route}</p>
      <p><strong>API:</strong> ${area.api}</p>
      <p><strong>Allowed:</strong> ${area.allowedRoles.join(", ")}</p>
    </article>
  `).join("");
}

async function fetchJson(path) {
  const response = await fetch(`${API}${path}`);
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || `${path} failed`);
  return data;
}

async function loadPart55() {
  try {
    const [status, roles, matrix, areas] = await Promise.all([
      fetchJson("/part55/status"),
      fetchJson("/part55/roles"),
      fetchJson("/part55/matrix"),
      fetchJson("/part55/protected-areas")
    ]);
    setStatus("ok", `✅ ${status.part} active. ${status.totalRoles} roles and ${status.totalPermissions} permissions ready.`);
    renderRoles(roles.roles);
    renderPermissions(matrix.permissions);
    renderMatrix(matrix.matrix);
    renderProtectedAreas(areas.protectedAreas);
  } catch (error) {
    setStatus("fail", `❌ Part 55 API check failed: ${error.message}`);
  }
}

async function checkAccess() {
  if (!roleSelect || !permissionSelect || !accessResult) return;
  const role = roleSelect.value;
  const permission = permissionSelect.value;
  accessResult.classList.remove("ok", "fail");
  accessResult.textContent = "Checking…";
  try {
    const data = await fetchJson(`/part55/check-access?role=${encodeURIComponent(role)}&permission=${encodeURIComponent(permission)}`);
    accessResult.classList.add(data.allowed ? "ok" : "fail");
    accessResult.textContent = data.allowed
      ? `✅ Allowed: ${role} can use ${permission}`
      : `⛔ Not allowed: ${role} cannot use ${permission}`;
  } catch (error) {
    accessResult.classList.add("fail");
    accessResult.textContent = `❌ ${error.message}`;
  }
}

checkAccessBtn?.addEventListener("click", checkAccess);
loadPart55();
