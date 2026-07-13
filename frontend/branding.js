const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const statusBox = document.querySelector("#brandStatus");

async function loadBrandStatus() {
  if (!statusBox) return;
  try {
    const response = await fetch(`${API}/part54/status`);
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || "Part 54 status failed");
    statusBox.classList.add("ok");
    statusBox.textContent = `✅ ${data.part} active. ${data.purpose}`;
  } catch (error) {
    statusBox.classList.add("fail");
    statusBox.textContent = `❌ Brand API check failed: ${error.message}`;
  }
}

loadBrandStatus();
