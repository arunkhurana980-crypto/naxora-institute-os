const $ = (id) => document.getElementById(id);
const TOKEN_KEYS = ["naxoraToken", "naxora_token", "authToken", "accessToken", "token", "jwt"];
let plans = [];
let currentLocalSubscriptionId = "";

function findToken() {
  for (const storage of [sessionStorage, localStorage]) {
    for (const key of TOKEN_KEYS) {
      const value = storage.getItem(key);
      if (value && value.split(".").length === 3) return value;
    }
  }
  return "";
}

function token() {
  return $("jwtToken").value.trim() || sessionStorage.getItem("part114OwnerToken") || findToken();
}

function headers(json = false) {
  const result = {
    Authorization: `Bearer ${token()}`,
    "x-naxora-institute-id": $("instituteId").value.trim(),
  };
  if (json) result["Content-Type"] = "application/json";
  return result;
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `${response.status} ${response.statusText}`);
    error.data = data;
    throw error;
  }
  return data;
}

function protectedRequest(url, options = {}) {
  if (!token()) throw new Error("Owner JWT token required.");
  sessionStorage.setItem("part114OwnerToken", token());
  return request(url, options);
}

function pretty(value) { return JSON.stringify(value, null, 2); }
function busy(button, state) {
  button.dataset.label ||= button.textContent;
  button.disabled = state;
  button.textContent = state ? "Please wait…" : button.dataset.label;
}

async function loadStatus() {
  try {
    const data = await request("/api/part114/status");
    $("modeBadge").textContent = data.testModeLocked ? "TEST MODE" : "MODE CHECK";
    $("modeBadge").className = `badge ${data.testModeLocked ? "good" : "bad"}`;
    $("statusHeadline").textContent = data.testSubscriptionCreationEnabled ? "Test Checkout ready" : "Setup dependency pending";
    $("statusText").textContent = `Provider: ${data.providerReady ? "ready" : "pending"} • Part 113: ${data.planDependencyReady ? "ready" : "pending"} • Feature unlock: blocked`;
  } catch (error) {
    $("statusHeadline").textContent = "Part 114 status failed";
    $("statusText").textContent = error.message;
  }
}

function detectToken() {
  const existing = findToken();
  if (existing) {
    $("jwtToken").value = existing;
    sessionStorage.setItem("part114OwnerToken", existing);
    $("sessionOutput").textContent = "Existing owner token detected. Private input me hidden hai.";
  } else {
    $("sessionOutput").textContent = "Existing owner JWT detect nahi hua. Pehle owner login karein.";
  }
}

function selectPlanDefaults() {
  const plan = plans.find((item) => item.id === $("localPlanId").value);
  if (plan) $("totalCount").value = String(plan.defaultTotalCount || (plan.period === "yearly" ? 1 : 12));
}

async function loadPlans() {
  const button = $("loadPlansBtn"); busy(button, true);
  try {
    const data = await protectedRequest("/api/part114/plans", { headers: headers(false) });
    plans = data.plans || [];
    $("localPlanId").innerHTML = plans.length
      ? plans.map((plan) => `<option value="${plan.id}">${plan.name} • ₹${plan.amountRupees}/${plan.period}</option>`).join("")
      : '<option value="">No provider-created Part 113 plans</option>';
    $("planCards").innerHTML = plans.length
      ? plans.map((plan) => `<div class="plan"><strong>${plan.name}</strong><span>₹${plan.amountRupees} • ${plan.period} • ${plan.razorpayPlanId}</span></div>`).join("")
      : '<div class="plan"><strong>No eligible plan</strong><span>Part 113 me Test Plan create-confirmed karo.</span></div>';
    $("sessionOutput").textContent = pretty(data);
    selectPlanDefaults();
  } catch (error) {
    $("sessionOutput").textContent = pretty(error.data || { error: error.message });
  } finally { busy(button, false); }
}

async function createPreview() {
  const button = $("previewBtn"); busy(button, true);
  try {
    const data = await protectedRequest("/api/part114/subscription/preview", {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify({
        instituteId: $("instituteId").value,
        localPlanId: $("localPlanId").value,
        totalCount: Number($("totalCount").value),
        customerName: $("customerName").value,
        customerEmail: $("customerEmail").value,
        customerContact: $("customerContact").value,
        testDataConfirmed: $("testDataConfirmed").checked,
        consentAccepted: $("consentAccepted").checked,
      }),
    });
    currentLocalSubscriptionId = data.preview?.id || "";
    $("confirmationText").value = data.confirmationTextRequired || "";
    $("previewOutput").textContent = pretty(data);
  } catch (error) {
    $("previewOutput").textContent = pretty(error.data || { error: error.message });
  } finally { busy(button, false); }
}

async function createSubscription() {
  const button = $("createSubscriptionBtn"); busy(button, true);
  try {
    if (!currentLocalSubscriptionId) throw new Error("Pehle checkout preview banao.");
    const data = await protectedRequest("/api/part114/subscription/create-confirmed", {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify({
        instituteId: $("instituteId").value,
        localSubscriptionId: currentLocalSubscriptionId,
        confirmationText: $("confirmationText").value,
      }),
    });
    currentLocalSubscriptionId = data.subscription?.id || currentLocalSubscriptionId;
    $("previewOutput").textContent = pretty(data);
    $("checkoutOutput").textContent = data.checkoutReady
      ? "Test Subscription created. Authorise Test Subscription button dabao."
      : "Checkout not ready.";
  } catch (error) {
    $("previewOutput").textContent = pretty(error.data || { error: error.message });
  } finally { busy(button, false); }
}

async function openCheckout() {
  const button = $("openCheckoutBtn"); busy(button, true);
  try {
    if (!currentLocalSubscriptionId) throw new Error("Pehle confirmed Test Subscription create karo.");
    if (typeof window.Razorpay !== "function") throw new Error("Razorpay Checkout script load nahi hua. Internet/ad-blocker check karo.");
    const data = await protectedRequest(`/api/part114/checkout/options/${currentLocalSubscriptionId}`, { headers: headers(false) });
    $("checkoutOutput").textContent = "Opening Razorpay Test Checkout…";

    const options = {
      ...data.options,
      handler: async function (response) {
        $("checkoutOutput").textContent = "Checkout returned. Verifying on server…";
        try {
          const verified = await protectedRequest("/api/part114/checkout/verify", {
            method: "POST",
            headers: headers(true),
            body: JSON.stringify({
              instituteId: $("instituteId").value,
              localSubscriptionId: currentLocalSubscriptionId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          $("verificationOutput").textContent = pretty(verified);
          $("checkoutOutput").textContent = "Server signature verification completed.";
        } catch (error) {
          $("verificationOutput").textContent = pretty(error.data || { error: error.message });
          $("checkoutOutput").textContent = "Verification failed. Access not activated.";
        }
      },
      modal: {
        ondismiss: function () {
          $("checkoutOutput").textContent = "Checkout closed. No activation recorded unless server verification succeeded.";
        },
      },
    };

    const checkout = new Razorpay(options);
    checkout.on("payment.failed", function (response) {
      $("checkoutOutput").textContent = pretty({
        success: false,
        code: response.error?.code,
        description: response.error?.description,
        reason: response.error?.reason,
        step: response.error?.step,
      });
    });
    checkout.open();
  } catch (error) {
    $("checkoutOutput").textContent = pretty(error.data || { error: error.message });
  } finally { busy(button, false); }
}

async function refreshStatus() {
  const button = $("refreshStatusBtn"); busy(button, true);
  try {
    if (!currentLocalSubscriptionId) throw new Error("Local Test Subscription ID available nahi hai.");
    const data = await protectedRequest(`/api/part114/subscription/${currentLocalSubscriptionId}/refresh`, {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify({ instituteId: $("instituteId").value }),
    });
    $("verificationOutput").textContent = pretty(data);
  } catch (error) {
    $("verificationOutput").textContent = pretty(error.data || { error: error.message });
  } finally { busy(button, false); }
}

async function askVani() {
  const button = $("askVaniBtn"); busy(button, true);
  try {
    const data = await protectedRequest("/api/part114/vani/command", {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify({ instituteId: $("instituteId").value, command: $("vaniCommand").value }),
    });
    $("vaniOutput").textContent = pretty(data);
    if (data.spokenSafeSummary && "speechSynthesis" in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(data.spokenSafeSummary);
      utterance.lang = "hi-IN";
      speechSynthesis.speak(utterance);
    }
  } catch (error) {
    $("vaniOutput").textContent = pretty(error.data || { error: error.message });
  } finally { busy(button, false); }
}

async function loadRecords() {
  const button = $("loadSubscriptionsBtn"); busy(button, true);
  try {
    const data = await protectedRequest("/api/part114/subscriptions/local", { headers: headers(false) });
    $("recordsOutput").textContent = pretty(data);
  } catch (error) {
    $("recordsOutput").textContent = pretty(error.data || { error: error.message });
  } finally { busy(button, false); }
}

$("detectTokenBtn").addEventListener("click", detectToken);
$("loadPlansBtn").addEventListener("click", loadPlans);
$("localPlanId").addEventListener("change", selectPlanDefaults);
$("previewBtn").addEventListener("click", createPreview);
$("createSubscriptionBtn").addEventListener("click", createSubscription);
$("openCheckoutBtn").addEventListener("click", openCheckout);
$("refreshStatusBtn").addEventListener("click", refreshStatus);
$("askVaniBtn").addEventListener("click", askVani);
$("loadSubscriptionsBtn").addEventListener("click", loadRecords);

const initialToken = findToken();
if (initialToken) $("jwtToken").value = initialToken;
loadStatus();
