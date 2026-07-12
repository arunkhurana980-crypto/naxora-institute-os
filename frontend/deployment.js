const API = window.NAXORA_API || `${window.location.origin.includes('5000') ? window.location.origin : 'http://127.0.0.1:5000'}/api`;
const $ = (id) => document.getElementById(id);
const card = (title, value, note='') => `<div class="deploy-card"><span>${title}</span><b>${value}</b><small>${note}</small></div>`;
async function getJson(path, options){ const res = await fetch(`${API}${path}`, options); return res.json(); }
function list(items=[], type='ok'){ return items.map(x=>`<div class="check-item"><span class="${type}">${type==='ok'?'✅':'⚠️'}</span><div>${x}</div></div>`).join(''); }
async function load(){
  const msg=$('deployMessage');
  try{
    const [status, checklist, env] = await Promise.all([
      getJson('/deployment/status'),
      getJson('/deployment/checklist'),
      getJson('/deployment/env-check')
    ]);
    $('stats').innerHTML = [
      card('Build', status.part || 'Part 47','Production deployment final fix'),
      card('DB Mode', status.dbMode || 'starting','MongoDB/mock safe mode'),
      card('Frontend', status.frontend || '/app','Same-server hosting'),
      card('Routes', status.routes?.length || 0,'Deployment APIs')
    ].join('');
    $('checklist').innerHTML = list(checklist.checklist || []);
    $('warnings').innerHTML = env.warnings?.length ? list(env.warnings,'warn') : list(['No critical env warnings detected.'],'ok');
    $('commands').textContent = (status.commands || []).join('\n');
    $('envPreview').textContent = JSON.stringify(env.envPreview || {}, null, 2);
    msg.textContent = '✅ Deployment dashboard loaded.';
  }catch(err){ msg.textContent = '❌ Failed to fetch deployment status. Backend run karo aur /api/health check karo.'; }
}
$('refreshBtn')?.addEventListener('click',load);
load();
