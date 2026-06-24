'use strict';

// UI basica extraida desde main.js. Mantiene funciones globales clasicas.

function showScreen(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); $(id).classList.add('active'); state.screen=id; resize(); }

function showModal(id){ $(id).classList.add('show'); }

function hideModal(id){ $(id).classList.remove('show'); }

function pulseBtn(id){
  const b=$(id);
  if(!b) return;
  b.classList.remove('pulse');
  void b.offsetWidth;
  b.classList.add('pulse');
  setTimeout(()=>b.classList.remove('pulse'), 320);
}

function updateActionButtons(){
  const end=$('endBtn'), tri=$('triBtn'), hist=$('histBtn'), kick=$('kickoffBtn'), next=$('nextLevelBtn');
  if(end) end.style.display='flex';
  if(tri) tri.style.display='flex';
  const ended = state.phase === 'ended';
  if(hist) hist.style.display = (ended && state.history && state.history.length) ? 'flex' : 'none';
  const matchOver = state.gameMode === 'goal' && state.ended && state.timeLeft <= 0;
  if(kick) kick.style.display = matchOver ? 'none' : 'flex';
  if(next){
    const show = canShowNextLevel();
    next.classList.toggle('available', show);
    next.style.display = show ? 'flex' : 'none';
  }
}

function updateHud(){
  const levelPill = $('metaLevelPill');
  if(state.gameMode==='meta'){
    const icon=$('scoreIcon'); if(icon) icon.textContent='🏁';
    $('goalsHud').textContent=metaCount() + '/3';
    $('timeHud').textContent=formatMetaTime(state.metaElapsed);
    if(levelPill){
      levelPill.textContent = `M${state.currentMetaWorld || 1} · N${state.currentMetaLevel || 1}`;
      levelPill.style.display = 'block';
    }
  } else {
    const icon=$('scoreIcon'); if(icon) icon.textContent='⚽';
    $('goalsHud').textContent=state.goals;
    $('timeHud').textContent=formatTime(state.timeLeft);
    if(levelPill) levelPill.style.display = 'none';
  }
}

function formatTime(t){ t=Math.max(0,Math.ceil(t)); return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');}

function setStatus(txt){$('statusText').textContent=txt;}

function showOverlay(kind,text){
  const o=$('overlayMsg'); 
  o.textContent=text; 

  if(kind==='goal'){
    state.goalGlowUntil = performance.now() + 1600;
    state.goalChainUntil = performance.now() + 1700;

    const gf=$('goalFlash');
    if(gf) gf.className='goalFlash show';

    const box=$('canvasBox');
    if(box){ box.classList.remove('goalShake'); void box.offsetWidth; box.classList.add('goalShake'); }

    if(navigator.vibrate) navigator.vibrate([35,25,45,30,80]);

    // Primero reacciona el arco; luego aparece GOL.
    o.className='overlayMsg';
    setTimeout(()=>{
      o.textContent=text;
      o.className='overlayMsg show goal';
    }, 170);
  } else {
    o.className='overlayMsg show foul';
    $('redTint').className='redTint show';
  }

  setTimeout(()=>{
    o.className='overlayMsg'; 
    $('redTint').className='redTint';
    const gf=$('goalFlash'); if(gf) gf.className='goalFlash';
    const box=$('canvasBox'); if(box) box.classList.remove('goalShake');
  },2500);
}

function escapeHtml(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

function updateTriButton(){
  const b=$('triBtn');
  if(!b) return;
  b.classList.toggle('active', !!state.showTri);
}

function renderLegend(){
  const leg=$('legend');
  if(leg){ leg.innerHTML=''; leg.className='legend'; }
}
