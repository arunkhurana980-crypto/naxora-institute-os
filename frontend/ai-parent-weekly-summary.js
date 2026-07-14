const qs=(s)=>document.querySelector(s);const money=(n)=>`₹${Number(n||0).toLocaleString('en-IN')}`;
async function getJSON(url,options){const res=await fetch(url,options);return res.json();}
function renderList(el,items,mapper){el.classList.remove('loading');el.innerHTML=(items||[]).map(mapper).join('')||'<div class="part74-item">No data found.</div>';}
async function loadPart74(){
  const demo=await getJSON('/api/part74/demo');
  const data=demo.demo||{};
  qs('#draftCount').textContent=(data.draftTypes||[]).length;
  qs('#weeklyRevenue').textContent=money(data.weeklySummary?.revenue?.collected||0);
  qs('#attendanceAvg').textContent=(data.weeklySummary?.attendance?.average||0)+'%';
  qs('#admissionCount').textContent=data.weeklySummary?.admissions?.converted||0;
  renderList(qs('#revenueSummary'),[data.weeklySummary?.revenue],r=>`<div class="part74-item"><strong>Collected:</strong> ${money(r.collected)} <span class="part74-badge">Pending ${money(r.pending)}</span><p>${r.insight}</p></div>`);
  renderList(qs('#attendanceSummary'),[data.weeklySummary?.attendance],a=>`<div class="part74-item"><strong>Average:</strong> ${a.average}% <span class="part74-badge">Concern ${a.concernStudents}</span><p>${a.insight}</p></div>`);
  renderList(qs('#admissionSummary'),[data.weeklySummary?.admissions],a=>`<div class="part74-item"><strong>Enquiries:</strong> ${a.newEnquiries} <span class="part74-badge">Converted ${a.converted}</span><p>${a.insight}</p></div>`);
  renderList(qs('#resultExplanation'),data.resultExplanations||[],x=>`<div class="part74-item"><strong>${x.studentName}</strong> <span class="part74-badge">${x.subject}</span><p>${x.explanation}</p></div>`);
  const checklist=await getJSON('/api/part74/checklist');qs('#checklist').innerHTML=(checklist.checklist||[]).map(x=>`<li>${x}</li>`).join('');
}
qs('#draftBtn').addEventListener('click',async()=>{const payload={studentName:qs('#studentInput').value||'Aman Sharma',parentName:qs('#parentInput').value||'Rakesh ji',messageType:qs('#messageType').value,language:qs('#languageInput').value,role:'owner'};const res=await getJSON('/api/part74/parent-message-draft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});qs('#draftOutput').textContent=JSON.stringify(res,null,2);});
qs('#vaniBtn').addEventListener('click',async()=>{const res=await getJSON('/api/part74/vani/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'owner',command:qs('#vaniCommand').value})});qs('#vaniOutput').textContent=JSON.stringify(res,null,2);});
loadPart74().catch(err=>{console.error(err);document.body.insertAdjacentHTML('beforeend','<pre style="color:#fecaca">'+err.message+'</pre>')});
