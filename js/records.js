const FIREBASE_OFFICIAL_GOAL_DURATIONS = [120, 180, 300];
const FASTEST_GOAL_TARGETS = [3, 5];

function isOfficialGoalRecordDuration(duration){
  return FIREBASE_OFFICIAL_GOAL_DURATIONS.includes(+duration);
}

function firebaseProfileNick(){
  const profile = DATA_PROVIDER.getPlayerProfile ? DATA_PROVIDER.getPlayerProfile() : null;
  return ((profile && profile.nick) || 'Jugador').trim() || 'Jugador';
}

function fastestGoalRecord(targetGoals, nick){
  const time = state.fastestGoalTimes && state.fastestGoalTimes[String(targetGoals)];
  if(!Number.isFinite(+time) || +time <= 0) return null;
  return {
    nick:nick || firebaseProfileNick(),
    date:new Date().toLocaleDateString(),
    goals:+targetGoals,
    time:+time,
    seconds:+time,
    duration:+cfg.duration
  };
}

function captureFastestGoalMilestone(goals, elapsed){
  const target = FASTEST_GOAL_TARGETS.find(n => +goals === n);
  if(!target) return;
  state.fastestGoalTimes = state.fastestGoalTimes || {};
  if(state.fastestGoalTimes[String(target)]) return;
  const time = Math.max(0, +elapsed || 0);
  if(time <= 0) return;
  state.fastestGoalTimes[String(target)] = time;
  try { console.info('[Trianota fastest goal captured]', {goals:target, time}); } catch {}
}

function saveFastestGoalPersonalBests(nick){
  FASTEST_GOAL_TARGETS.forEach(target => {
    const record = fastestGoalRecord(target, nick);
    if(!record) return;
    const params = {goals:target};
    const current = DATA_PROVIDER.getGoalPersonalBest ? DATA_PROVIDER.getGoalPersonalBest('fastestNGoles', params) : null;
    const currentTime = current ? +(current.time || current.seconds || current.duration || 0) : 0;
    if(!currentTime || record.time < currentTime){
      DATA_PROVIDER.saveGoalPersonalBest('fastestNGoles', params, record);
      try { console.info('[Trianota fastest personal saved]', {params, record}); } catch {}
    }
  });
}

function submitFirebaseFastestGoalCandidates(provider, nick){
  FASTEST_GOAL_TARGETS.forEach(target => {
    const record = fastestGoalRecord(target, nick);
    if(!record) return;
    provider.submitGoalRecord('fastestNGoles', {goals:target}, record).then(result => {
      if(result && result.ok === false) console.warn('[Trianota Firestore submit result]', result);
      else try { console.info('[Trianota Firestore submit result]', {type:'fastestNGoles', goals:target, result}); } catch {}
    });
  });
}

function submitFirebaseGoalCandidates(record){
  try {
    if(!record) return;
    const provider = window.FIREBASE_PROVIDER;
    if(!provider || typeof provider.submitGoalRecord !== 'function'){
      console.warn('[Trianota Firestore submit setup failed]', {type:'goal', reason:'provider-missing'});
      return;
    }
    const candidate = {...record, nick:record.nick || firebaseProfileNick()};
    if(isOfficialGoalRecordDuration(record.duration)){
      provider.submitGoalRecord('mostGoalsFixedDuration', {duration:+record.duration}, candidate).then(result => { if(result && result.ok === false) console.warn('[Trianota Firestore submit result]', result); });
      provider.submitGoalRecord('maxSurfaceUsage', {duration:+record.duration}, candidate).then(result => { if(result && result.ok === false) console.warn('[Trianota Firestore submit result]', result); });
    }
    submitFirebaseFastestGoalCandidates(provider, candidate.nick);
  } catch (err) {
    console.warn('[Trianota Firestore submit setup failed]', {type:'goal', code:err && err.code, message:err && err.message, error:err});
  }
}

function submitFirebaseCampaignCandidate(levelKey, result){
  try {
    const provider = window.FIREBASE_PROVIDER;
    if(!provider || typeof provider.submitCampaignRecord !== 'function'){
      console.warn('[Trianota Firestore submit setup failed]', {type:'campaign', reason:'provider-missing', levelKey});
      return;
    }
    provider.submitCampaignRecord(levelKey, {...result, nick:firebaseProfileNick()}).then(submitResult => {
      const best = submitResult && submitResult.best;
      const entryOk = !!(submitResult && submitResult.ok);
      const bestUpdated = !!(best && best.updated);
      const bestSkipped = !!(best && (best.status === 'skipped' || best.skipped));
      const errorCode = submitResult && (submitResult.error || (best && best.error));
      if(bestUpdated && best.best && DATA_PROVIDER && typeof DATA_PROVIDER.saveCampaignWorldRecord === 'function'){
        DATA_PROVIDER.saveCampaignWorldRecord(levelKey, best.best);
      }
      try { console.info('[Trianota Campaign Record]', {levelKey, time:result && result.time, entryOk, bestUpdated, bestSkipped, errorCode}); } catch {}
      if(submitResult && submitResult.ok === false) console.warn('[Trianota Firestore submit result]', submitResult);
    });
  } catch (err) {
    console.warn('[Trianota Firestore submit setup failed]', {type:'campaign', code:err && err.code, message:err && err.message, error:err});
  }
}
function loadRecords(){return DATA_PROVIDER.getGoalLocalRecords();}

function loadMetaBest(){return DATA_PROVIDER.getCampaignPersonalBestTimes();}

function saveMetaBest(levelKey, result){
  const cur = state.metaBest[levelKey];
  if(!cur || result.time < cur.time){
    state.metaBest[levelKey] = result;
    DATA_PROVIDER.saveCampaignPersonalBestTime(levelKey, result);
  }
  const sessionCur = DATA_PROVIDER.getCampaignSessionBest(levelKey);
  if(!sessionCur || result.time < sessionCur.time){
    DATA_PROVIDER.saveCampaignSessionBest(levelKey, result);
  }
  submitFirebaseCampaignCandidate(levelKey, result);
}

function saveRecord(nick){
  const profile = DATA_PROVIDER.getPlayerProfile ? DATA_PROVIDER.getPlayerProfile() : null;
  const safeNick = (nick || (profile && profile.nick) || 'Jugador').trim() || 'Jugador';
  const goals = state.history.filter(h=>h.type==='goal');
  const byArea = goals.slice().sort((a,b)=>b.metrics.area-a.metrics.area);
  const bestArea = byArea[0];
  const bestUtil = bestArea ? +utilization(bestArea.metrics.area) : 0;
  const byComplexity = goals.slice().sort((a,b)=>b.metrics.complexity-a.metrics.complexity);
  const bestComplex = byComplexity[0];
  const rec={nick:safeNick,date:new Date().toLocaleDateString(),goals:state.goals,bestUtil,bestComplex:bestComplex?+bestComplex.metrics.complexity.toFixed(2):0,duration:cfg.duration};
  state.records.push(rec); state.records.sort((a,b)=>b.goals-a.goals || b.bestUtil-a.bestUtil || b.bestComplex-a.bestComplex); state.records=state.records.slice(0,20);
  DATA_PROVIDER.saveGoalLocalRecords(state.records);
  saveFastestGoalPersonalBests(safeNick);
  submitFirebaseGoalCandidates(rec);
}




