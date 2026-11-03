// مصدر البيانات: بدّل هذه الدالة فقط عند الحصول على مفتاح API (انظر README)
async function loadMatches(){
  const r = await fetch('data/matches.json');
  return r.json();
}

const DAYS = [[-1,'الأمس'],[0,'اليوم'],[1,'الغد']];
let all = [], day = 0, league = 'الكل';

const statusText = m => m.status==='LIVE' ? `● ${m.minute}'` : m.status==='FT' ? 'انتهت' : m.time;

function render(){
  document.getElementById('days').innerHTML = DAYS.map(([d,n]) =>
    `<button class="${d===day?'on':''}" data-d="${d}">${n}</button>`).join('');
  const dayMatches = all.filter(m => m.day===day);
  const leagues = ['الكل', ...new Set(dayMatches.map(m => m.league))];
  if(!leagues.includes(league)) league='الكل';
  document.getElementById('leagues').innerHTML = leagues.map(l =>
    `<button class="${l===league?'on':''}" data-l="${l}">${l}</button>`).join('');
  const shown = dayMatches.filter(m => league==='الكل' || m.league===league);
  const groups = {};
  shown.forEach(m => (groups[m.league] ||= []).push(m));
  document.getElementById('list').innerHTML = shown.length ? Object.entries(groups).map(([l,ms]) =>
    `<h2>${l}</h2>` + ms.map(m => {
      const score = m.status==='NS' ? '-' : `${m.hs} - ${m.as}`;
      return `<div class="m ${m.status==='LIVE'?'live':''}"><span class="t">${m.home}</span>
        <span class="sc">${score}<span class="st">${statusText(m)}</span></span><span class="t">${m.away}</span></div>`;
    }).join('')).join('') : '<p class="empty">لا توجد مباريات</p>';
}

document.addEventListener('click', e => {
  if(e.target.dataset.d !== undefined){ day = +e.target.dataset.d; render(); }
  if(e.target.dataset.l !== undefined){ league = e.target.dataset.l; render(); }
});

async function refresh(){ try{ all = await loadMatches(); render(); }catch(e){ console.error(e); } }
refresh();
setInterval(refresh, 60000); // تحديث كل دقيقة
