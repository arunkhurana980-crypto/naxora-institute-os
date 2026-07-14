const $ = (id) => document.getElementById(id);

async function p65Json(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

function p65Item(title, body, pills = []) {
  return `<div class="p65-item"><strong>${title}</strong><div>${body || ""}</div><div>${pills.map(p => `<span class="p65-pill">${p}</span>`).join("")}</div></div>`;
}

async function loadPart65() {
  try {
    const [templates, queue, logs, analytics] = await Promise.all([
      p65Json('/api/part65/templates'),
      p65Json('/api/part65/queue'),
      p65Json('/api/part65/logs'),
      p65Json('/api/part65/analytics')
    ]);

    const a = analytics.analytics || {};
    $('p65Stats').innerHTML = `
      <article class="p65-card"><span>Total Messages</span><strong>${a.totalMessages || 0}</strong></article>
      <article class="p65-card"><span>Queued</span><strong>${a.queuedMessages || 0}</strong></article>
      <article class="p65-card"><span>Blocked Consent</span><strong>${a.blockedConsentRequired || 0}</strong></article>
      <article class="p65-card"><span>Delivery Logs</span><strong>${a.totalDeliveryLogs || 0}</strong></article>`;

    $('p65Templates').innerHTML = (templates.templates || []).map(t => p65Item(t.label, t.body, [t.type, ...(t.defaultChannels || [])])).join('') || 'No templates.';
    $('p65Queue').innerHTML = (queue.messages || []).slice(0, 8).map(m => p65Item(`${m.type} • ${m.recipient?.name || 'Recipient'}`, m.body, [m.status, ...(m.channels || [])])).join('') || 'No queued messages.';
    $('p65Logs').innerHTML = (logs.logs || []).slice(0, 12).map(l => p65Item(`${l.channel} • ${l.status}`, l.providerResponse, [l.messageId])).join('') || 'No delivery logs.';
  } catch (err) {
    console.error(err);
    $('p65Queue').innerHTML = `<div class="p65-item p65-warn">${err.message}</div>`;
  }
}

$('p65Form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const channels = form.getAll('channels');
  const payload = {
    type: form.get('type'),
    recipientName: form.get('recipientName'),
    phone: form.get('phone'),
    email: form.get('email'),
    channels,
    message: form.get('message'),
    consentAccepted: form.get('consentAccepted') === 'on'
  };
  await p65Json('/api/part65/send', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  await loadPart65();
});

$('p65SendDemo').addEventListener('click', async () => {
  await p65Json('/api/part65/reminders/fees', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ recipientName:'Demo Parent', phone:'+919999999999', channels:['whatsapp','sms','in_app'], consentAccepted:true, parentName:'Demo Parent', studentName:'Aarav Demo', pendingAmount:'2500', dueDate:'2026-07-20', instituteName:'NAXORA Demo Institute' })
  });
  await loadPart65();
});

loadPart65();
