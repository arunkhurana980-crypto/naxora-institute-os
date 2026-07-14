const $ = (id) => document.getElementById(id);
const api = async (url, options) => {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};
function renderRows(rows=[]){return `<div class="list">${rows.map(r=>`<div class="row"><strong>${r.title||r.item||r.label||r.step||r.status}</strong><br><span class="muted">${r.action||r.reason||r.purpose||r.status||''}</span> ${r.status?`<span class="badge ${r.status}">${r.status}</span>`:''}</div>`).join('')}</div>`}
async function load(){
  try{
    const [ready, subs, go, demo, mon, backup] = await Promise.all([
      api('/api/part78/launch-readiness'), api('/api/part78/version-subscriptions'), api('/api/part78/go-live-plan'), api('/api/part78/demo-institute'), api('/api/part78/monitoring-plan'), api('/api/part78/backup-plan')
    ]);
    $('readinessBox').innerHTML = `<div class="badge">Score ${ready.readiness.score}% • ${ready.readiness.launchDecision}</div>${renderRows(ready.readiness.checks)}`;
    $('subscriptionsBox').innerHTML = Object.values(subs.subscriptions).map(v=>`<div class="row"><strong>${v.label}</strong><br><span class="muted">${v.purpose}</span><br><span class="badge">${v.status}</span> ${v.access?`<span class="badge">${v.access}</span>`:''}</div>`).join('');
    $('goLiveBox').innerHTML = renderRows(go.plan);
    $('demoBox').innerHTML = `<div class="row"><strong>${demo.plan.demoInstituteName}</strong><br><span class="muted">${demo.plan.purpose}</span></div>` + Object.entries(demo.plan.sampleData).map(([k,v])=>`<div class="row"><strong>${k}</strong>: ${Array.isArray(v)?v.join(', '):v}</div>`).join('');
    $('opsBox').innerHTML = `<div class="row"><strong>Monitoring</strong><br>${mon.plan.healthEndpoints.join('<br>')}</div><div class="row"><strong>Backup</strong><br>${backup.plan.databaseBackup}<br>${backup.plan.rollback}</div>`;
  }catch(e){ $('readinessBox').textContent = 'Load error: '+e.message; }
}
async function askVani(){
  $('vaniBox').textContent='Thinking...';
  try{
    const data = await api('/api/part78/vani/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'owner',command:$('vaniCommand').value})});
    $('vaniBox').textContent=JSON.stringify(data.result,null,2);
  }catch(e){$('vaniBox').textContent='Error: '+e.message}
}
$('runReadinessBtn')?.addEventListener('click', load);
$('vaniBtn')?.addEventListener('click', askVani);
load();
