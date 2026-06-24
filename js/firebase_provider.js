// Optional Firebase provider.
// GitHub Pages remains the frontend host; this stage writes candidate entries and updates provisional best docs.
var FIREBASE_PROVIDER = window.FIREBASE_PROVIDER = (() => {
  let readyResolved = false;
  const firebaseConfig = {
    apiKey: "AIzaSyAqAIowWiWcnSSYxbVcHoBBsHFtaddo-bk",
    authDomain: "trinota-672ff.firebaseapp.com",
    projectId: "trinota-672ff",
    storageBucket: "trinota-672ff.firebasestorage.app",
    messagingSenderId: "579006954330",
    appId: "1:579006954330:web:f72c3154a75cfd9e0d9163"
  };

  const api = {
    enabled: false,
    uid: null,
    app: null,
    auth: null,
    db: null,
    firestoreReady: false,
    lastError: null,
    ready: Promise.resolve(false),
    getUid(){ return api.uid; },
    getCampaignWorldRecord,
    getCampaignGlobalRanking,
    getGoalWorldRecord,
    getGoalGlobalRanking,
    getGoalPersonalBest(){ return Promise.resolve(null); },
    saveGoalPersonalBest(){ return Promise.resolve(null); },
    submitGoalRecord,
    submitCampaignRecord,
    debugStatus,
    getWorldRecord,
    getGlobalRanking,
    submitRecord(){ return { skipped: true, reason: api.enabled ? 'firebase-candidate-stage' : 'firebase-disabled' }; }
  };

  function hasConfig(config){
    return !!(config && config.apiKey && config.authDomain && config.projectId && config.appId);
  }

  function setError(err){
    api.lastError = err && (err.code || err.message) ? (err.code || err.message) : String(err);
  }

  function debugStatus(){
    return {
      enabled:api.enabled,
      uid:api.uid,
      ready:readyResolved,
      firestoreReady:api.firestoreReady,
      lastError:api.lastError
    };
  }

  function warnFirestoreWrite(type, path, payload, err){
    if(err) setError(err);
    try {
      console.warn('[Trianota Firestore write failed]', {
        type,
        path,
        payload,
        code:err && err.code,
        message:err && err.message
      });
    } catch {}
  }

  function toPlain(value){
    if(value === undefined || value === null) return value;
    if(value && typeof value.toDate === 'function') return value.toDate().toISOString();
    if(Array.isArray(value)) return value.map(toPlain);
    if(typeof value === 'object'){
      const out = {};
      Object.keys(value).forEach(key => { out[key] = toPlain(value[key]); });
      return out;
    }
    return value;
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

  function recordFromDoc(data){
    if(!data || typeof data !== 'object') return null;
    const plain = toPlain(data);
    return plain.best || plain.record || plain.worldRecord || plain;
  }

  function rankingSort(metricKey){
    if(metricKey === 'fastestNGoles') return { field: 'time', dir: 'asc' };
    if(metricKey === 'maxSurfaceUsage') return { field: 'bestUtil', dir: 'desc' };
    return { field: 'goals', dir: 'desc' };
  }
  function numeric(value){
    const n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
  }

  function isBetterGoalRecord(metricKey, currentBest, candidate){
    if(!candidate) return false;
    if(!currentBest) return true;
    const curGoals = numeric(currentBest.goals);
    const nextGoals = numeric(candidate.goals);
    const curSurface = numeric(currentBest.bestUtil || currentBest.surface);
    const nextSurface = numeric(candidate.bestUtil || candidate.surface);
    const curTime = numeric(currentBest.time || currentBest.seconds || currentBest.duration);
    const nextTime = numeric(candidate.time || candidate.seconds || candidate.duration);

    if(metricKey === 'maxSurfaceUsage'){
      return nextSurface > curSurface || (nextSurface === curSurface && nextGoals > curGoals);
    }
    if(metricKey === 'fastestNGoles'){
      if(nextTime <= 0) return false;
      return curTime <= 0 || nextTime < curTime;
    }
    return nextGoals > curGoals || (nextGoals === curGoals && nextSurface > curSurface);
  }

  function isBetterCampaignRecord(currentBest, candidate){
    if(!candidate) return false;
    const nextTime = numeric(candidate.time);
    if(nextTime <= 0) return false;
    if(!currentBest) return true;
    const curTime = numeric(currentBest.time);
    return curTime <= 0 || nextTime < curTime;
  }

  async function ensureReady(){
    try { await api.ready; }
    catch {}
    return !!(api.enabled && api.firestoreReady && api.db);
  }

  async function readDoc(ref){
    try {
      if(!await ensureReady()) return null;
      const snap = await ref.get();
      if(!snap || !snap.exists) return null;
      return recordFromDoc(snap.data());
    } catch (err) {
      setError(err);
      return null;
    }
  }

  async function readRanking(ref, sort){
    try {
      if(!await ensureReady()) return [];
      const query = ref.orderBy(sort.field, sort.dir).limit(10);
      const snap = await query.get();
      if(!snap || snap.empty) return [];
      return snap.docs.map(doc => ({ id: doc.id, ...toPlain(doc.data()) }));
    } catch (err) {
      setError(err);
      return [];
    }
  }

  async function getCampaignWorldRecord(levelKey){
    if(!levelKey || !await ensureReady()) return null;
    return readDoc(api.db.collection('campaignRecords').doc(String(levelKey)));
  }

  async function getCampaignGlobalRanking(levelKey){
    if(!levelKey || !await ensureReady()) return [];
    return readRanking(api.db.collection('campaignRecords').doc(String(levelKey)).collection('entries'), { field: 'time', dir: 'asc' });
  }

  async function getGoalWorldRecord(metricKey, params){
    if(!metricKey || !await ensureReady()) return null;
    const variantKey = metricParamKey(params);
    return readDoc(api.db.collection('goalRecords').doc(String(metricKey)).collection('variants').doc(variantKey));
  }

  async function getGoalGlobalRanking(metricKey, params){
    if(!metricKey || !await ensureReady()) return [];
    const variantKey = metricParamKey(params);
    return readRanking(api.db.collection('goalRecords').doc(String(metricKey)).collection('variants').doc(variantKey).collection('entries'), rankingSort(metricKey));
  }

  function cleanRecord(value){
    if(value === undefined) return null;
    if(value === null) return null;
    if(typeof value === 'number') return Number.isFinite(value) ? value : null;
    if(typeof value === 'string' || typeof value === 'boolean') return value;
    if(Array.isArray(value)) return value.slice(0, 40).map(cleanRecord).filter(v => v !== undefined);
    if(typeof value === 'object'){
      const out = {};
      Object.keys(value).forEach(key => {
        if(key === 'seq') return;
        const cleaned = cleanRecord(value[key]);
        if(cleaned !== undefined) out[key] = cleaned;
      });
      return out;
    }
    return null;
  }

  function profilePayload(record){
    const nick = record && record.nick ? String(record.nick).trim().slice(0, 16) : 'Jugador';
    return { uid: api.uid, nick };
  }

  async function submitGoalRecord(metricKey, params, record){
    try {
      const variantKey = metricParamKey(params);
      const entryPath = 'goalRecords/' + String(metricKey) + '/variants/' + variantKey + '/entries/{autoId}';
      if(!metricKey || !record) return { skipped:true, reason:'missing-goal-record-data' };
      if(!await ensureReady()){
        warnFirestoreWrite('goal entry', entryPath, {params, record, debugStatus:debugStatus()}, {code:'firebase-disabled', message:'Firebase provider is not ready'});
        return { skipped:true, reason:'firebase-disabled' };
      }
      const bestCandidate = {
        ...profilePayload(record),
        metricKey:String(metricKey),
        variantKey,
        params:cleanRecord(params || {}),
        record:cleanRecord(record),
        goals:Number(record.goals || 0),
        bestUtil:Number(record.bestUtil || record.surface || 0),
        time:Number(record.time || record.seconds || record.duration || 0),
        duration:Number(record.duration || (params && params.duration) || 0),
        clientCreatedAt:new Date().toISOString()
      };
      const payload = {...bestCandidate, createdAt:firebase.firestore.FieldValue.serverTimestamp()};
      let ref;
      try {
        ref = await api.db.collection('goalRecords').doc(String(metricKey)).collection('variants').doc(variantKey).collection('entries').add(payload);
      } catch (err) {
        warnFirestoreWrite('goal entry', entryPath, payload, err);
        return { ok:false, error:api.lastError };
      }
      const bestResult = await updateGoalBestIfBetter(metricKey, params, ref.id, bestCandidate);
      return { ok:true, id:ref.id, best:bestResult };
    } catch (err) {
      warnFirestoreWrite('goal submit', 'goalRecords/' + String(metricKey), {params, record}, err);
      return { ok:false, error:api.lastError };
    }
  }

  async function submitCampaignRecord(levelKey, result){
    try {
      const entryPath = 'campaignRecords/' + String(levelKey) + '/entries/{autoId}';
      if(!levelKey || !result) return { skipped:true, reason:'missing-campaign-record-data' };
      if(!await ensureReady()){
        warnFirestoreWrite('campaign entry', entryPath, {result, debugStatus:debugStatus()}, {code:'firebase-disabled', message:'Firebase provider is not ready'});
        return { skipped:true, reason:'firebase-disabled' };
      }
      const record = cleanRecord(result);
      const bestCandidate = {
        ...profilePayload(result),
        levelKey:String(levelKey),
        time:Number(result.time || 0),
        metrics:cleanRecord(result.metrics || {}),
        record,
        clientCreatedAt:new Date().toISOString()
      };
      const payload = {...bestCandidate, createdAt:firebase.firestore.FieldValue.serverTimestamp()};
      let ref;
      try {
        ref = await api.db.collection('campaignRecords').doc(String(levelKey)).collection('entries').add(payload);
      } catch (err) {
        warnFirestoreWrite('campaign entry', entryPath, payload, err);
        return { ok:false, error:api.lastError };
      }
      const bestResult = await updateCampaignBestIfBetter(levelKey, ref.id, bestCandidate);
      return { ok:true, id:ref.id, best:bestResult };
    } catch (err) {
      warnFirestoreWrite('campaign submit', 'campaignRecords/' + String(levelKey), {result}, err);
      return { ok:false, error:api.lastError };
    }
  }
  async function updateGoalBestIfBetter(metricKey, params, entryId, record){
    try {
      if(!metricKey || !entryId || !record || !await ensureReady()) return { skipped:true, reason:'firebase-disabled' };
      const variantKey = metricParamKey(params);
      const parentRef = api.db.collection('goalRecords').doc(String(metricKey)).collection('variants').doc(variantKey);
      const candidate = cleanRecord(record);
      let updated = false;
      await api.db.runTransaction(async transaction => {
        const snap = await transaction.get(parentRef);
        const currentBest = snap && snap.exists ? recordFromDoc(snap.data()) : null;
        if(!isBetterGoalRecord(metricKey, currentBest, candidate)) return;
        transaction.set(parentRef, {
          best:candidate,
          bestEntryId:String(entryId),
          updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
          metricKey:String(metricKey),
          variantKey,
          params:cleanRecord(params || {})
        }, {merge:true});
        updated = true;
      });
      return { ok:true, updated };
    } catch (err) {
      const variantKey = metricParamKey(params);
      warnFirestoreWrite('goal best', 'goalRecords/' + String(metricKey) + '/variants/' + variantKey, {entryId, record:cleanRecord(record)}, err);
      return { ok:false, error:api.lastError };
    }
  }

  async function updateCampaignBestIfBetter(levelKey, entryId, result){
    try {
      if(!levelKey || !entryId || !result || !await ensureReady()) return { skipped:true, reason:'firebase-disabled' };
      const parentRef = api.db.collection('campaignRecords').doc(String(levelKey));
      const candidate = cleanRecord(result);
      let updated = false;
      await api.db.runTransaction(async transaction => {
        const snap = await transaction.get(parentRef);
        const currentBest = snap && snap.exists ? recordFromDoc(snap.data()) : null;
        if(!isBetterCampaignRecord(currentBest, candidate)) return;
        transaction.set(parentRef, {
          best:candidate,
          bestEntryId:String(entryId),
          updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
          levelKey:String(levelKey)
        }, {merge:true});
        updated = true;
      });
      return { ok:true, updated };
    } catch (err) {
      warnFirestoreWrite('campaign best', 'campaignRecords/' + String(levelKey), {entryId, result:cleanRecord(result)}, err);
      return { ok:false, error:api.lastError };
    }
  }
  function getWorldRecord(scope, key, params){
    if(scope === 'campaign') return getCampaignWorldRecord(key);
    if(scope === 'goal') return getGoalWorldRecord(key, params);
    return Promise.resolve(null);
  }

  function getGlobalRanking(scope, key, params){
    if(scope === 'campaign') return getCampaignGlobalRanking(key);
    if(scope === 'goal') return getGoalGlobalRanking(key, params);
    return Promise.resolve([]);
  }

  async function init(){
    try {
      if(!hasConfig(firebaseConfig)) return false;
      if(!window.firebase || !firebase.initializeApp || !firebase.auth) return false;

      api.app = firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
      api.auth = firebase.auth();
      const credential = await api.auth.signInAnonymously();
      api.uid = credential && credential.user ? credential.user.uid : (api.auth.currentUser && api.auth.currentUser.uid) || null;
      api.enabled = !!api.uid;

      if(api.enabled && firebase.firestore){
        api.db = firebase.firestore();
        api.firestoreReady = !!api.db;
      }
      return api.enabled;
    } catch (err) {
      api.enabled = false;
      api.uid = null;
      api.db = null;
      api.firestoreReady = false;
      setError(err);
      return false;
    }
  }

  api.ready = init().then(value => { readyResolved = true; return value; }).catch(err => { readyResolved = true; setError(err); return false; });
  return api;
})();








