const qs=(s)=>document.querySelector(s);
async function getJSON(url,options){const res=await fetch(url,options);return res.json();}
function renderList(el,items,mapper){el.classList.remove('loading');el.innerHTML=(items||[]).map(mapper).join('')||'<div class="part76-item">No data found.</div>';}
function money(n){return '₹'+Number(n||0).toLocaleString('en-IN');}
async function loadPart76(){
  const demo=await getJSON('/api/part76/demo');
  const data=demo.demo||{};
  qs('#setupCount').textContent=data.setups?.length||1;
  qs('#quoteTotal').textContent=money(data.quotation?.total||0);
  qs('#installStage').textContent=data.installation?.currentStage||'Survey';
  qs('#warrantyCount').textContent=data.warranty?.items?.length||0;
  renderList(qs('#surveyOutput'),data.siteSurvey?.points||[],x=>`<div class="part76-item"><strong>${x.label}</strong><span class="part76-badge">${x.status}</span><p>${x.value}</p></div>`);
  renderList(qs('#quoteOutput'),data.quotation?.items||[],x=>`<div class="part76-item"><strong>${x.item}</strong><span class="part76-badge">${money(x.amount)}</span><p>${x.reason}</p></div>`);
  renderList(qs('#vendorOutput'),data.vendors||[],x=>`<div class="part76-item"><strong>${x.name}</strong><span class="part76-badge">${x.type}</span><p>${x.contact} • ${x.status}</p></div>`);
  renderList(qs('#installOutput'),data.installation?.stages||[],x=>`<div class="part76-item"><strong>${x.stage}</strong><span class="part76-badge">${x.status}</span><p>${x.note}</p></div>`);
  renderList(qs('#warrantyOutput'),data.warranty?.items||[],x=>`<div class="part76-item"><strong>${x.item}</strong><span class="part76-badge">${x.months} months</span><p>${x.note}</p></div>`);
  const checklist=await getJSON('/api/part76/checklist');qs('#checklist').innerHTML=(checklist.checklist||[]).map(x=>`<li>${x}</li>`).join('');
}
qs('#surveyBtn').addEventListener('click',async()=>{const body={role:'owner',instituteName:qs('#instituteInput').value,room:qs('#roomInput').value,roomSize:qs('#sizeInput').value,teachingMode:qs('#modeInput').value};const res=await getJSON('/api/part76/site-survey',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});renderList(qs('#surveyOutput'),res.survey?.points||[],x=>`<div class="part76-item"><strong>${x.label}</strong><span class="part76-badge">${x.status}</span><p>${x.value}</p></div>`);});
qs('#vaniBtn').addEventListener('click',async()=>{const res=await getJSON('/api/part76/vani/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'owner',command:qs('#vaniCommand').value,instituteName:qs('#instituteInput').value,room:qs('#roomInput').value})});qs('#vaniOutput').textContent=JSON.stringify(res,null,2);});
loadPart76().catch(err=>{document.body.insertAdjacentHTML('beforeend',`<pre>${err.message}</pre>`);});