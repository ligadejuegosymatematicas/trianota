const FIREBASE_OFFICIAL_GOAL_DURATIONS = [120, 180, 300];

function isOfficialGoalRecordDuration(duration){
  return FIREBASE_OFFICIAL_GOAL_DURATIONS.includes(+duration);
}

function firebaseProfileNick(){
  const profile = DATA_PROVIDER.getPlayerProfile ? DATA_PROVIDER.getPlayerProfile() : null;
  return ((profile && profile.nick) || 'Jugador').trim() || 'Jugador';
}

function submitFirebaseGoalCandidates(record){
  try {
    if(!record || !isOfficialGoalRecordDuration(record.duration)) return;
    const provider = window.FIREBASE_PROVIDER;
    if(!provider || typeof provider.submitGoalRecord !== 'function'){
      console.warn('[Trianota Firestore submit setup failed]', {type:'goal', reason:'provider-missing'});
      return;
    }
    const candidate = {...record, nick:record.nick || firebaseProfileNick()};
    provider.submitGoalRecord('mostGoalsFixedDuration', {duration:+record.duration}, candidate).then(result => { if(result && result.ok === false) console.warn('[Trianota Firestore submit result]', result); });
    provider.submitGoalRecord('maxSurfaceUsage', {duration:+record.duration}, candidate).then(result => { if(result && result.ok === false) console.warn('[Trianota Firestore submit result]', result); });
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
    provider.submitCampaignRecord(levelKey, {...result, nick:firebaseProfileNick()}).then(result => { if(result && result.ok === false) console.warn('[Trianota Firestore submit result]', result); });
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
  submitFirebaseGoalCandidates(rec);
}



