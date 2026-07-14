const qs=(s)=>document.querySelector(s);
async function getJSON(url,options){const res=await fetch(url,options);return res.json();}
function renderList(el,items,mapper){el.classList.remove('loading');el.innerHTML=(items||[]).map(mapper).join('')||'<div class="part75-item">No data found.</div>';}
async function loadPart75(){
  const demo=await getJSON('/api/part75/demo');
  const data=demo.demo||{};
  qs('#toolCount').textContent=(data.tools||[]).length;
  qs('#plannerDays').textContent=(data.studyPlanner?.days||[]).length;
  qs('#flashcardCount').textContent=(data.flashcards||[]).length;
  qs('#vaniMode').textContent='Private';
  renderList(qs('#plannerOutput'),data.studyPlanner?.days||[],d=>`<div class="part75-item"><strong>${d.day}</strong><span class="part75-badge">${d.minutes} min</span><p>${d.focus}</p></div>`);
  renderList(qs('#coachOutput'),data.weakTopicCoach||[],x=>`<div class="part75-item"><strong>${x.topic}</strong><span class="part75-badge">${x.level}</span><p>${x.plan}</p></div>`);
  renderList(qs('#flashcardsOutput'),data.flashcards||[],x=>`<div class="part75-item"><strong>Q:</strong> ${x.question}<p><strong>A:</strong> ${x.answer}</p></div>`);
  renderList(qs('#recommendOutput'),data.instituteRecommendations||[],x=>`<div class="part75-item"><strong>${x.name}</strong><span class="part75-badge">${x.matchScore}% match</span><p>${x.reason}</p></div>`);
  renderList(qs('#rolesOutput'),Object.entries(data.roleRules||{}),([role,rule])=>`<div class="part75-item"><strong>${role}</strong><p>${rule}</p></div>`);
  const checklist=await getJSON('/api/part75/checklist');qs('#checklist').innerHTML=(checklist.checklist||[]).map(x=>`<li>${x}</li>`).join('');
}
qs('#plannerBtn').addEventListener('click',async()=>{const params=new URLSearchParams({studentName:qs('#studentInput').value||'Aman Sharma',goal:qs('#goalInput').value||'Class 10 Boards + JEE Foundation',weakTopic:qs('#topicInput').value||'Quadratic Equations',dailyMinutes:qs('#minutesInput').value||'60',role:'student'});const res=await getJSON('/api/part75/study-planner?'+params.toString());renderList(qs('#plannerOutput'),res.plan?.days||[],d=>`<div class="part75-item"><strong>${d.day}</strong><span class="part75-badge">${d.minutes} min</span><p>${d.focus}</p></div>`);});
qs('#vaniBtn').addEventListener('click',async()=>{const res=await getJSON('/api/part75/vani/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'student',command:qs('#vaniCommand').value,studentName:qs('#studentInput').value||'Aman Sharma',weakTopic:qs('#topicInput').value||'Quadratic Equations',goal:qs('#goalInput').value||'Class 10 Boards'})});qs('#vaniOutput').textContent=JSON.stringify(res,null,2);});
loadPart75().catch(err=>{document.body.insertAdjacentHTML('beforeend',`<pre>${err.message}</pre>`);});