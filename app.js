import { auth, provider, db, storage, signInWithPopup, onAuthStateChanged, signOut, doc, setDoc, getDoc, collection, query, orderBy, getDocs, ref, uploadBytes, getDownloadURL } from './firebase.js';

const path = window.location.pathname;
const byId = (id) => document.getElementById(id);

const ensureAuth = () => onAuthStateChanged(auth, (user) => {
  const onIndex = path.endsWith('index.html') || path === '/' || path.endsWith('/tradefitness/');
  if (!user && !onIndex) window.location.href = 'index.html';
  if (user && onIndex) window.location.href = 'dashboard.html';
  if (user) renderProfile(user);
  if (user && path.includes('dashboard')) initDashboard(user);
  if (user && path.includes('analytics')) initAnalytics(user);
  if (user && path.includes('journal')) loadJournal(user);
});

function renderProfile(user){ const p = byId('userProfile'); if (p) p.innerHTML = `<img src="${user.photoURL}" width="44" style="border-radius:50%"/> <p>${user.displayName}</p><small>${user.email}</small>`; }

byId('googleSignInBtn')?.addEventListener('click', ()=>signInWithPopup(auth, provider));
byId('logoutBtn')?.addEventListener('click', ()=>signOut(auth).then(()=>window.location.href='index.html'));

const metrics = ['Total Profit/Loss','Total Trades','Win Trades','Loss Trades','Win Rate %','Risk Reward Ratio','Emotional Score','Discipline Score','Confidence Score','Stress Score','Focus Score','Gym Completion Status','Meditation Status','Sleep Hours','Water Intake'];

async function initDashboard(user){
  drawCalendar(); renderMetrics({});
  byId('entryDate').valueAsDate = new Date();
  byId('dailyForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const d = byId('entryDate').value;
    const file = byId('screenshot').files[0];
    let screenshotUrl = '';
    if(file){ const sRef = ref(storage, `screenshots/${user.uid}/${Date.now()}-${file.name}`); await uploadBytes(sRef, file); screenshotUrl = await getDownloadURL(sRef); }
    const payload = {
      date:d, tradeCount:+byId('tradeCount').value, profitLoss:+byId('profitLoss').value, winTrades:+byId('winTrades').value, lossTrades:+byId('lossTrades').value,
      riskReward:+byId('rr').value, emotionalScore:+byId('emotionalScore').value, disciplineScore:+byId('disciplineScore').value, confidenceScore:+byId('confidenceScore').value,
      stressScore:+byId('stressScore').value, focusScore:+byId('focusScore').value, sleepHours:+byId('sleepHours').value, waterIntake:+byId('waterIntake').value,
      followStrategy:byId('followStrategy').value, revengeTrade:byId('revengeTrade').value, overtrade:byId('overtrade').value, stopLoss:byId('stopLoss').value,
      tradeEmotionally:byId('tradeEmotionally').value, exercise:byId('exercise').value, meditate:byId('meditate').value, sleepProperly:byId('sleepProperly').value,
      mistake:byId('mistake').value, lesson:byId('lesson').value, journalNote:byId('journalNote').value, emotionalNote:byId('emotionalNote').value, screenshotUrl
    };
    await setDoc(doc(db,'users',user.uid,'entries',d), payload);
    alert('Daily entry saved');
  });
}

function drawCalendar(){ const grid = byId('calendarGrid'); if(!grid) return; const now=new Date(), y=now.getFullYear(), m=now.getMonth(); const days=new Date(y,m+1,0).getDate(); grid.innerHTML=''; for(let i=1;i<=days;i++){ const cell=document.createElement('button'); cell.className='day-cell'; cell.textContent=i; cell.onclick=()=>{byId('entryDate').value=`${y}-${String(m+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`; document.querySelectorAll('.day-cell').forEach(c=>c.classList.remove('active')); cell.classList.add('active');}; grid.appendChild(cell);} }
function renderMetrics(data){ const mg=byId('metricsGrid'); if(!mg) return; mg.innerHTML=''; metrics.forEach(k=>{ const v = data[k] ?? '-'; mg.innerHTML += `<article class="metric glass"><div class="label">${k}</div><div class="value">${v}</div></article>`; }); }

async function fetchEntries(uid){ const qy=query(collection(db,'users',uid,'entries'), orderBy('date')); const snap=await getDocs(qy); return snap.docs.map(d=>d.data()); }

async function initAnalytics(user){
  const entries = await fetchEntries(user.uid);
  const labels = entries.map(e=>e.date);
  mk('weeklyProfitChart','Weekly Profit',labels,entries.map(e=>e.profitLoss));
  mk('monthlyPerformanceChart','Monthly Performance',labels,entries.map(e=>e.tradeCount));
  mk('emotionalTrendChart','Emotional Score',labels,entries.map(e=>e.emotionalScore));
  mk('disciplineTrendChart','Discipline Score',labels,entries.map(e=>e.disciplineScore));
  mk('fitnessCorrelationChart','Fitness vs P/L',labels,entries.map(e=>(e.exercise==='Yes'?1:0)+(e.meditate==='Yes'?1:0)+e.profitLoss/100));
  mk('streakHabitChart','Habit Consistency',labels,entries.map(e=>(e.followStrategy==='Yes'?1:0)+(e.stopLoss==='Yes'?1:0)+(e.overtrade==='No'?1:0)));
}
function mk(id,label,labels,data){ const ctx = byId(id); if(!ctx || !window.Chart) return; new Chart(ctx,{type:'line',data:{labels,datasets:[{label,data,borderColor:'#6ee7ff',backgroundColor:'#6ee7ff33',fill:true,tension:.35}]},options:{plugins:{legend:{labels:{color:'#eaf0ff'}}},scales:{x:{ticks:{color:'#95a4c6'}},y:{ticks:{color:'#95a4c6'}}}}}); }

async function loadJournal(user){ const box = byId('journalEntries'); if(!box) return; const entries = await fetchEntries(user.uid); box.innerHTML = entries.reverse().map(e=>`<article class="glass" style="padding:1rem;margin:.7rem 0"><h4>${e.date}</h4><p><strong>Mistake:</strong> ${e.mistake||'-'}</p><p><strong>Lesson:</strong> ${e.lesson||'-'}</p><p><strong>Journal:</strong> ${e.journalNote||'-'}</p><p><strong>Emotion:</strong> ${e.emotionalNote||'-'}</p>${e.screenshotUrl?`<img src="${e.screenshotUrl}" style="max-width:100%;border-radius:10px"/>`:''}</article>`).join(''); }

ensureAuth();
