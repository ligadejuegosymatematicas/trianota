// Local data provider. Classic global script loaded before main.js.
var DATA_PROVIDER = window.DATA_PROVIDER = (() => {
  const STORAGE_KEY = 'trianota_data_v1';
  const LEGACY_GOAL_RECORDS_KEY = 'tdg_records_v1';
  const LEGACY_META_BEST_KEY = 'tdg_meta_best_v1';

  // Esquema local preparado para un proveedor remoto futuro, sin conexion remota ni autenticacion.
  // {
  //   player: { profile: { nick, anonymousId, createdAt } },
  //   goal: {
  //     localRecords: [],
  //     personalBestByMetric: { mostGoalsFixedDuration: {}, fastestNGoles: {}, maxSurfaceUsage: {} },
  //     worldRecords: { mostGoalsFixedDuration: {}, fastestNGoles: {}, maxSurfaceUsage: {} },
  //     globalRankings: { mostGoalsFixedDuration: {}, fastestNGoles: {}, maxSurfaceUsage: {} }
  //   },
  //   campaign: {
  //     attemptsByLevel: {},
  //     personalBestTimeByLevel: {},
  //     sessionBestByLevel: {},
  //     worldRecordByLevel: {},
  //     globalRankingByLevel: {}
  //   }
  // }
  const freshMetricGroups = () => ({ mostGoalsFixedDuration: {}, fastestNGoles: {}, maxSurfaceUsage: {} });
  const freshData = () => ({
    player: { profile: { nick: 'Jugador', anonymousId: makeAnonymousId(), createdAt: new Date().toISOString() } },
    goal: { localRecords: [], personalBestByMetric: freshMetricGroups(), worldRecords: freshMetricGroups(), globalRankings: freshMetricGroups() },
    campaign: { attemptsByLevel: {}, personalBestTimeByLevel: {}, sessionBestByLevel: {}, worldRecordByLevel: {}, globalRankingByLevel: {} }
  });

  function makeAnonymousId(){
    return `anon_${Date.now()}_${Math.random().toString(36).slice(2,10)}`;
  }
  function readJson(key, fallback){
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }
  function writeJson(key, value){
    localStorage.setItem(key, JSON.stringify(value));
  }
  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }
  function stableValue(value){
    if(!value || typeof value !== 'object') return value;
    if(Array.isArray(value)) return value.map(stableValue);
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = stableValue(value[key]);
      return acc;
    }, {});
  }
  function metricParamKey(params){
    if(params === undefined || params === null) return 'default';
    if(typeof params === 'string' || typeof params === 'number' || typeof params === 'boolean') return String(params);
    return JSON.stringify(stableValue(params));
  }
  function normalizeMetricGroups(raw){
    const base = freshMetricGroups();
    const source = raw && typeof raw === 'object' ? raw : {};
    Object.keys(base).forEach(metricKey => {
      if(source[metricKey] && typeof source[metricKey] === 'object' && !Array.isArray(source[metricKey])){
        base[metricKey] = source[metricKey];
      }
    });
    return base;
  }
  function getMetricEntry(collection, metricKey, params, fallback){
    const bucket = collection && collection[metricKey];
    if(!bucket || typeof bucket !== 'object' || Array.isArray(bucket)) return clone(fallback);
    const key = metricParamKey(params);
    return bucket[key] === undefined || bucket[key] === null ? clone(fallback) : clone(bucket[key]);
  }
  function saveMetricEntry(collection, metricKey, params, record){
    if(!collection[metricKey] || typeof collection[metricKey] !== 'object' || Array.isArray(collection[metricKey])){
      collection[metricKey] = {};
    }
    const key = metricParamKey(params);
    collection[metricKey][key] = record === undefined ? null : clone(record);
    writeJson(STORAGE_KEY, data);
    return clone(collection[metricKey][key]);
  }
  function normalizeData(raw){
    const base = freshData();
    const data = raw && typeof raw === 'object' ? raw : {};
    return {
      player: { profile: {...base.player.profile, ...(data.player && data.player.profile ? data.player.profile : {})} },
      goal: {
        localRecords: Array.isArray(data.goal && data.goal.localRecords) ? data.goal.localRecords : base.goal.localRecords,
        personalBestByMetric: normalizeMetricGroups(data.goal && data.goal.personalBestByMetric),
        worldRecords: normalizeMetricGroups(data.goal && data.goal.worldRecords),
        globalRankings: normalizeMetricGroups(data.goal && data.goal.globalRankings)
      },
      campaign: {
        attemptsByLevel: {...base.campaign.attemptsByLevel, ...(data.campaign && data.campaign.attemptsByLevel ? data.campaign.attemptsByLevel : {})},
        personalBestTimeByLevel: {...base.campaign.personalBestTimeByLevel, ...(data.campaign && data.campaign.personalBestTimeByLevel ? data.campaign.personalBestTimeByLevel : {})},
        sessionBestByLevel: {...base.campaign.sessionBestByLevel, ...(data.campaign && data.campaign.sessionBestByLevel ? data.campaign.sessionBestByLevel : {})},
        worldRecordByLevel: {...base.campaign.worldRecordByLevel, ...(data.campaign && data.campaign.worldRecordByLevel ? data.campaign.worldRecordByLevel : {})},
        globalRankingByLevel: {...base.campaign.globalRankingByLevel, ...(data.campaign && data.campaign.globalRankingByLevel ? data.campaign.globalRankingByLevel : {})}
      }
    };
  }
  const remoteRefreshes = {};
  function refreshKey(methodName, args){
    return `${methodName}:${metricParamKey(args || [])}`;
  }
  function refreshRemote(methodName, args, onValue){
    try {
      const provider = window.FIREBASE_PROVIDER;
      if(!provider || typeof provider[methodName] !== 'function') return;
      const key = refreshKey(methodName, args);
      if(remoteRefreshes[key]) return;
      const ready = provider.ready && typeof provider.ready.then === 'function' ? provider.ready : Promise.resolve(provider.enabled);
      remoteRefreshes[key] = ready.then(() => {
        if(!provider.enabled) return null;
        return provider[methodName].apply(provider, args || []);
      }).then(value => {
        if(value === undefined || value === null) return;
        onValue(value);
      }).catch(() => {}).finally(() => { delete remoteRefreshes[key]; });
    } catch {}
  }
  function cacheMetricEntry(collection, metricKey, params, record){
    if(record === undefined || record === null) return;
    saveMetricEntry(collection, metricKey, params, record);
  }
  function cacheMetricRanking(collection, metricKey, params, ranking){
    if(!Array.isArray(ranking)) return;
    saveMetricEntry(collection, metricKey, params, ranking);
  }
  function migrateLegacy(data){
    const legacyGoalRecords = readJson(LEGACY_GOAL_RECORDS_KEY, []);
    if(Array.isArray(legacyGoalRecords) && legacyGoalRecords.length && !data.goal.localRecords.length){
      data.goal.localRecords = legacyGoalRecords;
    }
    const legacyMetaBest = readJson(LEGACY_META_BEST_KEY, {});
    if(legacyMetaBest && typeof legacyMetaBest === 'object'){
      Object.keys(legacyMetaBest).forEach(levelKey => {
        if(!data.campaign.personalBestTimeByLevel[levelKey]){
          data.campaign.personalBestTimeByLevel[levelKey] = legacyMetaBest[levelKey];
        }
      });
    }
    return data;
  }

  let data = migrateLegacy(normalizeData(readJson(STORAGE_KEY, null)));
  writeJson(STORAGE_KEY, data);

  const api = {
    getPlayerProfile(){ return clone(data.player.profile); },
    savePlayerProfile(profilePatch){ data.player.profile = {...data.player.profile, ...profilePatch}; writeJson(STORAGE_KEY, data); return clone(data.player.profile); },
    getGoalLocalRecords(){ return clone(data.goal.localRecords); },
    saveGoalLocalRecords(records){ data.goal.localRecords = Array.isArray(records) ? clone(records) : []; writeJson(STORAGE_KEY, data); writeJson(LEGACY_GOAL_RECORDS_KEY, data.goal.localRecords); return clone(data.goal.localRecords); },
    getGoalPersonalBest(metricKey, params){ return getMetricEntry(data.goal.personalBestByMetric, metricKey, params, null); },
    saveGoalPersonalBest(metricKey, params, record){ return saveMetricEntry(data.goal.personalBestByMetric, metricKey, params, record); },
    getGoalWorldRecord(metricKey, params){ const local = getMetricEntry(data.goal.worldRecords, metricKey, params, null); refreshRemote('getGoalWorldRecord', [metricKey, params], value => cacheMetricEntry(data.goal.worldRecords, metricKey, params, value)); return local; },
    getGoalGlobalRanking(metricKey, params){ const ranking = getMetricEntry(data.goal.globalRankings, metricKey, params, []); refreshRemote('getGoalGlobalRanking', [metricKey, params], value => cacheMetricRanking(data.goal.globalRankings, metricKey, params, value)); return Array.isArray(ranking) ? ranking : []; },
    getCampaignPersonalBestTime(levelKey){ return data.campaign.personalBestTimeByLevel[levelKey] ? clone(data.campaign.personalBestTimeByLevel[levelKey]) : null; },
    getCampaignPersonalBestTimes(){ return clone(data.campaign.personalBestTimeByLevel); },
    saveCampaignPersonalBestTime(levelKey, result){ data.campaign.personalBestTimeByLevel[levelKey] = clone(result); writeJson(STORAGE_KEY, data); writeJson(LEGACY_META_BEST_KEY, data.campaign.personalBestTimeByLevel); return clone(result); },
    getCampaignSessionBest(levelKey){ return data.campaign.sessionBestByLevel[levelKey] ? clone(data.campaign.sessionBestByLevel[levelKey]) : null; },
    saveCampaignSessionBest(levelKey, result){ data.campaign.sessionBestByLevel[levelKey] = clone(result); writeJson(STORAGE_KEY, data); return clone(result); },
    addCampaignAttempt(levelKey, attempt){ const list = data.campaign.attemptsByLevel[levelKey] || []; list.push(clone(attempt)); data.campaign.attemptsByLevel[levelKey] = list; writeJson(STORAGE_KEY, data); return clone(list); },
    getCampaignWorldRecord(levelKey){ const local = data.campaign.worldRecordByLevel[levelKey] ? clone(data.campaign.worldRecordByLevel[levelKey]) : null; refreshRemote('getCampaignWorldRecord', [levelKey], value => { data.campaign.worldRecordByLevel[levelKey] = clone(value); writeJson(STORAGE_KEY, data); }); return local; },
    getCampaignGlobalRanking(levelKey){ const ranking = data.campaign.globalRankingByLevel[levelKey]; refreshRemote('getCampaignGlobalRanking', [levelKey], value => { if(Array.isArray(value)){ data.campaign.globalRankingByLevel[levelKey] = clone(value); writeJson(STORAGE_KEY, data); } }); return Array.isArray(ranking) ? clone(ranking) : []; },
    getWorldRecord(scope, key, params){
      if(scope === 'campaign') return api.getCampaignWorldRecord(key);
      if(scope === 'goal') return api.getGoalWorldRecord(key, params);
      return null;
    },
    getGlobalRanking(scope, key, params){
      if(scope === 'campaign') return api.getCampaignGlobalRanking(key);
      if(scope === 'goal') return api.getGoalGlobalRanking(key, params);
      return [];
    }
  };

  return api;
})();