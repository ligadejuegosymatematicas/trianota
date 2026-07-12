'use strict';

// UI basica extraida desde main.js. Mantiene funciones globales clasicas.

function showScreen(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); $(id).classList.add('active'); state.screen=id; resize(); }

const MODAL_BACKDROP_CLOSE_IDS = new Set(['aboutModal','recordsModal','historyModal','attemptModal']);
const modalReturnFocus = new Map();

function modalEl(id){ return document.getElementById(id); }
function modalFocusable(modal){
  return Array.from(modal.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')).filter(el => !el.disabled && !el.hidden && el.offsetParent !== null);
}
function focusModal(modal){
  const focusables = modalFocusable(modal);
  const target = focusables[0] || modal;
  if(!modal.hasAttribute('tabindex')) modal.setAttribute('tabindex','-1');
  setTimeout(() => { try { target.focus({preventScroll:true}); } catch { target.focus(); } }, 0);
}
function showModal(id){
  const modal = modalEl(id);
  if(!modal) return;
  modalReturnFocus.set(id, document.activeElement);
  modal.setAttribute('role','dialog');
  modal.setAttribute('aria-modal','true');
  modal.classList.add('show');
  focusModal(modal);
}
function hideModal(id){
  const modal = modalEl(id);
  if(!modal) return;
  modal.classList.remove('show');
  const returnTo = modalReturnFocus.get(id);
  modalReturnFocus.delete(id);
  if(returnTo && document.contains(returnTo) && typeof returnTo.focus === 'function'){
    setTimeout(() => { try { returnTo.focus({preventScroll:true}); } catch { returnTo.focus(); } }, 0);
  }
}
function closeTopLayer(){
  const choice = modalEl('configChoiceOverlay');
  if(choice && !choice.hidden && typeof window.closeConfigChoice === 'function'){ window.closeConfigChoice(); return true; }
  if(typeof window.closeProfileSubview === 'function' && window.closeProfileSubview()) return true;
  const shown = Array.from(document.querySelectorAll('.modal.show')).reverse();
  const modal = shown.find(item => MODAL_BACKDROP_CLOSE_IDS.has(item.id));
  if(modal){ hideModal(modal.id); return true; }
  return false;
}
window.closeTopLayer = closeTopLayer;

document.addEventListener('click', ev => {
  const modal = ev.target;
  if(modal && modal.classList && modal.classList.contains('modal') && modal.classList.contains('show') && MODAL_BACKDROP_CLOSE_IDS.has(modal.id)){
    hideModal(modal.id);
  }
});
document.addEventListener('keydown', ev => {
  if(ev.key === 'Escape'){
    if(closeTopLayer()) ev.preventDefault();
    return;
  }
  if(ev.key !== 'Tab') return;
  const modal = Array.from(document.querySelectorAll('.modal.show')).reverse()[0];
  const choice = modalEl('configChoiceOverlay');
  const trap = choice && !choice.hidden ? modalEl('configChoiceSheet') : modal;
  if(!trap) return;
  const focusables = modalFocusable(trap);
  if(!focusables.length) return;
  const first = focusables[0], last = focusables[focusables.length - 1];
  if(ev.shiftKey && document.activeElement === first){ last.focus(); ev.preventDefault(); }
  else if(!ev.shiftKey && document.activeElement === last){ first.focus(); ev.preventDefault(); }
});

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
