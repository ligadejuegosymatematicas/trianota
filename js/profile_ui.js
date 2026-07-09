// Perfil v19.81. Vista principal compacta mobile-first; detalles bajo demanda.
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
  function implementedLevels(){
    return campaignWorlds().flatMap(world => worldLevels(world).filter(level => level.implemented).map(level => ({world:world.world, level:level.n, key:`${world.world}-${level.n}`})));
  }
  function bestByLevel(){ return DATA_PROVIDER && DATA_PROVIDER.getCampaignPersonalBestTimes ? DATA_PROVIDER.getCampaignPersonalBestTimes() : {}; }
  function personalCampaignRecord(best, key){
    const record = best && best[key];
    if(!record) return null;
    return typeof record === 'number' ? {time:record} : record;
  }
  function completedLevels(best){ return implementedLevels().filter(level => personalCampaignRecord(best, level.key)).length; }
  function worldsWithProgress(best){
    return campaignWorlds().filter(world => worldLevels(world).some(level => level.implemented && personalCampaignRecord(best, `${world.world}-${level.n}`))).length;
  }
  function goalRecords(){ return DATA_PROVIDER && DATA_PROVIDER.getGoalLocalRecords ? DATA_PROVIDER.getGoalLocalRecords() : []; }
  function goalMarksCount(){
    let count = 0;
    FASTEST_TARGETS.forEach(item => { if(personalFastest(item.goals) !== EM) count++; });
    GOAL_DURATIONS.forEach(item => { if(bestGoals(item.duration) !== EM) count++; if(bestSurface(item.duration) !== EM) count++; });
    return count;
  }
  function goalRecordsForDuration(duration){ return goalRecords().filter(record => +record.duration === +duration); }
  function bestGoals(duration){
    const rec = goalRecordsForDuration(duration).sort((a,b)=>(b.goals||0)-(a.goals||0) || (b.bestUtil||0)-(a.bestUtil||0))[0];
    return rec ? `${rec.goals || 0}` : EM;
  }
  function bestSurface(duration){
    const rec = goalRecordsForDuration(duration).sort((a,b)=>(b.bestUtil||0)-(a.bestUtil||0) || (b.goals||0)-(a.goals||0))[0];
    return rec ? percentLabel(rec.bestUtil || 0) : EM;
  }
  function personalFastest(target){
    const rec = DATA_PROVIDER && DATA_PROVIDER.getGoalPersonalBest ? DATA_PROVIDER.getGoalPersonalBest('fastestNGoles', {goals:target}) : null;
    return rec ? secondsLabel(rec) : EM;
  }
  function profileStats(){
    const uid = currentUid();
    return DATA_PROVIDER && DATA_PROVIDER.getPlayerStats ? DATA_PROVIDER.getPlayerStats(uid) : null;
  }
  function flattenOwnedRecords(stats){
    const owned = stats && stats.worldRecordsOwned;
    if(!owned || typeof owned !== 'object') return [];
    const rows = [];
    const goal = owned.goal || {};
    Object.keys(goal).forEach(metricKey => {
      const variants = goal[metricKey] || {};
      Object.keys(variants).forEach(variantKey => {
        const rec = variants[variantKey];
        if(rec) rows.push({kind:'GOL', key:variantKey, label:rec.metricLabel || metricKey, value:rec.valueLabel || rec.summary || variantKey});
      });
    });
    const campaign = owned.campaign || {};
    Object.keys(campaign).forEach(levelKey => {
      const rec = campaign[levelKey];
      if(rec) rows.push({kind:'META', key:levelKey, label:rec.levelLabel || `M${String(levelKey).replace('-', '-N')}`, value:rec.valueLabel || rec.summary || 'R\u00e9cord mundial'});
    });
    return rows;
  }
  function ownsWorldRecord(rows, key){ return rows.some(row => row.kind === 'META' && row.key === key); }
  function heroHtml(nick){
    return `
      <div class="profileHero compact">
        <div class="profileAvatar" aria-hidden="true">${esc(initials(nick))}</div>
        <div class="profileHeroText">
          <div class="profileNick">${esc(nick)}</div>
          <div class="profileStatus">Perfil local</div>
        </div>
      </div>
    `;
  }
  function summaryButton(label, value, action){
    return `<button class="profileMiniStat" data-profile-action="${esc(action || '')}" type="button"><span>${esc(label)}</span><b>${esc(value)}</b></button>`;
  }
  function renderMain(){
    const nick = profileNick();
    const best = bestByLevel();
    const levels = implementedLevels();
    const done = completedLevels(best);
    const worlds = worldsWithProgress(best);
    const ownedRows = flattenOwnedRecords(profileStats());
    return `
      <div class="profileMainView">
        ${heroHtml(nick)}
        <div class="profileMiniGrid">
          ${summaryButton('Campa\u00f1a', `${done}/${levels.length}`, 'main')}
          ${summaryButton('Mundos', `${worlds}/3`, 'main')}
          ${summaryButton('GOL', `${goalMarksCount()}`, 'goal:goals')}
          ${summaryButton('Mundiales', `${ownedRows.length}`, 'owned')}
        </div>
        <section class="profileCompactSection campaign">
          <div class="profileSectionTitle">Campa\u00f1a</div>
          <div class="profileWorldGrid">${campaignWorlds().map(worldTile).join('')}</div>
        </section>
        <section class="profileCompactSection goal">
          <div class="profileSectionTitle">GOL</div>
          <div class="profileGoalCards">
            ${goalCard('Rapidez', bestFastestSummary(), 'goal:fastest')}
            ${goalCard('Goles', bestGoalsSummary(), 'goal:goals')}
            ${goalCard('Superficie', bestSurfaceSummary(), 'goal:surface')}
          </div>
        </section>
      </div>
    `;
  }
  function worldTile(world){
    const levels = worldLevels(world);
    const implemented = levels.filter(level => level.implemented);
    const best = bestByLevel();
    const done = implemented.filter(level => personalCampaignRecord(best, `${world.world}-${level.n}`)).length;
    const enabled = implemented.length > 0;
    const detail = enabled ? `${done}/${implemented.length}` : 'Pr\u00f3x.';
    const symbol = WORLD_SYMBOLS[(world.world || 1) - 1] || '*';
    return `<button class="profileWorldTile ${enabled ? 'active' : 'locked'}" ${enabled ? '' : 'disabled'} data-profile-action="world:${world.world}" type="button"><span>${esc(symbol)}</span><b>M${world.world}</b><em>${esc(detail)}</em></button>`;
  }
  function goalCard(title, value, action){
    return `<button class="profileGoalCard" data-profile-action="${esc(action)}" type="button"><span>${esc(title)}</span><b>${esc(value)}</b></button>`;
  }
  function bestFastestSummary(){ return FASTEST_TARGETS.map(item => personalFastest(item.goals)).find(value => value !== EM) || EM; }
  function bestGoalsSummary(){
    const values = GOAL_DURATIONS.map(item => bestGoals(item.duration)).filter(value => value !== EM).map(Number);
    return values.length ? `${Math.max(...values)}` : EM;
  }
  function bestSurfaceSummary(){ return GOAL_DURATIONS.map(item => bestSurface(item.duration)).find(value => value !== EM) || EM; }
  function secondaryShell(title, body){
    return `<div class="profileSubView"><div class="profileSubHead"><button class="profileBackBtn" data-profile-action="main" type="button" aria-label="Volver">&lsaquo;</button><h3>${esc(title)}</h3></div><div class="profileSubBody">${body}</div></div>`;
  }
  function renderWorld(worldNum){
    const world = campaignWorlds().find(item => +item.world === +worldNum);
    if(!world) return renderMain();
    const best = bestByLevel();
    const owned = flattenOwnedRecords(profileStats());
    const rows = worldLevels(world).filter(level => level.implemented).map(level => {
      const key = `${world.world}-${level.n}`;
      const personal = personalCampaignRecord(best, key);
      const worldRec = cachedCampaignWorldRecord(key);
      const own = ownsWorldRecord(owned, key);
      return `<div class="profileDetailRow"><span>M${world.world}-N${level.n}</span><b>${personal ? secondsLabel(personal) : EM}</b><em>${worldRec ? secondsLabel(worldRec) : EM}${own ? ' ' + STAR : ''}</em></div>`;
    }).join('') || '<p class="profileEmpty">Mundo no implementado.</p>';
    return secondaryShell(`Mundo ${world.world}`, `<div class="profileDetailLegend"><span>Nivel</span><b>Personal</b><em>Mundial</em></div><div class="profileDetailRows">${rows}</div>`);
  }
  function renderGoal(kind){
    if(kind === 'fastest'){
      return secondaryShell('Rapidez', detailRows(FASTEST_TARGETS.map(item => {
        const world = cachedGoalWorldRecord('fastestNGoles', {goals:item.goals});
        return {label:item.label, personal:personalFastest(item.goals), world:world ? secondsLabel(world) : EM};
      })));
    }
    if(kind === 'goals'){
      return secondaryShell('Goles', detailRows(GOAL_DURATIONS.map(item => {
        const world = cachedGoalWorldRecord('mostGoalsFixedDuration', {duration:item.duration});
        return {label:item.label, personal:bestGoals(item.duration), world:world ? String(world.goals || 0) : EM};
      })));
    }
    return secondaryShell('Superficie', detailRows(GOAL_DURATIONS.map(item => {
      const world = cachedGoalWorldRecord('maxSurfaceUsage', {duration:item.duration});
      return {label:item.label, personal:bestSurface(item.duration), world:world ? percentLabel(world.bestUtil || world.surface || 0) : EM};
    })));
  }
  function detailRows(items){
    return `<div class="profileDetailLegend"><span>Marca</span><b>Personal</b><em>Mundial</em></div><div class="profileDetailRows">${items.map(item => `<div class="profileDetailRow"><span>${esc(item.label)}</span><b>${esc(item.personal)}</b><em>${esc(item.world)}</em></div>`).join('')}</div>`;
  }
  function renderOwned(){
    const rows = flattenOwnedRecords(profileStats());
    const body = rows.length ? `<div class="profileOwnedRows">${rows.map(row => `<div class="profileOwnedRow"><span>${esc(row.kind)}</span><b>${esc(row.label)}</b><em>${esc(row.value)}</em></div>`).join('')}</div>` : '<p class="profileEmpty large">A\u00fan no tienes r\u00e9cords mundiales.</p>';
    return secondaryShell('Mundiales', body);
  }
  function renderProfile(){
    const box = el('profileContent');
    if(!box || !window.DATA_PROVIDER) return;
    if(currentView.type === 'world') box.innerHTML = renderWorld(currentView.world);
    else if(currentView.type === 'goal') box.innerHTML = renderGoal(currentView.kind);
    else if(currentView.type === 'owned') box.innerHTML = renderOwned();
    else box.innerHTML = renderMain();
    bindProfileActions();
  }
  function bindProfileActions(){
    document.querySelectorAll('[data-profile-action]').forEach(btn => {
      btn.onclick = () => {
        const action = btn.dataset.profileAction || 'main';
        if(action === 'main') currentView = {type:'main'};
        else if(action === 'owned') currentView = {type:'owned'};
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
    window.addEventListener('trianota:playerStatsUpdated', () => {
      const modal = el('profileModal');
      if(modal && modal.classList.contains('show')) renderProfile();
    });
  }

  window.renderProfile = renderProfile;
  window.openProfile = openProfile;
  initProfileUi();
})();

