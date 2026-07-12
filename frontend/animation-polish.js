const revealEls = document.querySelectorAll('.section-reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('is-visible');
  });
}, { threshold: 0.12 });
revealEls.forEach((el) => io.observe(el));

const counters = document.querySelectorAll('[data-count]');
let countersStarted = false;
function runCounters(){
  if(countersStarted) return;
  countersStarted = true;
  counters.forEach((el)=>{
    const target = Number(el.dataset.count || 0);
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 45));
    const timer = setInterval(()=>{
      current += step;
      if(current >= target){ current = target; clearInterval(timer); }
      el.textContent = current;
    }, 24);
  });
}
setTimeout(runCounters, 800);

document.querySelectorAll('.tilt').forEach((card)=>{
  card.addEventListener('mousemove', (e)=>{
    const r = card.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const rx = ((y / r.height) - 0.5) * -8;
    const ry = ((x / r.width) - 0.5) * 8;
    card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-8px)`;
  });
  card.addEventListener('mouseleave', ()=>{ card.style.transform = ''; });
});

document.querySelectorAll('.magnetic').forEach((btn)=>{
  btn.addEventListener('mousemove', (e)=>{
    const r = btn.getBoundingClientRect();
    btn.style.transform = `translate(${(e.clientX-r.left-r.width/2)/6}px, ${(e.clientY-r.top-r.height/2)/6}px)`;
  });
  btn.addEventListener('mouseleave', ()=>{ btn.style.transform = ''; });
});

const form = document.getElementById('demoForm');
if(form){
  form.addEventListener('submit',(e)=>{
    e.preventDefault();
    document.getElementById('formMsg').textContent = 'Demo request saved in premium mock mode. Backend integration: /api/landing/demo-request';
  });
}
