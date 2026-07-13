'use strict';

// Logica de Campana extraida desde main.js. Mantiene funciones globales clasicas.

function campaignWorld(worldNum){
  return CAMPAIGN_LEVELS.find(w=>w.world===worldNum) || null;
}

function campaignLevel(worldNum, levelNum){
  const w = campaignWorld(worldNum);
  return w ? (w.levels.find(l=>l.n===levelNum) || null) : null;
}

function campaignPlayableLevels(){
  return CAMPAIGN_LEVELS.flatMap(w=>w.levels.filter(l=>l.implemented).map(l=>({world:w.world, level:l.n})));
}

function campaignLevelKey(target){
  return `${target.world}-${target.level}`;
}

function isCampaignLevelImplemented(worldNum, levelNum){
  const level = campaignLevel(worldNum, levelNum);
  return !!(level && level.implemented);
}

function previousCampaignLevel(worldNum, levelNum){
  const levels = campaignPlayableLevels();
  const idx = levels.findIndex(t=>t.world===worldNum && t.level===levelNum);
  return idx > 0 ? levels[idx-1] : null;
}

function nextCampaignLevel(worldNum, levelNum){
  const levels = campaignPlayableLevels();
  const idx = levels.findIndex(t=>t.world===worldNum && t.level===levelNum);
  return idx >= 0 ? (levels[idx+1] || null) : null;
}

function isCampaignLevelUnlocked(worldNum, levelNum){
  if(!isCampaignLevelImplemented(worldNum, levelNum)) return false;
  if(!isMetaWorldUnlocked(worldNum-1)) return false;
  const prev = previousCampaignLevel(worldNum, levelNum);
  return !prev || !!(state.metaBest && state.metaBest[campaignLevelKey(prev)]);
}

function campaignLevelState(worldNum, levelNum, worldUnlocked=isMetaWorldUnlocked(worldNum-1)){
  if(!worldUnlocked || !isCampaignLevelImplemented(worldNum, levelNum)) return 'locked';
  const key = `${worldNum}-${levelNum}`;
  if(state.metaBest && state.metaBest[key]) return 'done';
  return isCampaignLevelUnlocked(worldNum, levelNum) ? 'available' : 'locked';
}

function lastImplementedLevelInWorld(worldNum){
  const w = campaignWorld(worldNum);
  if(!w) return null;
  const levels = w.levels.filter(l=>l.implemented);
  return levels.length ? levels[levels.length-1] : null;
}

function nextMetaTarget(){
  if(state.gameMode !== 'meta') return null;
  const next = nextCampaignLevel(state.currentMetaWorld || 1, state.currentMetaLevel || 1);
  return next && isCampaignLevelUnlocked(next.world, next.level) ? next : null;
}

function goToNextMetaLevel(){
  const t = nextMetaTarget();
  if(!t) return;
  playTone('restart');
  startMetaLevel(t.level, true, t.world);
}

function selectMetaWorld(index){
  const nextIndex = Math.max(0, Math.min(CAMPAIGN_LEVELS.length - 1, Math.round(+index || 0)));
  if(nextIndex === state.metaWorldIndex) return;
  state.metaWorldIndex = nextIndex;
  renderMetaWorlds();
}

function bindMetaWorldSwipe(panel){
  if(!panel) return;
  let drag = null;
  let suppressClick = false;
  const excluded = 'button,input,[role="slider"],[data-meta-level]';
  panel.addEventListener('pointerdown', ev => {
    if(ev.pointerType === 'mouse' && ev.button !== 0) return;
    if(ev.target.closest(excluded)) return;
    drag = {id:ev.pointerId, x:ev.clientX, y:ev.clientY, lastX:ev.clientX, lastT:ev.timeStamp, axis:'pending'};
  }, {passive:true});
  panel.addEventListener('pointermove', ev => {
    if(!drag || ev.pointerId !== drag.id) return;
    const dx = ev.clientX - drag.x;
    const dy = ev.clientY - drag.y;
    if(drag.axis === 'pending'){
      if(Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if(Math.abs(dy) >= Math.abs(dx) * 1.15){ drag = null; return; }
      if(Math.abs(dx) <= Math.abs(dy) * 1.15) return;
      drag.axis = 'horizontal';
      panel.classList.add('metaWorldDragging');
      try { panel.setPointerCapture(ev.pointerId); } catch(e) {}
    }
    if(drag.axis !== 'horizontal') return;
    ev.preventDefault();
    drag.lastX = ev.clientX;
    drag.lastT = ev.timeStamp;
    const limit = panel.clientWidth * .34;
    const offset = Math.max(-limit, Math.min(limit, dx));
    panel.style.setProperty('--meta-world-drag-x', `${offset}px`);
  }, {passive:false});
  const finish = ev => {
    if(!drag || ev.pointerId !== drag.id) return;
    const current = drag;
    drag = null;
    if(current.axis !== 'horizontal') return;
    ev.preventDefault();
    const dx = ev.clientX - current.x;
    const dt = Math.max(1, ev.timeStamp - current.lastT);
    const velocity = Math.abs(ev.clientX - current.lastX) / dt;
    const commit = Math.abs(dx) >= Math.min(72, panel.clientWidth * .20) || (Math.abs(dx) >= 34 && velocity >= .42);
    const direction = dx < 0 ? 1 : -1;
    const target = state.metaWorldIndex + direction;
    panel.classList.remove('metaWorldDragging');
    panel.style.removeProperty('--meta-world-drag-x');
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 260);
    if(commit && target >= 0 && target < CAMPAIGN_LEVELS.length) selectMetaWorld(target);
  };
  panel.addEventListener('pointerup', finish, {passive:false});
  panel.addEventListener('pointercancel', ev => {
    if(!drag || ev.pointerId !== drag.id) return;
    drag = null;
    panel.classList.remove('metaWorldDragging');
    panel.style.removeProperty('--meta-world-drag-x');
  }, {passive:true});
  panel.addEventListener('click', ev => {
    if(!suppressClick) return;
    ev.preventDefault();
    ev.stopPropagation();
  }, true);
}

function renderMetaWorlds(){
  const box=$('metaWorlds');
  const title=$('metaWorldTitle');
  const mini=$('metaWorldMini');
  if(!box) return;
  const wi=Math.max(0, Math.min(CAMPAIGN_LEVELS.length-1, state.metaWorldIndex||0));
  state.metaWorldIndex=wi;
  const worldNumber = wi + 1;
  const baseWorld = CAMPAIGN_LEVELS[wi];
  const unlocked = isMetaWorldUnlocked(wi);
  const reveal = unlocked && worldNumber > 1 && !(state.metaSeenWorlds && state.metaSeenWorlds[String(worldNumber)]);
  const w={
    title:baseWorld.title,
    name:baseWorld.name,
    shape:baseWorld.shape,
    levels:baseWorld.levels.map(lv=>({n:lv.n, state:campaignLevelState(worldNumber, lv.n, unlocked)}))
  };

  const themeClass = `theme-${w.shape}`;
  const titleName = w.name;
  if(title){
    title.className = `metaTitle ${themeClass}${reveal ? ' revealTitle' : ''}`;
    title.innerHTML = `<span class="worldNum">${w.title}</span> <span class="worldSep">&middot;</span> <span class="worldName">${titleName}</span>`;
  }
  if(mini) mini.textContent='';

  if(unlocked && DATA_PROVIDER && typeof DATA_PROVIDER.prefetchCampaignWorldRecords === 'function'){
    DATA_PROVIDER.prefetchCampaignWorldRecords(w.levels.filter(lv=>lv.state!=='locked').map(lv=>`${worldNumber}-${lv.n}`));
  }

  const logoPath = window.WORLD_LOGOS && window.WORLD_LOGOS[worldNumber];
  const visualHtml = `${logoPath ? `<img class="worldLogoImg" alt="" src="${logoPath}">` : worldEmblem(w.shape)}${unlocked ? '' : '<div class="worldLockOverlay"><span class="uiIcon iconLock" aria-hidden="true"></span></div>'}`;
  const visualClass = `${unlocked ? '' : 'lockedWorld'} ${logoPath ? 'officialWorldLogo' : 'artLogo'} ${themeClass} ${reveal ? 'revealWorld' : ''}`.trim();

  box.innerHTML = `
    <div class="worldPanel">
      <div class="worldVisual ${visualClass}">${visualHtml}</div>
      <div class="levelGrid">
        ${w.levels.map(lv=>{
          const key = `${worldNumber}-${lv.n}`;
          const rec = unlocked && state.metaBest && state.metaBest[key];
          const worldRec = unlocked && DATA_PROVIDER.getCampaignWorldRecord ? DATA_PROVIDER.getCampaignWorldRecord(key) : null;
          const personalLabel = rec ? `Personal ${formatMetaTime(rec.time)}` : (lv.state==='locked' ? '' : 'Personal \u2014');
          const worldLabel = worldRec ? `Mundial ${formatMetaTime(worldRec.time)}` : (lv.state==='locked' ? '' : 'Mundial \u2014');
          return `
            <button class="levelTile ${lv.state}" data-meta-level="${worldNumber}-${lv.n}" ${lv.state==='locked'?'disabled':''}>
              <span class="levelNum">${lv.n}</span>
              <span class="levelTime">${personalLabel}</span>
              <span class="levelTime">${worldLabel}</span>
            </button>
          `;
        }).join('')}
      </div>
      <div class="metaNav">
        <button class="navPuck ${wi===0?'hidden':''}" id="metaPrevBtn" aria-label="Mundo anterior"><span class="uiIcon iconBack" aria-hidden="true"></span></button>
        <label class="pageDots" aria-label="Seleccionar mundo">
          <input class="worldPageSlider" id="metaWorldSlider" type="range" min="0" max="${CAMPAIGN_LEVELS.length-1}" step="1" value="${wi}" aria-label="Mundo" aria-valuetext="Mundo ${worldNumber}: ${titleName}">
          <span class="pageTrack" aria-hidden="true"><span class="pageTrackDot" style="left:${CAMPAIGN_LEVELS.length>1 ? (wi/(CAMPAIGN_LEVELS.length-1))*100 : 0}%"></span></span>
        </label>
        <button class="navPuck ${wi===CAMPAIGN_LEVELS.length-1?'hidden':''}" id="metaNextBtn" aria-label="Mundo siguiente"><span class="uiIcon iconChevron" aria-hidden="true"></span></button>
      </div>
    </div>
  `;

  if(reveal){
    setTimeout(()=>saveMetaSeenWorld(worldNumber), 1200);
  }

  const prev=$('metaPrevBtn');
  const next=$('metaNextBtn');
  if(prev) prev.onclick=()=>selectMetaWorld(state.metaWorldIndex-1);
  if(next) next.onclick=()=>selectMetaWorld(state.metaWorldIndex+1);
  const slider=$('metaWorldSlider');
  if(slider){
    slider.oninput=()=>{
      const dot=box.querySelector('.pageTrackDot');
      if(dot) dot.style.left=`${CAMPAIGN_LEVELS.length>1 ? (+slider.value/(CAMPAIGN_LEVELS.length-1))*100 : 0}%`;
      const preview=CAMPAIGN_LEVELS[+slider.value];
      slider.setAttribute('aria-valuetext', preview ? `${preview.title}: ${preview.name}` : '');
    };
    slider.onchange=()=>selectMetaWorld(+slider.value);
  }
  bindMetaWorldSwipe(box.querySelector('.worldPanel'));
  document.querySelectorAll('[data-meta-level]').forEach(b=>{
    b.onclick=()=>{
      if(b.disabled) return;
      const [worldNum, levelNum] = String(b.dataset.metaLevel || '').split('-').map(Number);
      if(isCampaignLevelUnlocked(worldNum, levelNum)){
        startMetaLevel(levelNum, true, worldNum);
        return;
      }
      setStatus('Nivel aún no disponible.');
    };
  });
}

function startMetaLevel(levelNum=1, resetHistory=true, worldNum=1){
  state.gameMode='meta';
  state.currentMetaWorld=worldNum;
  state.currentMetaLevel=levelNum;
  state.metaLevelKey=`${worldNum}-${levelNum}`;
  state.metaWorldIndex=worldNum-1;
  state.running=true;
  state.ended=false;
  state.phase='aim';
  state.messageLock=false;
  state.goals=0;
  if(resetHistory) state.history=[];
  state.currentSeq=[];
  state.totals={passes:0,triangles:0,complexity:0,area:0,fouls:0};
  state.metaDone=[false,false,false];
  state.metaElapsed=0;
  state.metaStart=performance.now();
  state.sessionStart=Date.now();
  state.lastHit=null;
  state.shot=null;
  state.selected=null;
  state.drag=null;
  state.aimMode='idle';
  state.aimAngleFixed=null;
  state.forceValue=0;
  state.forceDir=1;
  state.showTri=false;
  state.lastAttemptIndex=null;
  state.passGlow=null;
  state.paintBursts=[];
  showScreen('gameScreen');
  setupMickey();
  recordTriangle();
  updateActionButtons();
  updateTriButton();
  updateHud();
  // v19.27: pantalla de juego limpia. Sin instrucciones superiores persistentes.
  setStatus('');
}


if(typeof window !== 'undefined' && !window.__trianotaCampaignWorldRecordListener){
  window.__trianotaCampaignWorldRecordListener = true;
  window.addEventListener('trianota:campaignWorldRecordUpdated', event => {
    const metaScreen = typeof $ === 'function' ? $('metaScreen') : document.getElementById('metaScreen');
    if(metaScreen && metaScreen.classList.contains('active') && typeof renderMetaWorlds === 'function'){
      try { console.info('[Trianota campaign selector rerender]', {reason:'campaign-world-record-updated', detail:event.detail}); } catch {}
      renderMetaWorlds();
    }
  });
}
