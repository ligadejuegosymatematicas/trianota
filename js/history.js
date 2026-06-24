function attemptTitle(h,i){ return `${h.type==='meta'?'🏁 Meta':(h.type==='goal'?'⚽ Gol':'❌ Falta')} #${i+1}`; }

function campaignAttemptLevelKey(h){
  const world = state.currentMetaWorld || 1;
  const level = h.level || state.currentMetaLevel || 1;
  return state.metaLevelKey || `${world}-${level}`;
}

function campaignAttemptComparisonHtml(h){
  if(state.gameMode !== 'meta' && h.type !== 'meta') return '';
  const levelKey = campaignAttemptLevelKey(h);
  const personal = state.metaBest && state.metaBest[levelKey];
  const world = DATA_PROVIDER.getCampaignWorldRecord ? DATA_PROVIDER.getCampaignWorldRecord(levelKey) : null;
  const attemptTime = h.duration || h.time || 0;
  return `<div class="tiny">Intento: ${formatMetaTime(attemptTime)}<br>Personal: ${personal ? formatMetaTime(personal.time) : '—'}<br>Mundial: ${world ? formatMetaTime(world.time) : '—'}</div>`;
}

function renderAttemptStats(i){
  const h=state.history[i]; if(!h) return;
  const util = utilization(h.metrics.area);
  const campaignCompare = campaignAttemptComparisonHtml(h);
  $('attemptContent').innerHTML = `
    <p><b>${attemptTitle(h,i)}</b></p>
    <p><b>Resultado:</b> ${h.type==='meta'?'Meta':(h.type==='goal'?'Gol':'Falta')}${h.type==='foul' ? `<br><b>Causa:</b> ${escapeHtml(h.reason||'—')}` : ''}</p>
    ${campaignCompare ? `<p><b>⏱ Comparación:</b><br>${campaignCompare}</p>` : `<p><b>⏱ Duración:</b> ${h.duration.toFixed(1)} s</p>`}
    <p><b>🔺 Triangulaciones:</b> ${h.metrics.triangles}<br><b>👣 Pases válidos:</b> ${h.metrics.passes}</p>
    <p><b>📏 Utilización de cancha:</b> ${util}%</p>
    <button class="btn secondary" id="viewAttemptBtn">Ver triangulaciones</button>
  `;
  setTimeout(()=>{ const b=$('viewAttemptBtn'); if(b) b.onclick=()=>{ hideModal('attemptModal'); loadHistory(i); }; },0);
}

function renderHistory(){
  if(state.gameMode==='meta'){
    const levelKey = state.metaLevelKey || `1-${state.currentMetaLevel||1}`;
    const levelNum = state.currentMetaLevel || 1;
    const rec = state.metaBest && state.metaBest[levelKey];
    const recordHtml = rec
      ? `<div class="listItem"><div><b>🏆 Récord · Mundo ${state.currentMetaWorld||1} Nivel ${levelNum}</b><div class="tiny">⏱ ${formatMetaTime(rec.time)} · ${rec.metrics.passes} pases · ${rec.metrics.triangles} triángulos · ${escapeHtml(rec.date||'')}</div></div><button class="btn small secondary" data-record-replay="${levelKey}">Ver</button></div>`
      : `<p class="tiny">Aún no hay récord guardado para este nivel.</p>`;
    const sessionHtml = state.history.length
      ? state.history.map((h,i)=>`<div class="listItem"><div><b>${h.type==='meta'?'🏁 Meta':(h.type==='goal'?'⚽ Gol':'❌ Falta')} #${i+1}</b><div class="tiny">⏱ ${formatMetaTime(h.duration||h.time||0)} · ${h.metrics.passes} pases · ${h.metrics.triangles} triángulos · Uso ${utilization(h.metrics.area)}%</div>${campaignAttemptComparisonHtml(h)}</div><button class="btn small secondary" data-stats="${i}">📊</button><button class="btn small secondary" data-replay="${i}">Ver</button></div>`).join('')
      : '<p class="tiny">Aún no hay intentos en esta sesión.</p>';
    $('historyList').innerHTML = `<p><b>Récord guardado</b></p>${recordHtml}<p><b>Intentos de esta sesión</b></p>${sessionHtml}`;
    document.querySelectorAll('[data-record-replay]').forEach(b=>b.onclick=()=>{loadMetaRecord(b.dataset.recordReplay); hideModal('historyModal');});
  } else {
    if(!state.history.length){$('historyList').innerHTML='<p>No hay jugadas todavía.</p>'; return;}
    $('historyList').innerHTML=state.history.map((h,i)=>`<div class="listItem"><div><b>${h.type==='meta'?'🏁 Meta':(h.type==='goal'?'⚽ Gol':'❌ Falta')} #${i+1}</b><div class="tiny">${h.metrics.passes} pases · ${h.metrics.triangles} triángulos · Uso ${utilization(h.metrics.area)}%</div></div><button class="btn small secondary" data-stats="${i}">📊</button><button class="btn small secondary" data-replay="${i}">Ver</button></div>`).join('');
  }
  document.querySelectorAll('[data-stats]').forEach(b=>b.onclick=()=>{renderAttemptStats(+b.dataset.stats); hideModal('historyModal'); showModal('attemptModal');});
  document.querySelectorAll('[data-replay]').forEach(b=>b.onclick=()=>{loadHistory(+b.dataset.replay); hideModal('historyModal');});
}

function loadHistory(i){
  const h=state.history[i]; if(!h) return;
  const lastTri=h.seq[h.seq.length-1].tri;
  for(const d of state.discs){const p=lastTri.find(q=>q.id===d.id); d.x=p.x; d.y=p.y; d.vx=d.vy=0;}
  state.currentSeq=JSON.parse(JSON.stringify(h.seq)); state.showTri=true; updateTriButton(); renderLegend(); draw();
  setStatus(`${h.type==='meta'?'Meta':(h.type==='goal'?'Gol':'Falta')} histórico #${i+1}.`);
}

function loadMetaRecord(levelKey){
  const rec = state.metaBest && state.metaBest[levelKey];
  if(!rec || !rec.seq || !rec.seq.length) return;
  const lastTri = rec.seq[rec.seq.length-1].tri;
  for(const d of state.discs){
    const p = lastTri.find(q=>q.id===d.id);
    if(p){ d.x=p.x; d.y=p.y; d.vx=0; d.vy=0; }
  }
  state.currentSeq = JSON.parse(JSON.stringify(rec.seq));
  state.showTri = true;
  updateTriButton();
  renderLegend();
  draw();
  setStatus(`Récord guardado: ${formatMetaTime(rec.time)}.`);
}