// Perfil v19.83. UI premium compacta con r\u00e9cords mundiales bajo demanda.
(function(){
  'use strict';

  const EM = '\u2014';
  const STAR = '\u2605';
  const GOAL_DURATIONS = [
    {duration:120, label:'2 min'},
    {duration:180, label:'3 min'},
    {duration:300, label:'5 min'}
  ];
  const FASTEST_TARGETS = [
    {goals:3, label:'3 goles'},
    {goals:5, label:'5 goles'}
  ];
  const WORLD_SYMBOLS = ['\u25b3','\u25e5','\u25cf','\u25c7','\u21af','!','\u25cc','\u221e','\u2726','\u2605'];
  const GOAL_ICONS = {fastest:'gameSpeed', goals:'gameGoals', surface:'gameSurface'};
  let currentView = {type:'main'};

  function el(id){ return document.getElementById(id); }
  function esc(value){
    return String(value === undefined || value === null ? '' : value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }
  function readMainData(){
    try { return JSON.parse(localStorage.getItem('trianota_data_v1') || '{}'); }
    catch { return {}; }
  }
  function cachedCampaignWorldRecord(levelKey){
    const data = readMainData();
    const records = data && data.campaign && data.campaign.worldRecordByLevel;
    return records && records[levelKey] ? records[levelKey] : null;
  }
  function cachedGoalWorldRecord(metricKey, params){
    const data = readMainData();
    const worldRecords = data && data.goal && data.goal.worldRecords;
    const group = worldRecords && worldRecords[metricKey];
    if(!group) return null;
    return group[metricParamKey(params)] || null;
  }
  function metricParamKey(params){
    if(params === undefined || params === null) return 'default';
    if(typeof params === 'string' || typeof params === 'number' || typeof params === 'boolean') return String(params);
    const stable = Object.keys(params).sort().reduce((acc, key) => { acc[key] = params[key]; return acc; }, {});
    return JSON.stringify(stable);
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
  function worldLevels(world){ return (world && world.levels ? world.levels : []); }
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
  function goalRecords(){ return DATA_PROVIDER && DATA_PROVIDER.getGoalLocalRecords ? DATA_PROVIDER.getGoalLocalRecords() : []; }
  function goalRecordsForDuration(duration){ return goalRecords().filter(record => +record.duration === +duration); }
  function bestGoals(duration){
    const rec = goalRecordsForDuration(duration).sort((a,b)=>(b.goals||0)-(a.goals||0) || (b.bestUtil||0)-(a.bestUtil||0))[0];
    return rec ? `${rec.goals || 0}` : EM;
  }
  function bestGoalsLabel(duration){
    const value = bestGoals(duration);
    return value === EM ? EM : `${value} goles`;
  }
  function bestSurface(duration){
    const rec = goalRecordsForDuration(duration).sort((a,b)=>(b.bestUtil||0)-(a.bestUtil||0) || (b.goals||0)-(a.goals||0))[0];
    return rec ? percentLabel(rec.bestUtil || 0) : EM;
  }
  function personalFastest(target){
    const rec = DATA_PROVIDER && DATA_PROVIDER.getGoalPersonalBest ? DATA_PROVIDER.getGoalPersonalBest('fastestNGoles', {goals:target}) : null;
    return rec ? secondsLabel(rec) : EM;
  }
  function heroHtml(nick){
    return `
      <div class="profileHero compact">
        <div class="profileAvatar" aria-hidden="true"><span>${esc(initials(nick))}</span></div>
        <div class="profileHeroText">
          <div class="profileNick">${esc(nick)}</div>
          <div class="profileStatus"><i aria-hidden="true"></i> Perfil local</div>
        </div>
      </div>
    `;
  }
  function renderMain(){
    const nick = profileNick();
    return `
      <div class="profileMainView noMiniStats">
        ${heroHtml(nick)}
        <section class="profileCompactSection campaign">
          <div class="profileSectionTitle">Campa\u00f1a</div>
          <div class="profileWorldGrid">${campaignWorlds().map(worldTile).join('')}</div>
        </section>
        <section class="profileCompactSection goal">
          <div class="profileSectionTitle">GOL</div>
          <div class="profileGoalCards">
            ${goalCard('Rapidez', '3 goles', personalFastest(3), 'goal:fastest', GOAL_ICONS.fastest)}
            ${goalCard('Goles', '2 min', bestGoalsLabel(120), 'goal:goals', GOAL_ICONS.goals)}
            ${goalCard('Superficie', '2 min', bestSurface(120), 'goal:surface', GOAL_ICONS.surface)}
          </div>
        </section>
        <button class="profileWorldRecordsBtn" data-profile-action="worldRecords" type="button"><span>R\u00e9cords mundiales</span><b>Ver marcas globales</b><i class="uiIcon iconChevron" aria-hidden="true"></i></button>
      </div>
    `;
  }
  function worldTile(world){
    const best = bestByLevel();
    const states = profileWorldStates(best);
    const stateClass = states[world.world] || 'comingSoon';
    const progress = worldProgress(world, best);
    const enabled = stateClass === 'completed' || stateClass === 'current';
    const detail = stateClass === 'comingSoon' ? 'Pr\u00f3x.' : `${progress.done}/${progress.total}`;
    const stateLabel = stateClass === 'current' ? 'ACTUAL' : (stateClass === 'completed' ? iconHtml('iconCheck', 'profileStateIcon') : (stateClass === 'locked' ? 'BLOQ.' : ''));
    const stateLabelHtml = stateLabel ? `<small class="profileWorldStateLabel">${stateClass === 'completed' ? stateLabel : esc(stateLabel)}</small>` : '';
    const symbol = WORLD_SYMBOLS[(world.world || 1) - 1] || '*';
    const aria = stateClass === 'comingSoon' ? `Mundo ${world.world}, pr\u00f3ximamente` : `Mundo ${world.world}, ${detail}`;
    return `<button class="profileWorldTile ${stateClass}" ${enabled ? '' : 'disabled'} data-profile-action="world:${world.world}" type="button" aria-label="${esc(aria)}"><span class="profileWorldSymbol">${esc(symbol)}</span><b>M${world.world}</b><em>${esc(detail)}</em>${stateLabelHtml}</button>`;
  }
  function iconHtml(name, extraClass=''){
    const family = String(name || '').indexOf('game') === 0 ? 'gameIcon' : 'uiIcon';
    return `<span class="${family} ${esc(name)}${extraClass ? ` ${esc(extraClass)}` : ''}" aria-hidden="true"></span>`;
  }
  function goalCard(title, variant, value, action, icon){
    return `<button class="profileGoalCard" data-profile-action="${esc(action)}" type="button"><i aria-hidden="true">${iconHtml(icon)}</i><span>${esc(title)}</span><small>${esc(variant)}</small><b>${esc(value)}</b></button>`;
  }
  function secondaryShell(title, body){
    return `<div class="profileSubView"><div class="profileSubHead"><button class="profileBackBtn" data-profile-action="main" type="button" aria-label="Volver"><span class="uiIcon iconBack" aria-hidden="true"></span></button><h3>${esc(title)}</h3></div><div class="profileSubBody">${body}</div></div>`;
  }
  function renderWorld(worldNum){
    const world = campaignWorlds().find(item => +item.world === +worldNum);
    if(!world) return renderMain();
    const best = bestByLevel();
    const rows = implementedWorldLevels(world).map(level => {
      const key = `${world.world}-${level.n}`;
      const personal = personalCampaignRecord(best, key);
      const worldRec = cachedCampaignWorldRecord(key);
      const worldValue = worldRec ? secondsLabel(worldRec) : EM;
      const owned = isOwnedRecord(worldRec);
      return `<div class="profileDetailRow world ${owned ? 'owned' : ''}"><span>M${world.world}-N${level.n}</span><b>${personal ? secondsLabel(personal) : EM}</b>${worldRecordCell(worldRec, worldValue)}</div>`;
    }).join('') || '<p class="profileEmpty">Mundo no implementado.</p>';
    return secondaryShell(`Mundo ${world.world}`, `<div class="profileDetailLegend"><span>Nivel</span><b>Personal</b><em>Mundial</em></div><div class="profileDetailRows">${rows}</div>`);
  }
  function renderGoal(kind){
    if(kind === 'fastest'){
      return secondaryShell('Rapidez', detailRows(FASTEST_TARGETS.map(item => {
        const world = cachedGoalWorldRecord('fastestNGoles', {goals:item.goals});
        return {label:item.label, personal:personalFastest(item.goals), world:world ? secondsLabel(world) : EM, worldRecord:world};
      })));
    }
    if(kind === 'goals'){
      return secondaryShell('Goles', detailRows(GOAL_DURATIONS.map(item => {
        const world = cachedGoalWorldRecord('mostGoalsFixedDuration', {duration:item.duration});
        return {label:item.label, personal:bestGoalsLabel(item.duration), world:world ? `${world.goals || 0} goles` : EM, worldRecord:world};
      })));
    }
    return secondaryShell('Superficie', detailRows(GOAL_DURATIONS.map(item => {
      const world = cachedGoalWorldRecord('maxSurfaceUsage', {duration:item.duration});
      return {label:item.label, personal:bestSurface(item.duration), world:world ? percentLabel(world.bestUtil || world.surface || 0) : EM, worldRecord:world};
    })));
  }
  function detailRows(items){
    return `<div class="profileVariantCards">${items.map(item => `<article class="profileVariantCard"><div class="profileVariantName">${esc(item.label)}</div><div class="profileVariantStats"><div><span>Personal</span><b>${esc(item.personal)}</b></div>${worldStatBlock(item.worldRecord, item.world)}</div></article>`).join('')}</div>`;
  }
  function goalWorldRequests(){
    return [
      ...FASTEST_TARGETS.map(item => ({metricKey:'fastestNGoles', params:{goals:item.goals}, group:'Rapidez', label:item.label, format:r=>secondsLabel(r)})),
      ...GOAL_DURATIONS.map(item => ({metricKey:'mostGoalsFixedDuration', params:{duration:item.duration}, group:'Goles', label:item.label, format:r=>r ? `${r.goals || 0} goles` : EM})),
      ...GOAL_DURATIONS.map(item => ({metricKey:'maxSurfaceUsage', params:{duration:item.duration}, group:'Superficie', label:item.label, format:r=>r ? percentLabel(r.bestUtil || r.surface || 0) : EM}))
    ];
  }
  function campaignWorldRequests(){
    return implementedLevels().map(item => ({levelKey:item.key, group:'Campa\u00f1a', label:`M${item.world}-N${item.level}`, format:r=>secondsLabel(r)}));
  }
  function prefetchWorldRecordsForProfile(){
    if(!window.DATA_PROVIDER) return;
    if(typeof DATA_PROVIDER.prefetchGoalWorldRecords === 'function'){
      DATA_PROVIDER.prefetchGoalWorldRecords(goalWorldRequests().map(item => ({metricKey:item.metricKey, params:item.params})));
    }
    if(typeof DATA_PROVIDER.prefetchCampaignWorldRecords === 'function'){
      DATA_PROVIDER.prefetchCampaignWorldRecords(campaignWorldRequests().map(item => item.levelKey));
    }
  }
  function nestedBest(record){
    return record && typeof record === 'object' ? (record.best || record.record || record.worldRecord || null) : null;
  }
  function recordHolder(record){
    if(!record || typeof record !== 'object') return '';
    const best = nestedBest(record) || {};
    const nick = record.holderNick || record.nick || best.holderNick || best.nick || '';
    if(nick) return String(nick).trim().slice(0, 24);
    return recordOwnerUid(record) ? 'Jugador' : '';
  }
  function recordOwnerUid(record){
    if(!record || typeof record !== 'object') return '';
    const best = nestedBest(record) || {};
    return String(record.holderUid || record.uid || best.holderUid || best.uid || '');
  }
  function isOwnedRecord(record){
    const uid = currentUid();
    const owner = recordOwnerUid(record);
    return !!(uid && owner && uid === owner);
  }
  function recordOwnerMeta(record){
    const owned = isOwnedRecord(record);
    const holder = recordHolder(record);
    return {owned, holder};
  }
  function ownerLine(record){
    const meta = recordOwnerMeta(record);
    if(meta.owned) return '<small class="profileOwnerBadge">TU R\u00c9CORD</small>';
    return meta.holder ? `<small class="profileOwnerName" title="${esc(meta.holder)}">${esc(meta.holder)}</small>` : '';
  }
  function worldRecordCell(record, value){
    const meta = recordOwnerMeta(record);
    return `<em class="profileWorldCell ${meta.owned ? 'owned' : ''}"><strong>${esc(value)}</strong>${record ? ownerLine(record) : ''}</em>`;
  }
  function worldStatBlock(record, value){
    const meta = recordOwnerMeta(record);
    return `<div class="profileWorldStat ${meta.owned ? 'owned' : ''}"><span>Mundial</span><b>${esc(value)}</b>${record ? ownerLine(record) : ''}</div>`;
  }
  function worldRecordRow(item, record){
    const value = record ? item.format(record) : EM;
    const meta = recordOwnerMeta(record);
    const holder = record && !meta.owned ? meta.holder : '';
    return `<article class="profileWorldRecordRow ${meta.owned ? 'owned' : ''}"><div><span>${esc(item.group)}</span><b>${esc(item.label)}</b></div><strong>${esc(value)}</strong><em title="${esc(holder)}">${esc(holder)}</em>${meta.owned ? '<i>TU R\u00c9CORD</i>' : ''}</article>`;
  }
  function renderWorldRecords(){
    prefetchWorldRecordsForProfile();
    const goalRows = goalWorldRequests().map(item => worldRecordRow(item, DATA_PROVIDER.getGoalWorldRecord(item.metricKey, item.params))).join('');
    const campaignRows = campaignWorldRequests().map(item => worldRecordRow(item, DATA_PROVIDER.getCampaignWorldRecord(item.levelKey))).join('');
    return secondaryShell('R\u00e9cords mundiales', `
      <div class="profileWorldRecordsView">
        <section><h4>GOL</h4><div class="profileWorldRecordRows">${goalRows}</div></section>
        <section><h4>Campa\u00f1a</h4><div class="profileWorldRecordRows">${campaignRows || '<p class="profileEmpty">No hay niveles implementados.</p>'}</div></section>
      </div>
    `);
  }
  function renderProfile(){
    const box = el('profileContent');
    if(!box || !window.DATA_PROVIDER) return;
    if(currentView.type === 'world') box.innerHTML = renderWorld(currentView.world);
    else if(currentView.type === 'goal') box.innerHTML = renderGoal(currentView.kind);
    else if(currentView.type === 'worldRecords') box.innerHTML = renderWorldRecords();
    else box.innerHTML = renderMain();
    bindProfileActions();
  }
  function bindProfileActions(){
    document.querySelectorAll('[data-profile-action]').forEach(btn => {
      btn.onclick = () => {
        const action = btn.dataset.profileAction || 'main';
        if(action === 'main') currentView = {type:'main'};
        else if(action === 'worldRecords') currentView = {type:'worldRecords'};
        else if(action.startsWith('world:')) currentView = {type:'world', world:+action.split(':')[1]};
        else if(action.startsWith('goal:')) currentView = {type:'goal', kind:action.split(':')[1]};
        renderProfile();
      };
    });
  }
  function openProfile(){
    currentView = {type:'main'};
    renderProfile();
    if(typeof showModal === 'function') showModal('profileModal');
  }
  function initProfileUi(){
    const btn = el('profileBtn');
    if(btn) btn.onclick = openProfile;
    window.addEventListener('trianota:goalWorldRecordUpdated', () => {
      const modal = el('profileModal');
      if(modal && modal.classList.contains('show') && currentView.type === 'worldRecords') renderProfile();
    });
    window.addEventListener('trianota:campaignWorldRecordUpdated', () => {
      const modal = el('profileModal');
      if(modal && modal.classList.contains('show') && (currentView.type === 'worldRecords' || currentView.type === 'world')) renderProfile();
    });
  }

  window.renderProfile = renderProfile;
  window.openProfile = openProfile;
  initProfileUi();
})();




