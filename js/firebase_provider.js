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
    getPlayerStats,
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

  const PENDING_WRITES_KEY = 'trianota_firestore_pending_writes_v1';
  const RETRYABLE_FIRESTORE_CODES = [
    'aborted',
    'cancelled',
    'deadline-exceeded',
    'internal',
    'resource-exhausted',
    'unavailable',
    'unknown',
    'network-request-failed'
  ];
  const PERMANENT_FIRESTORE_CODES = [
    'already-exists',
    'failed-precondition',
    'invalid-argument',
    'not-found',
    'permission-denied',
    'unauthenticated'
  ];
  let pendingRetryTimer = null;
  let pendingQueueProcessing = false;

  function firestoreCode(err){
    if(!err) return '';
    const raw = typeof err === 'string' ? err : (err.code || err.message || String(err));
    return String(raw || '').replace(/^firestore\//, '').replace(/^FirebaseError:\s*/i, '');
  }

  function isRetryableFirestoreError(err){
    const code = firestoreCode(err);
    return RETRYABLE_FIRESTORE_CODES.includes(code);
  }

  function isPermanentFirestoreError(err){
    const code = firestoreCode(err);
    return PERMANENT_FIRESTORE_CODES.includes(code);
  }

  function readPendingWrites(){
    try {
      const raw = localStorage.getItem(PENDING_WRITES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writePendingWrites(queue){
    try {
      localStorage.setItem(PENDING_WRITES_KEY, JSON.stringify(queue.slice(0, 80)));
      return true;
    } catch (err) {
      try { console.warn('[Trianota Firestore queue failed]', {code:err && err.code, message:err && err.message}); } catch {}
      return false;
    }
  }

  function queueBackoffMs(attempts){
    return Math.min(5 * 60 * 1000, 15000 * Math.pow(2, Math.min(5, attempts || 0)));
  }

  function enqueuePendingWrite(item, err){
    try {
      if(!isRetryableFirestoreError(err)) return false;
      const queue = readPendingWrites();
      const index = queue.findIndex(existing => existing && existing.id === item.id);
      const previous = index >= 0 ? queue[index] : null;
      const attempts = previous ? Number(previous.attempts || 0) : 0;
      const queued = {
        ...previous,
        ...item,
        attempts,
        lastError:firestoreCode(err),
        queuedAt:previous && previous.queuedAt ? previous.queuedAt : new Date().toISOString(),
        nextAttemptAt:Date.now() + queueBackoffMs(attempts)
      };
      if(index >= 0) queue[index] = queued;
      else queue.push(queued);
      const ok = writePendingWrites(queue);
      if(ok) schedulePendingQueueRetry(queueBackoffMs(attempts) + 500);
      try { console.warn('[Trianota Firestore queued]', {id:queued.id, kind:queued.kind, error:queued.lastError}); } catch {}
      return ok;
    } catch {
      return false;
    }
  }

  function retryableResult(result){
    return result && result.ok === false && isRetryableFirestoreError(result.error);
  }

  function schedulePendingQueueRetry(delayMs=0){
    if(pendingRetryTimer) return;
    pendingRetryTimer = setTimeout(() => {
      pendingRetryTimer = null;
      processPendingWrites();
    }, Math.max(0, delayMs || 0));
  }

  function updateQueuedFailure(item, err){
    const attempts = Number(item.attempts || 0) + 1;
    return {
      ...item,
      attempts,
      lastError:firestoreCode(err),
      nextAttemptAt:Date.now() + queueBackoffMs(attempts)
    };
  }

  async function processPendingWrites(){
    if(pendingQueueProcessing) return;
    pendingQueueProcessing = true;
    try {
      if(!await ensureReady()) return;
      const queue = readPendingWrites();
      if(!queue.length) return;
      const now = Date.now();
      const next = [];
      let processed = 0;
      for(const item of queue){
        if(!item || !item.id) continue;
        if(processed >= 8 || Number(item.nextAttemptAt || 0) > now){
          next.push(item);
          continue;
        }
        processed++;
        const result = await retryPendingWrite(item);
        if(result && result.done){
          try { console.info('[Trianota Firestore queue sent]', {id:item.id, kind:item.kind}); } catch {}
          continue;
        }
        next.push(updateQueuedFailure((result && result.item) || item, (result && result.error) || 'unknown'));
      }
      writePendingWrites(next);
      if(next.some(item => Number(item.nextAttemptAt || 0) <= Date.now())) {
        schedulePendingQueueRetry(30000);
      } else {
        const nextAttempt = next.reduce((soonest, item) => {
          const at = Number(item && item.nextAttemptAt || 0);
          return at > 0 ? Math.min(soonest, at) : soonest;
        }, Infinity);
        if(Number.isFinite(nextAttempt)) schedulePendingQueueRetry(Math.max(1000, nextAttempt - Date.now()));
      }
    } catch (err) {
      try { console.warn('[Trianota Firestore queue failed]', {code:err && err.code, message:err && err.message}); } catch {}
    } finally {
      pendingQueueProcessing = false;
    }
  }

  async function retryPendingWrite(item){
    if(item.kind === 'goal') return retryQueuedGoal(item);
    if(item.kind === 'campaign') return retryQueuedCampaign(item);
    return {done:true};
  }

  function initPendingQueueRetries(){
    try {
      if(typeof window !== 'undefined' && window.addEventListener){
        window.addEventListener('online', () => schedulePendingQueueRetry(1000));
      }
      schedulePendingQueueRetry(2500);
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
    const best = plain.best || plain.record || plain.worldRecord || null;
    if(best && typeof best === 'object' && !Array.isArray(best)){
      return {
        ...best,
        bestEntryId: plain.bestEntryId || best.bestEntryId,
        holderUid: plain.holderUid || best.holderUid || best.uid || '',
        holderNick: plain.holderNick || best.holderNick || best.nick || '',
        summary: plain.summary || best.summary || '',
        valueLabel: plain.valueLabel || best.valueLabel || '',
        updatedAtText: plain.updatedAtText || best.updatedAtText || '',
        metricKey: plain.metricKey || best.metricKey,
        variantKey: plain.variantKey || best.variantKey,
        levelKey: plain.levelKey || best.levelKey,
        params: plain.params || best.params
      };
    }
    return plain;
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
    const path = 'campaignRecords/' + String(levelKey);
    const record = await readDoc(api.db.collection('campaignRecords').doc(String(levelKey)));
    try { console.info('[Trianota Firestore world record read]', {type:'campaign world', path, levelKey:String(levelKey), record}); } catch {}
    return record;
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

  async function getPlayerStats(uid){
    try {
      if(!await ensureReady()) return null;
      const targetUid = uid || api.uid;
      if(!targetUid) return null;
      return readDoc(api.db.collection('playerStats').doc(String(targetUid)));
    } catch (err) {
      setError(err);
      try { console.warn('[Trianota Firestore playerStats read failed]', {code:err && err.code, message:err && err.message}); } catch {}
      return null;
    }
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

  function nowText(){
    try { return new Date().toLocaleString('es-CL'); }
    catch { return new Date().toISOString(); }
  }

  function fixed(value, digits){
    const n = numeric(value);
    return n.toFixed(digits);
  }

  function timeLabel(seconds){
    const total = Math.max(0, numeric(seconds));
    const minutes = Math.floor(total / 60);
    const secs = Math.floor(total % 60);
    const hundredths = Math.floor((total - Math.floor(total)) * 100);
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
  }

  function durationLabel(seconds){
    const value = numeric(seconds);
    if(value <= 0) return '';
    const minutes = value / 60;
    if(Number.isInteger(minutes)) return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    return `${value} segundos`;
  }

  function levelLabel(levelKey){
    const parts = String(levelKey || '').split('-');
    if(parts.length >= 2 && parts[0] && parts[1]) return `M${parts[0]}-N${parts[1]}`;
    return String(levelKey || 'Nivel');
  }

  function goalMetricLabel(metricKey){
    if(metricKey === 'fastestNGoles') return 'Rapidez';
    if(metricKey === 'maxSurfaceUsage') return 'Superficie';
    return 'Goles';
  }

  function goalValueLabel(metricKey, record){
    if(metricKey === 'fastestNGoles') return timeLabel(record && record.time);
    if(metricKey === 'maxSurfaceUsage') return `${fixed(record && record.bestUtil, 1)}%`;
    const goals = numeric(record && record.goals);
    return `${goals} ${goals === 1 ? 'gol' : 'goles'}`;
  }

  function goalSummary(metricKey, params, record){
    const nick = (record && record.nick) || 'Jugador';
    const metric = goalMetricLabel(metricKey);
    const value = goalValueLabel(metricKey, record);
    if(metricKey === 'fastestNGoles'){
      const goals = numeric(params && params.goals);
      return `${nick} - ${metric} ${goals} goles: ${value}`;
    }
    const duration = durationLabel((params && params.duration) || (record && record.duration));
    return `${nick} - ${metric}: ${value}${duration ? ` en ${duration}` : ''}`;
  }

  function goalAdminFields(metricKey, params, record){
    const duration = metricKey === 'fastestNGoles' ? '' : durationLabel((params && params.duration) || (record && record.duration));
    const fields = {
      mode:'goal',
      summary:goalSummary(metricKey, params, record),
      metricLabel:goalMetricLabel(metricKey),
      valueLabel:goalValueLabel(metricKey, record),
      createdAtText:nowText()
    };
    if(duration) fields.durationLabel = duration;
    return fields;
  }

  function campaignValueLabel(record){
    return timeLabel(record && record.time);
  }

  function campaignAdminFields(levelKey, record){
    const label = levelLabel(levelKey);
    const nick = (record && record.nick) || 'Jugador';
    const value = campaignValueLabel(record);
    return {
      mode:'campaign',
      summary:`${nick} - ${label}: ${value}`,
      metricLabel:'Menor tiempo',
      valueLabel:value,
      levelLabel:label,
      createdAtText:nowText()
    };
  }

  function bestAdminFields(candidate, entryAdminFields){
    return {
      holderUid:candidate && candidate.uid ? String(candidate.uid) : api.uid,
      holderNick:candidate && candidate.nick ? String(candidate.nick) : 'Jugador',
      summary:entryAdminFields && entryAdminFields.summary ? entryAdminFields.summary : '',
      valueLabel:entryAdminFields && entryAdminFields.valueLabel ? entryAdminFields.valueLabel : '',
      updatedAtText:nowText()
    };
  }

  function playerStatsBase(candidate){
    const uid = candidate && candidate.uid ? String(candidate.uid) : api.uid;
    const nick = candidate && candidate.nick ? String(candidate.nick).trim().slice(0, 16) : 'Jugador';
    const base = {
      uid,
      nick,
      updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
      updatedAtText:nowText()
    };
    if(nick) base.usualNicks = firebase.firestore.FieldValue.arrayUnion(nick);
    return base;
  }

  function goalStatsSummary(metricKey, params, entryId, candidate){
    return {
      metricKey:String(metricKey),
      variantKey:metricParamKey(params),
      params:cleanRecord(params || {}),
      entryId:String(entryId),
      summary:candidate.summary || goalSummary(metricKey, params || {}, candidate),
      metricLabel:candidate.metricLabel || goalMetricLabel(metricKey),
      valueLabel:candidate.valueLabel || goalValueLabel(metricKey, candidate),
      durationLabel:candidate.durationLabel || durationLabel(candidate.duration),
      goals:Number(candidate.goals || 0),
      bestUtil:Number(candidate.bestUtil || 0),
      time:Number(candidate.time || 0),
      duration:Number(candidate.duration || 0),
      updatedAtText:nowText()
    };
  }

  function campaignStatsSummary(levelKey, entryId, candidate){
    return {
      levelKey:String(levelKey),
      entryId:String(entryId),
      summary:candidate.summary || campaignAdminFields(levelKey, candidate).summary,
      metricLabel:candidate.metricLabel || 'Menor tiempo',
      valueLabel:candidate.valueLabel || campaignValueLabel(candidate),
      levelLabel:candidate.levelLabel || levelLabel(levelKey),
      time:Number(candidate.time || 0),
      updatedAtText:nowText()
    };
  }

  async function updatePlayerStats(payload, candidate){
    try {
      const uid = candidate && candidate.uid ? String(candidate.uid) : api.uid;
      if(!uid || !await ensureReady()) return { skipped:true, reason:'firebase-disabled' };
      const path = 'playerStats/' + uid;
      const fullPayload = {...playerStatsBase(candidate), ...payload};
      await api.db.collection('playerStats').doc(uid).set(fullPayload, {merge:true});
      try { console.info('[Trianota Firestore playerStats ok]', {path, payload:fullPayload}); } catch {}
      return { ok:true };
    } catch (err) {
      warnFirestoreWrite('player stats', candidate && candidate.uid ? 'playerStats/' + String(candidate.uid) : 'playerStats/{uid}', payload, err);
      return { ok:false, error:api.lastError };
    }
  }

  async function updateGoalPlayerStats(metricKey, params, entryId, candidate, bestResult){
    const variantKey = metricParamKey(params);
    const summary = goalStatsSummary(metricKey, params || {}, entryId, candidate);
    const payload = {
      goalSummary:{ [String(metricKey)]: { [variantKey]: summary } }
    };
    if(bestResult && bestResult.updated){
      payload.worldRecordsOwned = { goal:{ [String(metricKey)]: { [variantKey]: summary } } };
    }
    return updatePlayerStats(payload, candidate);
  }

  async function updateCampaignPlayerStats(levelKey, entryId, candidate, bestResult){
    const summary = campaignStatsSummary(levelKey, entryId, candidate);
    const key = String(levelKey);
    const payload = {
      campaignSummary:{ levels:{ [key]: summary } }
    };
    if(bestResult && bestResult.updated){
      payload.worldRecordsOwned = { campaign:{ [key]: summary } };
    }
    return updatePlayerStats(payload, candidate);
  }

  function goalEntryRef(metricKey, variantKey, entryId){
    return api.db.collection('goalRecords').doc(String(metricKey)).collection('variants').doc(variantKey).collection('entries').doc(String(entryId));
  }

  function campaignEntryRef(levelKey, entryId){
    return api.db.collection('campaignRecords').doc(String(levelKey)).collection('entries').doc(String(entryId));
  }

  function goalQueueItem(metricKey, params, variantKey, entryId, candidate, entryWritten){
    return {
      id:`goal:${String(metricKey)}:${variantKey}:${String(entryId)}`,
      kind:'goal',
      metricKey:String(metricKey),
      params:cleanRecord(params || {}),
      variantKey,
      entryId:String(entryId),
      candidate:cleanRecord(candidate),
      entryWritten:!!entryWritten
    };
  }

  function campaignQueueItem(levelKey, entryId, candidate, entryWritten){
    return {
      id:`campaign:${String(levelKey)}:${String(entryId)}`,
      kind:'campaign',
      levelKey:String(levelKey),
      entryId:String(entryId),
      candidate:cleanRecord(candidate),
      entryWritten:!!entryWritten
    };
  }

  async function writeGoalEntry(metricKey, variantKey, entryId, candidate){
    const payload = {...candidate, createdAt:firebase.firestore.FieldValue.serverTimestamp()};
    await goalEntryRef(metricKey, variantKey, entryId).set(payload);
    return payload;
  }

  async function writeCampaignEntry(levelKey, entryId, candidate){
    const payload = {...candidate, createdAt:firebase.firestore.FieldValue.serverTimestamp()};
    await campaignEntryRef(levelKey, entryId).set(payload);
    return payload;
  }

  async function retryQueuedGoal(item){
    const metricKey = item.metricKey;
    const params = item.params || {};
    const variantKey = item.variantKey || metricParamKey(params);
    const entryId = item.entryId;
    const candidate = item.candidate;
    if(!metricKey || !variantKey || !entryId || !candidate) return {done:true};
    if(!item.entryWritten){
      try {
        await writeGoalEntry(metricKey, variantKey, entryId, candidate);
        item.entryWritten = true;
      } catch (err) {
        return isPermanentFirestoreError(err) ? {done:true} : {done:false, item, error:err};
      }
    }
    const bestResult = await updateGoalBestIfBetter(metricKey, params, entryId, candidate);
    const playerStatsResult = await updateGoalPlayerStats(metricKey, params, entryId, candidate, bestResult);
    if(retryableResult(bestResult)) return {done:false, item, error:bestResult.error};
    if(retryableResult(playerStatsResult)) return {done:false, item, error:playerStatsResult.error};
    return {done:true};
  }

  async function retryQueuedCampaign(item){
    const levelKey = item.levelKey;
    const entryId = item.entryId;
    const candidate = item.candidate;
    if(!levelKey || !entryId || !candidate) return {done:true};
    if(!item.entryWritten){
      try {
        await writeCampaignEntry(levelKey, entryId, candidate);
        item.entryWritten = true;
      } catch (err) {
        return isPermanentFirestoreError(err) ? {done:true} : {done:false, item, error:err};
      }
    }
    const bestResult = await updateCampaignBestIfBetter(levelKey, entryId, candidate);
    const playerStatsResult = await updateCampaignPlayerStats(levelKey, entryId, candidate, bestResult);
    if(retryableResult(bestResult)) return {done:false, item, error:bestResult.error};
    if(retryableResult(playerStatsResult)) return {done:false, item, error:playerStatsResult.error};
    return {done:true};
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
      const profile = profilePayload(record);
      const bestCandidate = {
        ...profile,
        ...goalAdminFields(String(metricKey), params || {}, {...record, ...profile}),
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
      const ref = api.db.collection('goalRecords').doc(String(metricKey)).collection('variants').doc(variantKey).collection('entries').doc();
      try {
        await writeGoalEntry(metricKey, variantKey, ref.id, bestCandidate);
      } catch (err) {
        warnFirestoreWrite('goal entry', entryPath.replace('{autoId}', ref.id), {...bestCandidate, createdAt:'serverTimestamp()'}, err);
        enqueuePendingWrite(goalQueueItem(metricKey, params, variantKey, ref.id, bestCandidate, false), err);
        return { ok:false, error:api.lastError };
      }
      const bestResult = await updateGoalBestIfBetter(metricKey, params, ref.id, bestCandidate);
      const playerStatsResult = await updateGoalPlayerStats(metricKey, params, ref.id, bestCandidate, bestResult);
      if(retryableResult(bestResult) || retryableResult(playerStatsResult)){
        enqueuePendingWrite(goalQueueItem(metricKey, params, variantKey, ref.id, bestCandidate, true), bestResult && bestResult.ok === false ? bestResult.error : playerStatsResult.error);
      }
      return { ok:true, id:ref.id, best:bestResult, playerStats:playerStatsResult };
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
      const profile = profilePayload(result);
      const bestCandidate = {
        ...profile,
        ...campaignAdminFields(levelKey, {...result, ...profile}),
        levelKey:String(levelKey),
        time:Number(result.time || 0),
        metrics:cleanRecord(result.metrics || {}),
        record,
        clientCreatedAt:new Date().toISOString()
      };
      const ref = api.db.collection('campaignRecords').doc(String(levelKey)).collection('entries').doc();
      try {
        await writeCampaignEntry(levelKey, ref.id, bestCandidate);
        try { console.info('[Trianota Firestore write ok]', {type:'campaign entry', path:entryPath.replace('{autoId}', ref.id), payload:{...bestCandidate, createdAt:'serverTimestamp()'}}); } catch {}
      } catch (err) {
        warnFirestoreWrite('campaign entry', entryPath.replace('{autoId}', ref.id), {...bestCandidate, createdAt:'serverTimestamp()'}, err);
        enqueuePendingWrite(campaignQueueItem(levelKey, ref.id, bestCandidate, false), err);
        return { ok:false, error:api.lastError };
      }
      const bestResult = await updateCampaignBestIfBetter(levelKey, ref.id, bestCandidate);
      const playerStatsResult = await updateCampaignPlayerStats(levelKey, ref.id, bestCandidate, bestResult);
      if(retryableResult(bestResult) || retryableResult(playerStatsResult)){
        enqueuePendingWrite(campaignQueueItem(levelKey, ref.id, bestCandidate, true), bestResult && bestResult.ok === false ? bestResult.error : playerStatsResult.error);
      }
      try { console.info('[Trianota Firestore write ok]', {type:'campaign best', path:'campaignRecords/' + String(levelKey), result:bestResult, playerStats:playerStatsResult}); } catch {}
      return { ok:true, id:ref.id, best:bestResult, playerStats:playerStatsResult };
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
      let status = 'skipped';
      await api.db.runTransaction(async transaction => {
        const snap = await transaction.get(parentRef);
        const currentBest = snap && snap.exists ? recordFromDoc(snap.data()) : null;
        if(!isBetterGoalRecord(metricKey, currentBest, candidate)){
          try { console.warn('[Trianota Firestore best skipped]', {type:'goal best comparison', path:'goalRecords/' + String(metricKey) + '/variants/' + variantKey, currentBest, candidate}); } catch {}
          return;
        }
        transaction.set(parentRef, {
          best:candidate,
          bestEntryId:String(entryId),
          ...bestAdminFields(candidate, goalAdminFields(String(metricKey), params || {}, candidate)),
          updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
          metricKey:String(metricKey),
          variantKey,
          params:cleanRecord(params || {})
        }, {merge:true});
        updated = true;
        status = 'updated';
      });
      try { console.info('[Trianota Firestore best update]', {type:'goal best', metricKey:String(metricKey), variantKey, entryId:String(entryId), status, updated}); } catch {}
      return { ok:true, updated, status };
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
      let status = 'skipped';
      await api.db.runTransaction(async transaction => {
        const snap = await transaction.get(parentRef);
        const currentBest = snap && snap.exists ? recordFromDoc(snap.data()) : null;
        if(!isBetterCampaignRecord(currentBest, candidate)){
          try { console.warn('[Trianota Firestore best skipped]', {type:'campaign best comparison', path:'campaignRecords/' + String(levelKey), currentBest, candidate}); } catch {}
          return;
        }
        transaction.set(parentRef, {
          best:candidate,
          bestEntryId:String(entryId),
          ...bestAdminFields(candidate, campaignAdminFields(levelKey, candidate)),
          updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
          levelKey:String(levelKey)
        }, {merge:true});
        updated = true;
        status = 'updated';
      });
      try { console.info('[Trianota Firestore best update]', {type:'campaign best', levelKey:String(levelKey), entryId:String(entryId), status, updated}); } catch {}
      return { ok:true, updated, status, best:updated ? candidate : null };
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

  api.ready = init().then(value => { readyResolved = true; schedulePendingQueueRetry(2500); return value; }).catch(err => { readyResolved = true; setError(err); return false; });
  initPendingQueueRetries();
  return api;
})();









