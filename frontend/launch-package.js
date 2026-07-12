const API = window.location.origin.includes('5000') ? window.location.origin + '/api' : 'http://127.0.0.1:5000/api';
const $ = (id) => document.getElementById(id);
let cachedPitch = '';

function renderList(id, items) {
  $(id).innerHTML = (items || []).map((item, index) => {
    if (typeof item === 'string') return `<div class="item"><strong>${index + 1}.</strong> ${item}</div>`;
    return `<div class="item"><strong>${item.title || item.label || `Step ${index + 1}`}</strong><br>${item.text || item.description || item.action || ''}</div>`;
  }).join('');
}

async function loadLaunchPackage() {
  $('message').textContent = 'Loading launch package...';
  try {
    const res = await fetch(`${API}/launch-package`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Launch package failed');
    $('statusText').textContent = `${data.part} · ${data.status} · ${data.freeFirst ? 'Free-first plan active' : 'Paid setup'}`;
    $('statusPills').innerHTML = data.highlights.map(h => `<span class="pill">${h}</span>`).join('');
    renderList('checklist', data.launchChecklist);
    renderList('freePlan', data.freeDeploymentPlan);
    renderList('onboarding', data.clientOnboardingChecklist);
    cachedPitch = data.whatsappPitch;
    $('whatsappPitch').textContent = cachedPitch;
    $('videoScript').innerHTML = data.demoVideoScript.map(step => `<div class="step"><div class="time">${step.time}</div><div><strong>${step.title}</strong><p>${step.script}</p><small>${step.open}</small></div></div>`).join('');
    $('links').innerHTML = data.finalLinks.map(link => `<a href="${link.url}">${link.label}</a>`).join('');
    $('message').textContent = 'Part 50 launch package ready.';
  } catch (err) {
    $('message').textContent = `❌ ${err.message}`;
  }
}

$('loadBtn').addEventListener('click', loadLaunchPackage);
$('copyPitchBtn').addEventListener('click', async () => {
  if (!cachedPitch) await loadLaunchPackage();
  await navigator.clipboard.writeText(cachedPitch);
  $('message').textContent = 'WhatsApp pitch copied.';
});
$('printBtn').addEventListener('click', () => window.print());
loadLaunchPackage();
