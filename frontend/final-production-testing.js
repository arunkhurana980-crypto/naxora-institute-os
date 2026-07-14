const qs=(s)=>document.querySelector(s);
async function getJSON(url,options){const res=await fetch(url,options);return res.json();}
function badge(status){return `<span class="part77-badge ${status||''}">${status||'info'}</span>`}
function renderRows(el,rows,labelKey='item'){el.classList.remove('loading');el.innerHTML=(rows||[]).map(x=>`<div class="part77-item"><strong>${x[labelKey]||x.module||x.endpoint||x.title}</strong>${badge(x.status)}<p>${x.reason||x.note||x.why||''}</p></div>`).join('')||'<div class="part77-item">No data found.</div>';}
async function loadPart77(){
  const smoke=await getJSON('/api/part77/run-smoke-test');
  const result=smoke.result||{}; const summary=result.summary||{};
  qs('#score').textContent=(summary.score||0)+'%'; qs('#passed').textContent=summary.passed||0; qs('#warnings').textContent=summary.warning||0; qs('#failed').textContent=summary.failed||0;
  const plan=await getJSON('/api/part77/testing-plan');
  qs('#testingAreas').classList.remove('loading');
  qs('#testingAreas').innerHTML=(plan.areas||[]).map(x=>`<div class="part77-item"><strong>${x.title}</strong><span class="part77-badge">${x.key}</span><p>${x.why}</p><p>${(x.checks||[]).join(' • ')}</p></div>`).join('');
  renderRows(qs('#moduleHealth'), result.sections?.moduleHealth?.modules||[], 'module');
  renderRows(qs('#securityAudit'), result.sections?.securityAudit?.rows||[]);
  renderRows(qs('#databaseAudit'), result.sections?.databaseAudit?.rows||[]);
  renderRows(qs('#paymentAudit'), result.sections?.paymentAudit?.rows||[]);
  renderRows(qs('#aiAudit'), result.sections?.aiLimitsAudit?.rows||[]);
  const perf=[...(result.sections?.performanceAudit?.rows||[]),...(result.sections?.backupAudit?.rows||[])]; renderRows(qs('#performanceAudit'), perf);
  const checklist=await getJSON('/api/part77/checklist'); qs('#checklist').innerHTML=(checklist.checklist||[]).map(x=>`<li>${x}</li>`).join('');
}
qs('#refreshBtn').addEventListener('click',loadPart77);
qs('#vaniBtn').addEventListener('click',async()=>{const res=await getJSON('/api/part77/vani/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'owner',command:qs('#vaniCommand').value})});qs('#vaniOutput').textContent=JSON.stringify(res,null,2);});
loadPart77().catch(err=>{document.body.insertAdjacentHTML('beforeend',`<pre>${err.message}</pre>`);});
