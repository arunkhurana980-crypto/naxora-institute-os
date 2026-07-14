const $ = (id) => document.getElementById(id);
async function api(path, options = {}) {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}
function fmt(n){ return typeof n === "number" ? n.toLocaleString("en-IN") : n; }
function renderSummary(data){
  const totals = data?.summary?.totals || {};
  $("summaryGrid").innerHTML = [
    ["Allocated", fmt(totals.allocatedCredits || 0), "monthly credits"],
    ["Used", fmt(totals.usedCredits || 0), "credits consumed"],
    ["Reserved", fmt(totals.reservedCredits || 0), "reserved credits"],
    ["Remaining", fmt(totals.remainingCredits || 0), "available credits"]
  ].map(([label,value,small]) => `<article class="stat-card"><span>${label}</span><strong>${value}</strong><small>${small}</small></article>`).join("");
}
function renderPlans(plans){
  $("plansGrid").innerHTML = plans.map(plan => `<article class="plan-card"><h3>${plan.name}</h3><div class="credit-number">${fmt(plan.monthlyCredits)}</div><p>${plan.bestFor}</p><small>${plan.guardrail}</small></article>`).join("");
}
function renderTools(tools){
  $("toolCostList").innerHTML = tools.map(tool => `<div class="list-item"><h3>${tool.label}</h3><p>${tool.category}</p><strong>${tool.defaultCredits} credits/use</strong><br><small>${tool.status || "ready-foundation"}</small></div>`).join("");
}
function renderPackages(packages){
  $("packagesList").innerHTML = packages.map(pack => `<div class="list-item"><h3>${pack.label}</h3><p>${fmt(pack.credits)} credits</p><strong>Suggested: ₹${fmt(pack.suggestedPriceInr)}</strong><br><small>${pack.status}</small></div>`).join("");
}
function renderLogs(logs){
  if (!logs.length) { $("logsTable").innerHTML = `<p>No usage logs yet.</p>`; return; }
  $("logsTable").innerHTML = `<table class="usage-table"><thead><tr><th>Tool</th><th>Role</th><th>Credits</th><th>Status</th><th>Date</th></tr></thead><tbody>${logs.map(log => `<tr><td>${log.toolLabel || log.toolId}</td><td>${log.userRole || "-"}</td><td>${log.creditsUsed || 0}</td><td>${log.status || "recorded"}</td><td>${new Date(log.createdAt || Date.now()).toLocaleString()}</td></tr>`).join("")}</tbody></table>`;
}
async function load(){
  const [plans, summary, logs, packagesData] = await Promise.all([
    api("/api/part68/credit-plans"),
    api("/api/part68/usage-summary"),
    api("/api/part68/usage-logs"),
    api("/api/part68/extra-credit-packages")
  ]);
  renderSummary(summary);
  renderPlans(plans.plans || []);
  renderTools(plans.toolCostCatalog || []);
  renderPackages(packagesData.packages || []);
  renderLogs(logs.logs || []);
}
$("refreshBtn")?.addEventListener("click", load);
$("consumeForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const payload = Object.fromEntries(form.entries());
  payload.credits = Number(payload.credits || 0);
  $("consumeResult").textContent = "Recording safe usage log...";
  try {
    const data = await api("/api/part68/consume", { method: "POST", body: JSON.stringify(payload) });
    $("consumeResult").textContent = JSON.stringify(data, null, 2);
    await load();
  } catch (error) {
    $("consumeResult").textContent = JSON.stringify(error, null, 2);
  }
});
load().catch((error) => { console.error(error); $("summaryGrid").innerHTML = `<article class="stat-card"><span>Error</span><strong>Check</strong><small>${error.message || "API failed"}</small></article>`; });
