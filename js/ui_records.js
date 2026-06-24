let goalPersonalBeforeSave = null;

function goalRecordsForCurrentDuration(){
  return (state.records || []).filter(r => !r.duration || +r.duration === +cfg.duration);
}

function bestGoalRecord(records){
  return records.slice().sort((a,b)=>(b.goals||0)-(a.goals||0) || (b.bestUtil||0)-(a.bestUtil||0) || (b.bestComplex||0)-(a.bestComplex||0))[0] || null;
}

function bestSurfaceRecord(records){
  return records.slice().sort((a,b)=>(b.bestUtil||0)-(a.bestUtil||0) || (b.goals||0)-(a.goals||0))[0] || null;
}

function goalPersonalSnapshot(records=goalRecordsForCurrentDuration()){
  const bestGoals = bestGoalRecord(records);
  const bestSurface = bestSurfaceRecord(records);
  return {
    goals: bestGoals ? +(bestGoals.goals || 0) : 0,
    surface: bestSurface ? +(bestSurface.bestUtil || 0) : 0,
    bestGoals,
    bestSurface
  };
}

function goalAttempts(){
  return state.history.filter(h=>h.type==='goal');
}

function currentBestSurface(){
  const bestArea = goalAttempts().slice().sort((a,b)=>b.metrics.area-a.metrics.area)[0];
  return bestArea ? +utilization(bestArea.metrics.area) : 0;
}

function recordDash(value){
  return value === undefined || value === null || value === '' ? '—' : value;
}

function recordMeta(record){
  if(!record) return '';
  const bits = [];
  if(record.nick) bits.push(escapeHtml(record.nick));
  if(record.date) bits.push(escapeHtml(record.date));
  if(record.duration) bits.push(`${Math.round(record.duration/60)} min`);
  return bits.length ? `<div class="tiny">${bits.join(' · ')}</div>` : '';
}

function renderRecordValue(value, meta='', isNew=false){
  return `<div class="recordValue${isNew ? ' newBest' : ''}"><b>${value}</b>${isNew ? '<span class="recordBadge">Nuevo personal</span>' : ''}${meta}</div>`;
}

function renderGoalRecordSection(title, personalHtml, worldHtml){
  return `
    <section class="recordSection">
      <h3>${title}</h3>
      <div class="recordRows">
        <div class="recordRow"><span>Personal</span>${personalHtml}</div>
        <div class="recordRow"><span>Mundial</span>${worldHtml}</div>
      </div>
    </section>
  `;
}

function worldGoalHtml(metricKey, params, formatter){
  const record = DATA_PROVIDER.getGoalWorldRecord(metricKey, params);
  return record ? renderRecordValue(formatter(record), recordMeta(record)) : renderRecordValue('—');
}

function personalFastestHtml(targetGoals=3){
  const record = DATA_PROVIDER.getGoalPersonalBest('fastestNGoles', {goals:targetGoals});
  if(!record) return renderRecordValue('—');
  const seconds = record.time || record.seconds || record.duration;
  return renderRecordValue(seconds ? formatMetaTime(seconds) : '—', recordMeta(record));
}

const OFFICIAL_GOAL_DURATIONS = [
  {duration:120, label:'Duración: 2 minutos'},
  {duration:180, label:'Duración: 3 minutos'},
  {duration:300, label:'Duración: 5 minutos'}
];
const OFFICIAL_FASTEST_TARGETS = [
  {goals:3, label:'3 goles'},
  {goals:5, label:'5 goles'}
];

function goalRecordsForDuration(duration){
  const target = +duration;
  return (state.records || []).filter(r => {
    if(!r.duration) return target === 180;
    return +r.duration === target;
  });
}

function personalGoalsHtmlForDuration(duration){
  const bestGoals = bestGoalRecord(goalRecordsForDuration(duration));
  return bestGoals ? renderRecordValue(`⚽ ${bestGoals.goals || 0}`, recordMeta(bestGoals)) : renderRecordValue('—');
}

function personalSurfaceHtmlForDuration(duration){
  const bestSurface = bestSurfaceRecord(goalRecordsForDuration(duration));
  return bestSurface ? renderRecordValue(`${bestSurface.bestUtil || 0}%`, recordMeta(bestSurface)) : renderRecordValue('—');
}

function renderRecordVariant(label, personalHtml, worldHtml){
  return `
    <div class="recordVariant">
      <div class="recordVariantTitle">${label}</div>
      <div class="recordRows">
        <div class="recordRow"><span>Personal</span>${personalHtml}</div>
        <div class="recordRow"><span>Mundial</span>${worldHtml}</div>
      </div>
    </div>
  `;
}

function renderRecordCategory(title, variantsHtml){
  return `
    <section class="recordSection">
      <h3>${title}</h3>
      ${variantsHtml}
    </section>
  `;
}
function renderStats(){
  const goals = goalAttempts();
  const attempts = state.history.length;
  const bestSurface = currentBestSurface();
  const previous = goalPersonalBeforeSave || goalPersonalSnapshot([]);
  const currentPersonal = goalPersonalSnapshot();
  const goalsNewBest = state.goals > (previous.goals || 0);
  const surfaceNewBest = bestSurface > (previous.surface || 0);
  const worldGoals = DATA_PROVIDER.getGoalWorldRecord('mostGoalsFixedDuration', {duration:cfg.duration});
  const worldSurface = DATA_PROVIDER.getGoalWorldRecord('maxSurfaceUsage', {duration:cfg.duration});

  $('statsContent').innerHTML = `
    <div class="statsSummary">
      <p><b>❌ Faltas:</b> ${state.totals.fouls}<br><b>🏁 Intentos:</b> ${attempts}<br><b>🔺 Triangulaciones totales:</b> ${state.totals.triangles}</p>
    </div>
    <section class="recordSection statsRecordSection">
      <h3>GOLES</h3>
      <div class="recordRows">
        <div class="recordRow"><span>Intento actual</span>${renderRecordValue(`⚽ ${state.goals}`)}</div>
        <div class="recordRow"><span>Personal</span>${renderRecordValue(`⚽ ${currentPersonal.goals || 0}`, currentPersonal.bestGoals ? recordMeta(currentPersonal.bestGoals) : '', goalsNewBest)}</div>
        <div class="recordRow"><span>Mundial</span>${worldGoals ? renderRecordValue(`⚽ ${worldGoals.goals || 0}`, recordMeta(worldGoals)) : renderRecordValue('—')}</div>
      </div>
    </section>
    <section class="recordSection statsRecordSection">
      <h3>SUPERFICIE</h3>
      <div class="recordRows">
        <div class="recordRow"><span>Intento actual</span>${renderRecordValue(`${bestSurface}%`)}</div>
        <div class="recordRow"><span>Personal</span>${renderRecordValue(`${currentPersonal.surface || 0}%`, currentPersonal.bestSurface ? recordMeta(currentPersonal.bestSurface) : '', surfaceNewBest)}</div>
        <div class="recordRow"><span>Mundial</span>${worldSurface ? renderRecordValue(`${worldSurface.bestUtil || worldSurface.surface || 0}%`, recordMeta(worldSurface)) : renderRecordValue('—')}</div>
      </div>
    </section>
    ${goals.length ? '<p class="tiny">La superficie corresponde al mayor uso de cancha logrado en una triangulación válida del partido.</p>' : ''}
  `;
  goalPersonalBeforeSave = null;
}

function saveRecordFromUI(){
  goalPersonalBeforeSave = goalPersonalSnapshot();
  saveRecord();
}

function renderRecords(){
  const fastestHtml = OFFICIAL_FASTEST_TARGETS.map(item => renderRecordVariant(
    item.label,
    personalFastestHtml(item.goals),
    worldGoalHtml('fastestNGoles', {goals:item.goals}, r=>recordDash(r.time || r.seconds || r.duration ? formatMetaTime(r.time || r.seconds || r.duration) : null))
  )).join('');

  const goalsHtml = OFFICIAL_GOAL_DURATIONS.map(item => renderRecordVariant(
    item.label,
    personalGoalsHtmlForDuration(item.duration),
    worldGoalHtml('mostGoalsFixedDuration', {duration:item.duration}, r=>`⚽ ${r.goals || 0}`)
  )).join('');

  const surfaceHtml = OFFICIAL_GOAL_DURATIONS.map(item => renderRecordVariant(
    item.label,
    personalSurfaceHtmlForDuration(item.duration),
    worldGoalHtml('maxSurfaceUsage', {duration:item.duration}, r=>`${r.bestUtil || r.surface || 0}%`)
  )).join('');

  $('recordsList').innerHTML = `
    ${renderRecordCategory('RAPIDEZ', fastestHtml)}
    ${renderRecordCategory('GOLES', goalsHtml)}
    ${renderRecordCategory('SUPERFICIE', surfaceHtml)}
  `;
}

if(typeof window !== 'undefined' && !window.__trianotaGoalWorldRecordListener){
  window.__trianotaGoalWorldRecordListener = true;
  window.addEventListener('trianota:goalWorldRecordUpdated', () => {
    const modal = document.getElementById('recordsModal');
    if(modal && modal.classList.contains('show') && typeof renderRecords === 'function'){
      try { console.info('[Trianota records modal rerender]', {reason:'goal-world-record-updated'}); } catch {}
      renderRecords();
    }
  });
}

