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
    name:unlocked ? baseWorld.name : '?',
    shape:baseWorld.shape,
    levels:baseWorld.levels.map(lv=>({n:lv.n, state:campaignLevelState(worldNumber, lv.n, unlocked)}))
  };

  const themeClass = `theme-${w.shape}`;
  const titleName = unlocked ? w.name : '?';
  if(title){
    title.className = `metaTitle ${themeClass}${reveal ? ' revealTitle' : ''}`;
    title.innerHTML = `<span class="worldNum">${w.title}</span> <span class="worldSep">·</span> <span class="worldName">${titleName}</span>`;
  }
  if(mini) mini.textContent='';

  const hasArt = !!(WORLD_ART && WORLD_ART[w.shape]);
  const visualHtml = `${hasArt ? worldEmblem(w.shape) : ''}${unlocked ? '' : '<div class="worldLockOverlay">🔒</div>'}`;
  const visualClass = `${unlocked ? '' : 'lockedWorld'} ${hasArt ? 'artLogo' : ''} ${themeClass} ${reveal ? 'revealWorld' : ''}`.trim();

  box.innerHTML = `
    <div class="worldPanel">
      <div class="worldVisual ${visualClass}">${visualHtml}</div>
      <div class="levelGrid">
        ${w.levels.map(lv=>{
          const key = `${worldNumber}-${lv.n}`;
          const rec = unlocked && state.metaBest && state.metaBest[key];
          const worldRec = unlocked && DATA_PROVIDER.getCampaignWorldRecord ? DATA_PROVIDER.getCampaignWorldRecord(key) : null;
          const personalLabel = rec ? `Personal ${formatMetaTime(rec.time)}` : (lv.state==='locked' ? '' : 'Personal —');
          const worldLabel = worldRec ? `Mundial ${formatMetaTime(worldRec.time)}` : (lv.state==='locked' ? '' : 'Mundial —');
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
        <button class="navPuck ${wi===0?'hidden':''}" id="metaPrevBtn" aria-label="Mundo anterior">‹</button>
        <div class="pageDots"><span class="pageTrack"><span class="pageTrackDot" style="left:${CAMPAIGN_LEVELS.length>1 ? (wi/(CAMPAIGN_LEVELS.length-1))*100 : 0}%"></span></span></div>
        <button class="navPuck ${wi===CAMPAIGN_LEVELS.length-1?'hidden':''}" id="metaNextBtn" aria-label="Mundo siguiente">›</button>
      </div>
    </div>
  `;

  if(reveal){
    setTimeout(()=>saveMetaSeenWorld(worldNumber), 1200);
  }

  const prev=$('metaPrevBtn');
  const next=$('metaNextBtn');
  if(prev) prev.onclick=()=>{state.metaWorldIndex=Math.max(0,state.metaWorldIndex-1); renderMetaWorlds();};
  if(next) next.onclick=()=>{state.metaWorldIndex=Math.min(CAMPAIGN_LEVELS.length-1,state.metaWorldIndex+1); renderMetaWorlds();};
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
