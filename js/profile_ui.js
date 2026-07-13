// Perfil v20.04. Vitrina de progreso basada solo en datos reales disponibles.
(function(){
  'use strict';

  const EM = '\u2014';
  const GOAL_DURATIONS = [
    {duration:120, label:'2 min'},
    {duration:180, label:'3 min'},
    {duration:300, label:'5 min'}
  ];
  const FASTEST_TARGETS = [
    {goals:3, label:'3 goles'},
    {goals:5, label:'5 goles'}
  ];
  let currentView = {type:'main'};
  let returnAction = '';

  function el(id){ return document.getElementById(id); }
  function esc(value){
    return String(value === undefined || value === null ? '' : value).replace(/[&<>'\"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[ch]));
  }
  function metricParamKey(params){
    if(params === undefined || params === null) return 'default';
    if(typeof params === 'string' || typeof params === 'number' || typeof params === 'boolean') return String(params);
    const stable = Object.keys(params).sort().reduce((acc, key) => { acc[key] = params[key]; return acc; }, {});
    return JSON.stringify(stable);
  }
  function readMainData(){
    try { return JSON.parse(localStorage.getItem('trianota_data_v1') || '{}'); }
    catch { return {}; }
  }
  function cachedCampaignWorldRecord(levelKey){
    const records = readMainData()?.campaign?.worldRecordByLevel;
    return records && records[levelKey] ? records[levelKey] : null;
  }
  function cachedGoalWorldRecord(metricKey, params){
    const group = readMainData()?.goal?.worldRecords?.[metricKey];
    return group ? (group[metricParamKey(params)] || null) : null;
  }
  function goalWorldRecord(metricKey, params){
    if(DATA_PROVIDER && typeof DATA_PROVIDER.getGoalWorldRecord === 'function'){
      return DATA_PROVIDER.getGoalWorldRecord(metricKey, params) || cachedGoalWorldRecord(metricKey, params);
    }
    return cachedGoalWorldRecord(metricKey, params);
  }
  function campaignWorldRecord(levelKey){
    if(DATA_PROVIDER && typeof DATA_PROVIDER.getCampaignWorldRecord === 'function'){
      return DATA_PROVIDER.getCampaignWorldRecord(levelKey) || cachedCampaignWorldRecord(levelKey);
    }
    return cachedCampaignWorldRecord(levelKey);
  }
  function secondsValue(record){
    if(record === undefined || record === null) return null;
    if(typeof record === 'number') return record;
    return record.time || record.seconds || record.duration || null;
  }
  function secondsLabel(value){
    const seconds = secondsValue(value);
    return seconds ? formatMetaTime(+seconds) : EM;
  }
  function percentLabel(value){ return value || value === 0 ? `${(+value).toFixed(1)}%` : EM; }
  function currentUid(){
    const provider = window.FIREBASE_PROVIDER;
    return provider && typeof provider.getUid === 'function' ? provider.getUid() : '';
  }
  function profileNick(){
    const profile = DATA_PROVIDER && DATA_PROVIDER.getPlayerProfile ? DATA_PROVIDER.getPlayerProfile() : null;
    return (profile && profile.nick ? String(profile.nick).trim() : '') || 'Jugador';
  }
  function initials(nick){
    const letters = String(nick || 'J').trim().split(/\s+/).map(part => part[0]).join('').slice(0,2).toUpperCase();
    return letters || 'J';
  }
  function campaignWorlds(){ return window.CAMPAIGN_LEVELS || []; }
  function worldLevels(world){ return world && Array.isArray(world.levels) ? world.levels : []; }
  function implementedWorldLevels(world){ return worldLevels(world).filter(level => level.implemented); }
  function implementedLevels(){
    return campaignWorlds().flatMap(world => implementedWorldLevels(world).map(level => ({world:world.world, level:level.n, key:`${world.world}-${level.n}`})));
  }
  function bestByLevel(){ return DATA_PROVIDER && DATA_PROVIDER.getCampaignPersonalBestTimes ? DATA_PROVIDER.getCampaignPersonalBestTimes() : {}; }
  function personalCampaignRecord(best, key){
    const record = best && best[key];
    if(!record) return null;
    return typeof record === 'number' ? {time:record} : record;
  }
  function isWorldCompleted(world, best){
    const levels = implementedWorldLevels(world);
    return levels.length > 0 && levels.every(level => personalCampaignRecord(best, `${world.world}-${level.n}`));
  }
  function worldProgress(world, best){
    const levels = implementedWorldLevels(world);
    const done = levels.filter(level => personalCampaignRecord(best, `${world.world}-${level.n}`)).length;
    return {done, total:levels.length};
  }
  function profileWorldStates(best){
    const worlds = campaignWorlds();
    const currentWorld = worlds.find(world => implementedWorldLevels(world).length > 0 && !isWorldCompleted(world, best));
    const currentNumber = currentWorld ? currentWorld.world : null;
    const states = {};
    worlds.forEach(world => {
      const implemented = implementedWorldLevels(world).length > 0;
      if(!implemented) states[world.world] = 'comingSoon';
      else if(isWorldCompleted(world, best)) states[world.world] = 'completed';
      else if(currentNumber && world.world === currentNumber) states[world.world] = 'current';
      else states[world.world] = 'locked';
    });
    return states;
  }
  function campaignSummary(){
    const best = bestByLevel();
    const levels = implementedLevels();
    const done = levels.filter(item => personalCampaignRecord(best, item.key)).length;
    const implementedWorlds = campaignWorlds().filter(world => implementedWorldLevels(world).length > 0);
    const completedWorlds = implementedWorlds.filter(world => isWorldCompleted(world, best)).length;
    return {
      done,
      total:levels.length,
      percent:levels.length ? Math.round((done / levels.length) * 100) : 0,
      completedWorlds,
      totalWorlds:implementedWorlds.length
    };
  }
  function goalRecords(){ return DATA_PROVIDER && DATA_PROVIDER.getGoalLocalRecords ? DATA_PROVIDER.getGoalLocalRecords() : []; }
  function goalRecordsForDuration(duration){ return goalRecords().filter(record => +record.duration === +duration); }
  function bestSurfaceValue(duration){
    const rec = goalRecordsForDuration(duration).sort((a,b)=>(b.bestUtil||0)-(a.bestUtil||0) || (b.goals||0)-(a.goals||0))[0];
    return rec ? +(rec.bestUtil || 0) : null;
  }
  function bestSurface(duration){
    const value = bestSurfaceValue(duration);
    return value === null ? EM : percentLabel(value);
  }
  function personalFastestRecord(target){
    return DATA_PROVIDER && DATA_PROVIDER.getGoalPersonalBest ? DATA_PROVIDER.getGoalPersonalBest('fastestNGoles', {goals:target}) : null;
  }
  function personalFastest(target){
    const rec = personalFastestRecord(target);
    return rec ? secondsLabel(rec) : EM;
  }
  function registeredGoalMarks(){
    const fastest = FASTEST_TARGETS.filter(item => personalFastestRecord(item.goals)).length;
    const surface = GOAL_DURATIONS.filter(item => bestSurfaceValue(item.duration) !== null).length;
    return fastest + surface;
  }
  function overallBestSurface(){
    const values = GOAL_DURATIONS.map(item => bestSurfaceValue(item.duration)).filter(value => value !== null);
    return values.length ? percentLabel(Math.max(...values)) : EM;
  }
  function iconHtml(name, extraClass=''){
    const family = String(name || '').indexOf('game') === 0 ? 'gameIcon' : 'uiIcon';
    return `<span class="${family} ${esc(name)}${extraClass ? ` ${esc(extraClass)}` : ''}" aria-hidden="true"></span>`;
  }
  function heroHtml(nick){
    return `
      <section class="profileShowcaseHero">
        <div class="profileAvatar premium" aria-hidden="true"><span>${esc(initials(nick))}</span></div>
        <div class="profileHeroText">
          <small>PERFIL</small>
          <div class="profileNick">${esc(nick)}</div>
          <div class="profileStatus"><i aria-hidden="true"></i> Perfil local</div>
        </div>
      </section>`;
  }
  function worldLogo(world){
    const logos = window.WORLD_LOGOS || {};
    return logos[world.world] || '';
  }
  function worldShowcaseCard(world, compact=false){
    const best = bestByLevel();
    const state = profileWorldStates(best)[world.world] || 'comingSoon';
    const progress = worldProgress(world, best);
    const enabled = state === 'completed' || state === 'current';
    const progressText = state === 'comingSoon' ? 'Pr\u00f3x.' : `${progress.done}/${progress.total}`;
    const stateText = state === 'completed' ? 'Completado' : state === 'current' ? 'Actual' : state === 'locked' ? 'Bloqueado' : 'Pr\u00f3ximamente';
    const stateIcon = state === 'completed' ? iconHtml('iconCheck') : state === 'locked' ? iconHtml('iconLock') : '';
    const logo = worldLogo(world);
    return `<button class="profileWorldShowcase ${state} ${compact ? 'compact' : ''}" type="button" data-world="${world.world}" data-profile-action="world:${world.world}" ${enabled ? '' : 'disabled'} aria-label="Mundo ${world.world}, ${esc(stateText)}, ${esc(progressText)}">
      ${logo ? `<img class="profileWorldLogo" src="${esc(logo)}" alt="" loading="lazy" decoding="async">` : ''}
      <span class="profileWorldShade" aria-hidden="true"></span>
      <span class="profileWorldTop"><b>M${world.world}</b><em>${stateIcon}${esc(stateText)}</em></span>
      <span class="profileWorldCopy"><strong>${esc(world.name || `Mundo ${world.world}`)}</strong><small>${esc(progressText)}</small></span>
    </button>`;
  }
  function worldMetricSummary(kind){
    if(kind === 'fastest'){
      const world = cachedGoalWorldRecord('fastestNGoles', {goals:3});
      return {variant:'3 goles', personal:personalFastest(3), world:world ? secondsLabel(world) : EM, record:world};
    }
    const world = cachedGoalWorldRecord('maxSurfaceUsage', {duration:120});
    return {variant:'2 min', personal:bestSurface(120), world:world ? percentLabel(world.bestUtil || world.surface || 0) : EM, record:world};
  }
  function mainMarkCard(kind, title, icon){
    const item = worldMetricSummary(kind);
    return `<button class="profileMarkCard ${kind}" data-profile-action="goal:${kind}" type="button">
      <span class="profileMarkIcon">${iconHtml(icon)}</span>
      <span class="profileMarkHeading"><small>${esc(item.variant)}</small><strong>${esc(title)}</strong></span>
      <span class="profileMarkValues"><span><small>Personal</small><b>${esc(item.personal)}</b></span><span><small>Mundial</small><b>${esc(item.world)}</b>${item.record ? ownerLine(item.record) : ''}</span></span>
      ${iconHtml('iconChevron', 'profileMarkChevron')}
    </button>`;
  }
  function renderMain(){
    const worlds = campaignWorlds();
    const summary = campaignSummary();
    return `<div class="profileShowcaseView">
      ${heroHtml(profileNick())}
      <section class="profileShowcaseSection campaign">
        <div class="profileShowcaseTitle"><div><small>PROGRESO</small><h3>Campa\u00f1a</h3></div><button type="button" data-profile-action="allWorlds">Ver todos los mundos ${iconHtml('iconChevron')}</button></div>
        <div class="profileCampaignMetrics" aria-label="Resumen de Campa\u00f1a"><span>Progreso <b>${summary.percent}%</b></span><span>Mundos <b>${summary.completedWorlds}/${summary.totalWorlds}</b></span><span>Niveles <b>${summary.done}/${summary.total}</b></span></div>
        <div class="profileFeaturedWorlds">${worlds.slice(0,3).map(world => worldShowcaseCard(world)).join('')}</div>
      </section>
      <section class="profileShowcaseSection marks">
        <div class="profileShowcaseTitle"><div><small>GOL</small><h3>Tus mejores marcas</h3></div></div>
        <div class="profileMarkGrid">${mainMarkCard('fastest','Rapidez','gameSpeed')}${mainMarkCard('surface','Superficie','gameSurface')}</div>
        <button class="profileRecordsLink" data-profile-action="worldRecords" type="button">${iconHtml('iconGoal')}<span>Ver todos los r\u00e9cords</span>${iconHtml('iconChevron')}</button>
      </section>
    </div>`;
  }
  function secondaryShell(title, body, kicker='DETALLE'){
    return `<div class="profileSubView"><div class="profileSubHead"><button class="profileBackBtn" data-profile-action="main" type="button" aria-label="Volver">${iconHtml('iconBack')}</button><div><small>${esc(kicker)}</small><h3>${esc(title)}</h3></div></div><div class="profileSubBody">${body}</div></div>`;
  }
  function profileLayer(content, label, variant){
    return `<div class="profileLayerOverlay" data-profile-action="main"><div class="profileLayerPanel profileLayer-${esc(variant || 'detail')}" role="dialog" aria-modal="true" aria-label="${esc(label || 'Detalle de perfil')}" tabindex="-1">${content}</div></div>`;
  }
  function renderAllWorlds(){
    return secondaryShell('Todos los mundos', `<div class="profileAllWorldsGrid">${campaignWorlds().map(world => worldShowcaseCard(world, true)).join('')}</div>`, 'CAMPA\u00d1A');
  }
  function renderWorld(worldNum){
    const world = campaignWorlds().find(item => +item.world === +worldNum);
    if(!world) return renderAllWorlds();
    const best = bestByLevel();
    const rows = implementedWorldLevels(world).map(level => {
      const key = `${world.world}-${level.n}`;
      const personal = personalCampaignRecord(best, key);
      const worldRec = campaignWorldRecord(key);
      const worldValue = worldRec ? secondsLabel(worldRec) : EM;
      const owned = isOwnedRecord(worldRec);
      return `<div class="profileDetailRow world ${owned ? 'owned' : ''}"><span>M${world.world}-N${level.n}</span><b>${personal ? secondsLabel(personal) : EM}</b>${worldRecordCell(worldRec, worldValue)}</div>`;
    }).join('') || '<p class="profileEmpty">Este mundo todav\u00eda no est\u00e1 disponible.</p>';
    const progress = worldProgress(world, best);
    const logo = worldLogo(world);
    const hero = `<div class="profileWorldDetailHero">${logo ? `<img src="${esc(logo)}" alt="" loading="lazy" decoding="async">` : ''}<div><span>M${world.world}</span><strong>${esc(world.name || `Mundo ${world.world}`)}</strong><small>${progress.done}/${progress.total} niveles</small></div></div>`;
    return secondaryShell(`Mundo ${world.world}: ${world.name || ''}`, `${hero}<div class="profileDetailLegend"><span>Nivel</span><b>Personal</b><em>Mundial</em></div><div class="profileDetailRows">${rows}</div>`, 'CAMPA\u00d1A');
  }
  function renderGoal(kind){
    if(kind === 'fastest'){
      return secondaryShell('Rapidez', detailRows(FASTEST_TARGETS.map(item => {
        const world = goalWorldRecord('fastestNGoles', {goals:item.goals});
        return {label:item.label, personal:personalFastest(item.goals), world:world ? secondsLabel(world) : EM, worldRecord:world};
      })), 'TUS MEJORES MARCAS');
    }
    if(kind === 'goals'){
      return secondaryShell('Goles', '<p class="profileEmpty">Esta categor\u00eda se conserva internamente y est\u00e1 en evaluaci\u00f3n.</p>', 'ARCHIVO');
    }
    return secondaryShell('Superficie', detailRows(GOAL_DURATIONS.map(item => {
      const world = goalWorldRecord('maxSurfaceUsage', {duration:item.duration});
      return {label:item.label, personal:bestSurface(item.duration), world:world ? percentLabel(world.bestUtil || world.surface || 0) : EM, worldRecord:world};
    })), 'TUS MEJORES MARCAS');
  }
  function detailRows(items){
    return `<div class="profileVariantCards">${items.map(item => `<article class="profileVariantCard"><div class="profileVariantName">${esc(item.label)}</div><div class="profileVariantStats"><div><span>Personal</span><b>${esc(item.personal)}</b></div>${worldStatBlock(item.worldRecord, item.world)}</div></article>`).join('')}</div>`;
  }
  function goalWorldRequests(){
    return [
      ...FASTEST_TARGETS.map(item => ({metricKey:'fastestNGoles', params:{goals:item.goals}, group:'Rapidez', label:item.label, format:r=>secondsLabel(r)})),
      ...GOAL_DURATIONS.map(item => ({metricKey:'maxSurfaceUsage', params:{duration:item.duration}, group:'Superficie', label:item.label, format:r=>r ? percentLabel(r.bestUtil || r.surface || 0) : EM}))
    ];
  }
  function campaignWorldRequests(){
    return implementedLevels().map(item => ({levelKey:item.key, group:'Campa\u00f1a', label:`M${item.world}-N${item.level}`, format:r=>secondsLabel(r)}));
  }
  function prefetchWorldRecordsForProfile(){
    if(!window.DATA_PROVIDER) return;
    if(typeof DATA_PROVIDER.prefetchGoalWorldRecords === 'function') DATA_PROVIDER.prefetchGoalWorldRecords(goalWorldRequests().map(item => ({metricKey:item.metricKey, params:item.params})));
    if(typeof DATA_PROVIDER.prefetchCampaignWorldRecords === 'function') DATA_PROVIDER.prefetchCampaignWorldRecords(campaignWorldRequests().map(item => item.levelKey));
  }
  function nestedBest(record){ return record && typeof record === 'object' ? (record.best || record.record || record.worldRecord || null) : null; }
  function recordOwnerUid(record){
    if(!record || typeof record !== 'object') return '';
    const best = nestedBest(record) || {};
    return String(record.holderUid || record.uid || best.holderUid || best.uid || '');
  }
  function recordHolder(record){
    if(!record || typeof record !== 'object') return '';
    const best = nestedBest(record) || {};
    const nick = record.holderNick || record.nick || best.holderNick || best.nick || '';
    return nick ? String(nick).trim().slice(0,24) : (recordOwnerUid(record) ? 'Jugador' : '');
  }
  function isOwnedRecord(record){
    const uid = currentUid();
    const owner = recordOwnerUid(record);
    return !!(uid && owner && uid === owner);
  }
  function ownerLine(record){
    if(isOwnedRecord(record)) return '<small class="profileOwnerBadge">TU R\u00c9CORD</small>';
    const holder = recordHolder(record);
    return holder ? `<small class="profileOwnerName" title="${esc(holder)}">${esc(holder)}</small>` : '';
  }
  function worldRecordCell(record, value){
    return `<em class="profileWorldCell ${isOwnedRecord(record) ? 'owned' : ''}"><strong>${esc(value)}</strong>${record ? ownerLine(record) : ''}</em>`;
  }
  function worldStatBlock(record, value){
    return `<div class="profileWorldStat ${isOwnedRecord(record) ? 'owned' : ''}"><span>Mundial</span><b>${esc(value)}</b>${record ? ownerLine(record) : ''}</div>`;
  }
  function worldRecordRow(item, record){
    const value = record ? item.format(record) : EM;
    const owned = isOwnedRecord(record);
    const holder = record && !owned ? recordHolder(record) : '';
    return `<article class="profileWorldRecordRow ${owned ? 'owned' : ''}"><div><span>${esc(item.group)}</span><b>${esc(item.label)}</b></div><strong>${esc(value)}</strong><em title="${esc(holder)}">${esc(holder)}</em>${owned ? '<i>TU R\u00c9CORD</i>' : ''}</article>`;
  }
  function renderWorldRecords(){
    prefetchWorldRecordsForProfile();
    const goalRows = goalWorldRequests().map(item => worldRecordRow(item, goalWorldRecord(item.metricKey, item.params))).join('');
    const campaignRows = campaignWorldRequests().map(item => worldRecordRow(item, campaignWorldRecord(item.levelKey))).join('');
    return secondaryShell('R\u00e9cords globales', `<div class="profileWorldRecordsView"><section><h4>GOL</h4><div class="profileWorldRecordRows">${goalRows}</div></section><section><h4>Campa\u00f1a</h4><div class="profileWorldRecordRows">${campaignRows || '<p class="profileEmpty">No hay niveles implementados.</p>'}</div></section></div>`, 'CONSULTA');
  }
  function renderProfile(){
    const box = el('profileContent');
    if(!box || !window.DATA_PROVIDER) return;
    if(currentView.type === 'main') box.innerHTML = renderMain();
    else {
      let title = 'Detalle de perfil';
      let content = '';
      if(currentView.type === 'allWorlds'){ title = 'Todos los mundos'; content = renderAllWorlds(); }
      else if(currentView.type === 'world'){ title = `Mundo ${currentView.world}`; content = renderWorld(currentView.world); }
      else if(currentView.type === 'goal'){ title = currentView.kind === 'fastest' ? 'Rapidez' : (currentView.kind === 'goals' ? 'Goles' : 'Superficie'); content = renderGoal(currentView.kind); }
      else if(currentView.type === 'worldRecords'){ title = 'R\u00e9cords globales'; content = renderWorldRecords(); }
      const variant = currentView.type === 'goal' ? `goal-${currentView.kind}` : currentView.type;
      box.innerHTML = renderMain() + profileLayer(content, title, variant);
    }
    bindProfileActions();
    const panel = box.querySelector('.profileLayerPanel');
    if(panel) setTimeout(() => { try { panel.focus({preventScroll:true}); } catch { panel.focus(); } }, 0);
  }
  function restoreProfileFocus(){
    if(!returnAction) return;
    const action = returnAction;
    returnAction = '';
    window.setTimeout(() => {
      const target = Array.from(document.querySelectorAll('[data-profile-action]')).find(node => node.dataset.profileAction === action);
      if(target) try { target.focus({preventScroll:true}); } catch { target.focus(); }
    }, 40);
  }
  function bindProfileActions(){
    document.querySelectorAll('.profileLayerPanel').forEach(panel => { panel.onclick = ev => ev.stopPropagation(); });
    document.querySelectorAll('[data-profile-action]').forEach(node => {
      node.onclick = () => {
        const action = node.dataset.profileAction || 'main';
        if(action === 'main'){
          closeProfileSubview();
          return;
        }
        returnAction = action;
        if(action === 'allWorlds') currentView = {type:'allWorlds'};
        else if(action === 'worldRecords') currentView = {type:'worldRecords'};
        else if(action.startsWith('world:')) currentView = {type:'world', world:+action.split(':')[1]};
        else if(action.startsWith('goal:')) currentView = {type:'goal', kind:action.split(':')[1]};
        renderProfile();
        if(window.TRIANOTA_NAVIGATION && typeof window.TRIANOTA_NAVIGATION.layerOpened === 'function'){
          window.TRIANOTA_NAVIGATION.layerOpened('profileSubview', {view:Object.assign({}, currentView)});
        }
      };
    });
  }
  function closeProfileSubview(fromHistory=false){
    if(currentView.type === 'main') return false;
    if(!fromHistory && window.TRIANOTA_NAVIGATION && typeof window.TRIANOTA_NAVIGATION.requestLayerClose === 'function'){
      if(window.TRIANOTA_NAVIGATION.requestLayerClose('profileSubview')) return true;
    }
    currentView = {type:'main'};
    renderProfile();
    restoreProfileFocus();
    return true;
  }
  function restoreProfileSubview(view){
    if(!view || view.type === 'main') return;
    currentView = Object.assign({}, view);
    renderProfile();
  }
  function openProfile(){
    currentView = {type:'main'};
    returnAction = '';
    renderProfile();
    if(typeof showModal === 'function') showModal('profileModal');
  }
  function initProfileUi(){
    const btn = el('profileBtn');
    if(btn) btn.onclick = openProfile;
    window.addEventListener('trianota:goalWorldRecordUpdated', () => {
      const modal = el('profileModal');
      if(modal && modal.classList.contains('show') && (currentView.type === 'worldRecords' || currentView.type === 'goal')) renderProfile();
    });
    window.addEventListener('trianota:campaignWorldRecordUpdated', () => {
      const modal = el('profileModal');
      if(modal && modal.classList.contains('show') && (currentView.type === 'worldRecords' || currentView.type === 'world')) renderProfile();
    });
  }

  window.renderProfile = renderProfile;
  window.openProfile = openProfile;
  window.closeProfileSubview = closeProfileSubview;
  window.restoreProfileSubview = restoreProfileSubview;
  initProfileUi();
})();
