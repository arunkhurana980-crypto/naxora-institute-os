const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
let mode = "login";
const tabs = document.querySelectorAll(".tabs button");
const signupFields = document.querySelector("#signupFields");
const message = document.querySelector("#message");

tabs.forEach((tab) => tab.addEventListener("click", () => {
  mode = tab.dataset.mode;
  tabs.forEach((item) => item.classList.toggle("active", item === tab));
  signupFields.hidden = mode !== "signup";
  document.querySelector("#formTitle").textContent = mode === "signup" ? "Join NAXORA" : "Welcome back";
  document.querySelector("#formText").textContent = mode === "signup" ? "Create your secure institute account." : "Continue to your NAXORA dashboard.";
  document.querySelector("#submitBtn").textContent = mode === "signup" ? "Create account" : "Login securely";
  message.textContent = "";
}));

document.querySelector("#authForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    email: document.querySelector("#email").value.trim(),
    password: document.querySelector("#password").value,
  };
  if (mode === "signup") {
    payload.name = document.querySelector("#name").value.trim();
    payload.role = document.querySelector("#role").value;
  }

  message.textContent = "Please wait…";
  try {
    const response = await fetch(`${API}/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Request failed");
    localStorage.setItem("naxora_token", data.token);
    localStorage.setItem("naxora_user", JSON.stringify(data.user));
    message.textContent = `✅ Success! Welcome ${data.user.name}`;
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 500);
  } catch (error) {
    message.textContent = `❌ ${error.message}`;
  }
});

const existingToken = localStorage.getItem("naxora_token");
if (existingToken) {
  message.textContent = "Already logged in. Opening dashboard…";
  setTimeout(() => { window.location.href = "dashboard.html"; }, 500);
}
