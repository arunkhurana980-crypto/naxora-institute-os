const API = (() => {
  if (location.protocol.startsWith("http") && location.port === "5000") return "/api";
  return "http://127.0.0.1:5000/api";
})();

async function loadPlans() {
  const box = document.querySelector("#plans");
  if (!box) return;
  try {
    const res = await fetch(`${API}/landing/plans`);
    const data = await res.json();
    box.innerHTML = data.plans.map(plan => `
      <article class="price-card ${plan.popular ? "popular" : ""}">
        <h3>${plan.name}</h3>
        <div class="price">₹${plan.priceMonthly}<small>/month</small></div>
        <p>${plan.target}</p>
        <ul>${plan.features.map(f => `<li>${f}</li>`).join("")}</ul>
        <a href="#demo" class="btn ${plan.popular ? "primary" : "ghost"}" style="margin-top:18px">${plan.cta}</a>
      </article>
    `).join("");
  } catch (error) {
    box.innerHTML = `<p>Plans load nahi hue. Backend run karo: npm run dev</p>`;
  }
}

const demoForm = document.querySelector("#demoForm");
if (demoForm) {
  demoForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.querySelector("#formMsg");
    msg.textContent = "Submitting...";
    const payload = Object.fromEntries(new FormData(demoForm).entries());
    try {
      const res = await fetch(`${API}/landing/demo-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      msg.textContent = `✅ Demo request saved in ${data.mode} mode.`;
      demoForm.reset();
    } catch (error) {
      msg.textContent = `❌ ${error.message}. Backend running check karo.`;
    }
  });
}

loadPlans();
