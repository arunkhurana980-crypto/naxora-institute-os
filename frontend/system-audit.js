const $ = (id) => document.getElementById(id);

function statusClass(status) {
  return `status ${status || 'warn'}`;
}

function safe(value) {
  if (value === null || value === undefined || value === '') return '--';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function renderEnv(env = {}) {
  const fields = [
    ['Environment', env.environment],
    ['DB Mode', env.dbMode],
    ['Mongo Ready State', env.mongoReadyState],
    ['Frontend URL', env.frontendUrl],
    ['JWT Secret', env.jwtSecret],
    ['Razorpay', env.razorpay],
    ['Internal Tools', env.internalToolsEnabled],
    ['Host', env.host],
    ['Time', env.timestamp]
  ];
  $('envBox').innerHTML = fields.map(([label, value]) => `
    <div class="info-item"><span>${label}</span><strong>${safe(value)}</strong></div>
  `).join('');
}

function renderTable(targetId, rows, columns) {
  if (!rows || !rows.length) {
    $(targetId).innerHTML = '<p>No data</p>';
    return;
  }
  const header = columns.map((c) => `<th>${c.label}</th>`).join('');
  const body = rows.map((row) => `
    <tr>
      ${columns.map((c) => {
        const value = c.render ? c.render(row) : row[c.key];
        return `<td>${value}</td>`;
      }).join('')}
    </tr>
  `).join('');
  $(targetId).innerHTML = `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

function renderFlows(flows = []) {
  $('flowsBox').innerHTML = flows.map((flow) => `
    <div class="flow-card">
      <h3>${flow.title}</h3>
      <small>${flow.steps.join(' → ')}</small>
      <p>${flow.expected}</p>
    </div>
  `).join('');
}

function renderChecklist(items = []) {
  $('checklistBox').innerHTML = items.map((item) => `<li>${item}</li>`).join('');
}

async function runAudit() {
  const btn = $('runAuditBtn');
  btn.disabled = true;
  btn.textContent = 'Running...';
  try {
    const res = await fetch('/api/part53/run');
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Audit failed');

    $('totalCount').textContent = data.summary.total;
    $('passCount').textContent = data.summary.pass;
    $('warnCount').textContent = data.summary.warn;
    $('failCount').textContent = data.summary.fail;
    $('launchGate').textContent = data.launchGate;
    $('nextStep').textContent = data.nextStep;

    renderEnv(data.env);
    renderTable('pagesTable', data.pages, [
      { label: 'Status', render: (r) => `<span class="${statusClass(r.status)}">${r.status}</span>` },
      { label: 'Group', key: 'group' },
      { label: 'Page', key: 'label' },
      { label: 'Clean Route', render: (r) => `<a href="${r.cleanRoute}" target="_blank">${r.cleanRoute}</a>` },
      { label: 'File', key: 'file' },
      { label: 'Action', key: 'action' }
    ]);
    renderTable('apisTable', data.apis, [
      { label: 'Status', render: (r) => `<span class="${statusClass(r.status)}">${r.status}</span>` },
      { label: 'Group', key: 'group' },
      { label: 'API', key: 'prefix' },
      { label: 'Method', key: 'method' },
      { label: 'Collection', render: (r) => safe(r.collection) },
      { label: 'Action', key: 'action' }
    ]);
    renderTable('dbTable', data.dbCollections, [
      { label: 'Status', render: (r) => `<span class="${statusClass(r.status)}">${r.status}</span>` },
      { label: 'Collection', key: 'collection' },
      { label: 'Count', render: (r) => safe(r.count) },
      { label: 'Note', key: 'note' }
    ]);
    renderFlows(data.criticalFlows);
    renderChecklist(data.manualChecklist);
  } catch (error) {
    $('nextStep').textContent = `Audit error: ${error.message}`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Run Audit';
  }
}

$('runAuditBtn').addEventListener('click', runAudit);
runAudit();
