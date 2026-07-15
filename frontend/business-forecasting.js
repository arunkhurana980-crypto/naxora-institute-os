const $ = (id) => document.getElementById(id);

async function getJSON(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.replyText || data.message || `${res.status} ${res.statusText}`), { data });
  return data;
}

function item(title, text, tag = "") {
  return `<div class="item"><strong>${title}</strong><p>${text}</p>${tag ? `<span class="tag ${tag}">${tag}</span>` : ""}</div>`;
}

function metric(label, value) {
  return `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`;
}

function basePayload(extra = {}) {
  return {
    role: $("roleSelect").value,
    instituteId: $("instituteId").value,
    branchId: $("branchId").value,
    assignedBranchId: $("assignedBranchId").value,
    studentId: $("studentId").value,
    ...extra
  };
}

function renderResult(data) {
  const admission = data.admissionForecast || {};
  const revenue = data.revenueForecast || {};
  const cashflow = data.cashflowForecast || {};
  const capacity = data.capacityForecast || {};
  const risk = data.riskForecast || {};
  const scenarios = data.scenarioPlanning || {};
  const action = data.actionPlan || {};
  const scope = data.roleScopedSummary || {};
  const privacy = data.privacyPolicy || {};

  $("accessBox").textContent = JSON.stringify(data.access || {}, null, 2);
  $("vaniOutput").textContent = JSON.stringify({
    reply: data.replyText,
    nextAction: data.nextAction,
    disclaimer: data.disclaimer,
    privateScreenFirst: data.privateScreenFirst,
    confirmationRequiredFor: data.confirmationRequiredFor
  }, null, 2);

  $("admissionBox").innerHTML = [
    metric("Next 30 Days", admission.totalNext30Days || 0),
    metric("Next 60 Days", admission.totalNext60Days || 0),
    metric("Next 90 Days", admission.totalNext90Days || 0),
    metric("Branches", (admission.forecasts || []).length)
  ].join("");

  $("revenueBox").innerHTML = [
    item("Can View Financials", revenue.canViewFinancials ? "Yes" : "No", revenue.canViewFinancials ? "safe" : "block"),
    item("Forecast Collection 30 Days", `${revenue.forecastCollection30Days ?? "hidden"}`, "info"),
    item("Conservative", `${revenue.conservative30Days ?? "hidden"}`, "warn"),
    item("Optimistic", `${revenue.optimistic30Days ?? "hidden"}`, "safe"),
    item("Disclaimer", revenue.disclaimer || "Preview only", "warn")
  ].join("");

  $("cashflowBox").innerHTML = [
    item("Status", cashflow.cashflowStatus || "hidden", cashflow.cashflowStatus === "positive_preview" ? "safe" : "warn"),
    item("Expected Revenue", `${cashflow.expectedRevenue30Days ?? "hidden"}`, "info"),
    item("Expected Expenses", `${cashflow.expectedExpenses30Days ?? "hidden"}`, "info"),
    item("Net Cashflow Preview", `${cashflow.netCashflowPreview ?? "hidden"}`, "warn"),
    ...((cashflow.suggestions || []).map((s) => item("Suggestion", s, "info")))
  ].join("");

  $("capacityBox").innerHTML = (capacity.forecasts || []).map((c) => item(
    c.branchName,
    `Students ${c.projectedStudents30Days} • Teacher pressure ${c.teacherPressure}% • Classroom pressure ${c.classroomPressure}% • ${c.recommendation}`,
    c.capacityRisk === "stable_preview" ? "safe" : "warn"
  )).join("");

  $("riskBox").innerHTML = [
    item("Risk Count", `${(risk.risks || []).length} total • ${risk.highPriorityCount || 0} high`, (risk.highPriorityCount || 0) ? "warn" : "safe"),
    ...((risk.risks || []).map((r) => item(`${r.branchName} — ${r.type}`, r.message, r.level === "high" ? "block" : "warn")))
  ].join("");

  $("scenarioBox").innerHTML = [
    item("Can Create Scenario", scenarios.canCreateScenario ? "Yes" : "No", scenarios.canCreateScenario ? "safe" : "block"),
    item("Auto Apply Targets", scenarios.autoApplyTargets ? "On" : "Off", scenarios.autoApplyTargets ? "block" : "safe"),
    ...((scenarios.scenarios || []).map((s) => item(s.name, `Admissions ${s.admissions30Days} • Revenue ${s.revenue30Days} • ${s.assumption}`, "info")))
  ].join("");

  $("actionBox").innerHTML = [
    item("Can Create Action Plan", action.canCreateActionPlan ? "Yes" : "No", action.canCreateActionPlan ? "safe" : "block"),
    ...((action.actions || []).map((a, i) => item(`Action ${i + 1}`, a, "info"))),
    item("Auto Budget Change", action.autoBudgetChange ? "On" : "Off", action.autoBudgetChange ? "block" : "safe"),
    item("Auto Target Change", action.autoTargetChange ? "On" : "Off", action.autoTargetChange ? "block" : "safe")
  ].join("");

  $("scopeBox").innerHTML = [
    item("Scope", scope.scope || "Pending", "info"),
    item("Visible Data", JSON.stringify(scope.visibleData || {}, null, 0).slice(0, 260), "safe"),
    ...((scope.hiddenData || []).slice(0, 5).map((h) => item("Hidden data", h, "warn")))
  ].join("");

  $("privacyBox").innerHTML = [
    item("Private Screen First", privacy.privateScreenFirst ? "Yes" : "No", privacy.privateScreenFirst ? "safe" : "block"),
    item("Not Financial Advice", privacy.notFinancialAdvice ? "Yes" : "No", privacy.notFinancialAdvice ? "safe" : "warn"),
    item("Safety", privacy.safety || "Forecast is planning support only", "warn"),
    ...((privacy.sensitiveDataNotSpokenLoudly || []).slice(0, 5).map((x) => item("Not spoken loudly", x, "block")))
  ].join("");

  window.NaxoraVaniVoice?.speak(data.spokenSafeSummary || data.replyText);
}

async function loadStatus() {
  try {
    const data = await getJSON("/api/part106/status");
    $("statusText").textContent = data.status === "active" ? "Forecasting Active" : "Status Loaded";
    $("statusSub").textContent = "Admissions, revenue, cashflow and risks ready.";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function startVani() {
  try {
    const data = await getJSON("/api/part106/vani/greeting");
    $("vaniOutput").textContent = data.greeting;
    const result = window.NaxoraVaniVoice?.speak(data.greeting);
    if (result?.spoken === false) $("vaniOutput").textContent = `Voice not started: ${result.reason}`;
  } catch (err) {
    $("vaniOutput").textContent = err.message;
  }
}

function toggleMute() {
  const next = !window.NaxoraVaniVoice?.isMuted();
  window.NaxoraVaniVoice?.setMuted(next);
  $("muteVaniBtn").textContent = next ? "Unmute" : "Mute";
  $("vaniOutput").textContent = next ? "VANI muted." : "VANI unmuted.";
}

async function ask(command) {
  $("vaniOutput").textContent = "Thinking...";
  try {
    const data = await getJSON("/api/part106/vani/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(basePayload({ command: command || $("vaniCommand").value }))
    });
    renderResult(data);
  } catch (err) {
    $("vaniOutput").textContent = JSON.stringify(err.data || { error: err.message }, null, 2);
    if (err.data) renderResult(err.data);
  }
}

async function listenAndReply() {
  $("vaniOutput").textContent = "Listening...";
  try {
    if (!window.NaxoraVaniVoice?.listenSupported()) {
      $("vaniOutput").textContent = "Mic speech recognition supported nahi hai. Command type karke Ask VANI dabao.";
      return;
    }
    const result = await window.NaxoraVaniVoice.listen({ lang: "hi-IN" });
    const transcript = result.transcript || "";
    $("vaniCommand").value = transcript;
    $("vaniOutput").textContent = `Heard: ${transcript}\nThinking...`;
    await ask(transcript);
  } catch (err) {
    $("vaniOutput").textContent = `Listening failed: ${err.message}. Type command and press Ask VANI.`;
  }
}

function demo() {
  const command = "VANI, revenue forecast dikhao aur cashflow risk batao";
  $("vaniCommand").value = command;
  ask(command);
}

$("startVaniBtn").addEventListener("click", startVani);
$("listenVaniBtn").addEventListener("click", listenAndReply);
$("muteVaniBtn").addEventListener("click", toggleMute);
$("askVaniBtn").addEventListener("click", () => ask());
$("demoBtn").addEventListener("click", demo);
$("roleSelect").addEventListener("change", () => ask());

loadStatus();
demo();
