const api = (path, options) => fetch(path, { headers: { "Content-Type": "application/json" }, ...options }).then((res) => res.json());
const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

async function loadPart66() {
  const [status, plans, subs, payments, invoices, renewals, analytics] = await Promise.all([
    api("/api/part66/status"),
    api("/api/part66/plans"),
    api("/api/part66/subscriptions"),
    api("/api/part66/payments"),
    api("/api/part66/invoices"),
    api("/api/part66/renewals"),
    api("/api/part66/analytics")
  ]);

  document.getElementById("subsCount").textContent = analytics.analytics?.totalSubscriptions ?? subs.count ?? 0;
  document.getElementById("activeSubs").textContent = analytics.analytics?.activeSubscriptions ?? 0;
  document.getElementById("revenue").textContent = money(analytics.analytics?.totalRevenueInr || 0);
  document.getElementById("failedPayments").textContent = analytics.analytics?.failedPayments ?? 0;
  document.getElementById("razorpayBox").textContent = JSON.stringify(status.razorpay, null, 2);

  const planOptions = plans.plans.map((p) => `<option value="${p.planCode}">${p.name} - ${money(p.priceInr)}</option>`).join("");
  document.getElementById("planSelect").innerHTML = planOptions;
  document.getElementById("invoicePlanSelect").innerHTML = planOptions;
  document.getElementById("plansBox").innerHTML = plans.plans.map((p) => `
    <article class="p66-plan">
      <strong>${p.name}</strong>
      <div class="p66-price">${money(p.priceInr)}</div>
      <p>${p.billingCycle.toUpperCase()} • ${p.maxStudents} students • ${p.aiCredits} AI credits</p>
      <small>${p.features.join(" • ")}</small>
    </article>
  `).join("");

  document.getElementById("renewalsBox").innerHTML = (renewals.renewals || []).map((r) => `
    <div class="p66-row"><b>${r.instituteName}</b><br>${r.planName} • ${r.renewalStatus} • ${r.daysLeft} days left<br>${r.reminderMessage}</div>
  `).join("") || "<p>No renewal reminders.</p>";

  document.getElementById("paymentsBox").innerHTML = (payments.payments || []).slice(0, 8).map((p) => `
    <div class="p66-row"><b>${p.paymentId}</b><br>${p.instituteName} • ${p.planName}<br>${money(p.amountInr)} • ${p.status}</div>
  `).join("") || "<p>No payments yet.</p>";
}

document.getElementById("refreshBtn").addEventListener("click", loadPart66);

document.getElementById("orderForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.currentTarget).entries());
  body.amountInr = Number(body.amountInr || 0);
  const result = await api("/api/part66/orders/create", { method: "POST", body: JSON.stringify(body) });
  document.getElementById("orderResult").textContent = JSON.stringify(result, null, 2);
  await loadPart66();
});

document.getElementById("invoiceForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.currentTarget).entries());
  body.amountInr = Number(body.amountInr || 0);
  const result = await api("/api/part66/invoices/generate", { method: "POST", body: JSON.stringify(body) });
  document.getElementById("invoiceResult").textContent = JSON.stringify(result, null, 2);
  await loadPart66();
});

loadPart66().catch((error) => {
  document.getElementById("razorpayBox").textContent = `Part 66 load error: ${error.message}`;
});
