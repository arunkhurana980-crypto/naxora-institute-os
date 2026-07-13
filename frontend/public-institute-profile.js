const $ = (id) => document.getElementById(id);
let currentProfile = null;

async function api(path, options = {}) {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

function money(min, max, currency = "INR") {
  const fmt = (n) => Number(n || 0).toLocaleString("en-IN");
  if (!min && !max) return "Fees on request";
  if (min && max) return `${currency} ${fmt(min)} – ${fmt(max)}`;
  return `${currency} ${fmt(min || max)}`;
}

function renderProfile(profile) {
  currentProfile = profile;
  $("profileId").value = profile.profileId || "";
  $("profileName").textContent = profile.name || "Institute Profile";
  $("profileTagline").textContent = profile.tagline || "Public institute profile";
  $("profileDesc").textContent = profile.description || "Profile description yahan dikhegi.";
  $("profileStatus").textContent = profile.status || "draft";
  if (profile.logoUrl) $("profileLogo").src = profile.logoUrl;
  if (profile.bannerUrl) $("profileHero").style.background = `linear-gradient(120deg, rgba(8,11,18,0.86), rgba(11,24,46,0.84)), url('${profile.bannerUrl}') center/cover`;

  const contact = profile.contact || {};
  $("contactRow").innerHTML = [contact.phone && `📞 ${contact.phone}`, contact.email && `✉️ ${contact.email}`, contact.website && `🌐 ${contact.website}`].filter(Boolean).map(x => `<span class="chip">${x}</span>`).join("") || '<span class="chip">Contact hidden/not added</span>';

  const address = profile.address || {};
  $("addressCard").innerHTML = `<strong>Address</strong><p class="muted">${[address.line1, address.area, address.city, address.state, address.pincode].filter(Boolean).join(", ") || "Address not added"}</p>`;

  $("coursesList").innerHTML = (profile.courses || []).map(course => `<div class="item-card"><strong>${course.name}</strong><span class="muted">${[course.classLevel, course.duration, course.mode].filter(Boolean).join(" · ")}</span><p>${money(course.feeMin, course.feeMax, profile.feeRange?.currency)}</p><p class="muted">${course.highlight || ""}</p></div>`).join("") || '<p class="muted">No courses added yet.</p>';
  $("teachersList").innerHTML = (profile.teachers || []).map(t => `<div class="item-card"><strong>${t.name}</strong><span class="muted">${[t.subject, t.experience].filter(Boolean).join(" · ")}</span><p class="muted">${t.bio || ""}</p></div>`).join("") || '<p class="muted">No teachers added yet.</p>';
  $("resultsList").innerHTML = (profile.results || []).map(r => `<div class="item-card"><strong>${r.exam || "Result"} ${r.year || ""}</strong><p>${r.achievement || ""}</p><span class="muted">${r.studentName || ""}</span></div>`).join("") || '<p class="muted">No result highlights added yet.</p>';
  $("facilitiesList").innerHTML = (profile.facilities || []).map(f => `<span class="chip">${f}</span>`).join("") || '<span class="chip">Facilities not added</span>';
  const photos = profile.media?.photoUrls || [];
  const videos = profile.media?.videoUrls || [];
  $("mediaList").innerHTML = [...photos.map((url) => `<div class="media-box"><img src="${url}" alt="Institute photo" style="width:100%;height:100%;object-fit:cover"></div>`), ...videos.map((url) => `<div class="media-box">🎬 Video<br><small>${url}</small></div>`)].join("") || '<div class="media-box">Photos/Videos not added</div>';
}

function fillForm(profile) {
  $("name").value = profile.name || "";
  $("tagline").value = profile.tagline || "";
  $("description").value = profile.description || "";
  $("phone").value = profile.contact?.phone || "";
  $("email").value = profile.contact?.email || "";
  $("logoUrl").value = profile.logoUrl || "";
  $("bannerUrl").value = profile.bannerUrl || "";
  $("facilities").value = (profile.facilities || []).join(", ");
  $("minimumFee").value = profile.feeRange?.minimum || "";
  $("maximumFee").value = profile.feeRange?.maximum || "";
  $("feeNote").value = profile.feeRange?.note || "";
  $("weekdaysTiming").value = profile.timings?.weekdays || "";
  $("weekendTiming").value = profile.timings?.weekend || "";
  $("addressLine1").value = profile.address?.line1 || "";
  $("city").value = profile.address?.city || "";
  $("state").value = profile.address?.state || "";
  $("pincode").value = profile.address?.pincode || "";
}

async function loadDemo() {
  const data = await api("/api/part59/profile");
  renderProfile(data.profile);
  fillForm(data.profile);
}

$("loadDemoBtn").addEventListener("click", loadDemo);

$("profileForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    name: $("name").value,
    tagline: $("tagline").value,
    description: $("description").value,
    phone: $("phone").value,
    email: $("email").value,
    logoUrl: $("logoUrl").value,
    bannerUrl: $("bannerUrl").value,
    facilities: $("facilities").value,
    minimumFee: $("minimumFee").value,
    maximumFee: $("maximumFee").value,
    feeNote: $("feeNote").value,
    weekdaysTiming: $("weekdaysTiming").value,
    weekendTiming: $("weekendTiming").value,
    addressLine1: $("addressLine1").value,
    city: $("city").value,
    state: $("state").value,
    pincode: $("pincode").value,
    courses: currentProfile?.courses || [],
    teachers: currentProfile?.teachers || [],
    results: currentProfile?.results || [],
    media: currentProfile?.media || { photoUrls: [], videoUrls: [] },
    status: currentProfile?.status || "draft"
  };
  const id = $("profileId").value;
  const data = id ? await api(`/api/part59/profile/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) }) : await api("/api/part59/profile", { method: "POST", body: JSON.stringify(payload) });
  renderProfile(data.profile);
  fillForm(data.profile);
  alert("Public institute profile saved ✅");
});

$("courseForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentProfile?.profileId) return alert("Pehle profile save/load karo.");
  const payload = { name: $("courseName").value, classLevel: $("classLevel").value, duration: $("duration").value, mode: $("mode").value };
  const data = await api(`/api/part59/profile/${encodeURIComponent(currentProfile.profileId)}/courses`, { method: "POST", body: JSON.stringify(payload) });
  renderProfile(data.profile);
  event.target.reset();
});

$("publishBtn").addEventListener("click", async () => {
  if (!currentProfile?.profileId) return alert("Pehle profile save/load karo.");
  const data = await api(`/api/part59/profile/${encodeURIComponent(currentProfile.profileId)}/publish`, { method: "PATCH", body: JSON.stringify({ status: "published" }) });
  renderProfile(data.profile);
  alert("Profile published ✅");
});

$("searchBtn").addEventListener("click", async () => {
  const data = await api("/api/part59/search?status=all");
  $("searchResults").innerHTML = data.profiles.map(p => `<div class="item-card"><strong>${p.name}</strong><p class="muted">${p.tagline || ""}</p><span class="chip">${p.status}</span><span class="chip">${p.address?.city || "City not added"}</span></div>`).join("") || '<p class="muted">No profiles found.</p>';
});

loadDemo().catch((error) => console.error(error));
