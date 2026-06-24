// Campaign zone definitions. Classic global script loaded before main.js.
function metaZones(){
  if(state.gameMode !== 'meta') return [];
  const side = FIELD_W/6;
  if(state.currentMetaWorld===2 && state.currentMetaLevel===1){
    // Mundo 2 · Nivel 1: metas C1 exclusivas por color, distribuidas arriba.
    const c = 1.0;
    return [
      {top:0, bottom:c, left:0, right:c, label:'', targetId:1, tint:'#60a5fa', border:'#38bdf8'},
      {top:0, bottom:c, left:(FIELD_W-c)/2, right:(FIELD_W+c)/2, label:'', targetId:0, tint:'#a855f7', border:'#d8b4fe'},
      {top:0, bottom:c, left:FIELD_W-c, right:FIELD_W, label:'', targetId:2, tint:'#f87171', border:'#fecaca'}
    ];
  }
  if(state.currentMetaWorld===2 && state.currentMetaLevel===2){
    const c = 1.0;
    return [
      {top:0, bottom:c, left:0, right:c, label:'', targetId:1, tint:'#60a5fa', border:'#38bdf8'},
      {top:(FIELD_H-c)/2, bottom:(FIELD_H+c)/2, left:0, right:c, label:'', targetId:2, tint:'#f87171', border:'#fecaca'},
      {top:FIELD_H-c, bottom:FIELD_H, left:0, right:c, label:'', targetId:0, tint:'#a855f7', border:'#d8b4fe'}
    ];
  }
  if(state.currentMetaWorld===2 && state.currentMetaLevel===3){
    const c = 1.0;
    return [
      {top:0, bottom:c, left:FIELD_W-c, right:FIELD_W, label:'', targetId:0, tint:'#a855f7', border:'#d8b4fe'},
      {top:(FIELD_H-c)/2, bottom:(FIELD_H+c)/2, left:FIELD_W-c, right:FIELD_W, label:'', targetId:2, tint:'#f87171', border:'#fecaca'},
      {top:FIELD_H-c, bottom:FIELD_H, left:FIELD_W-c, right:FIELD_W, label:'', targetId:1, tint:'#60a5fa', border:'#38bdf8'}
    ];
  }
  if(state.currentMetaWorld===2 && state.currentMetaLevel===4){
    const c = 1.0;
    return [
      {top:FIELD_H-c, bottom:FIELD_H, left:0, right:c, label:'', targetId:1, tint:'#60a5fa', border:'#38bdf8'},
      {top:FIELD_H-c, bottom:FIELD_H, left:(FIELD_W-c)/2, right:(FIELD_W+c)/2, label:'', targetId:0, tint:'#a855f7', border:'#d8b4fe'},
      {top:FIELD_H-c, bottom:FIELD_H, left:FIELD_W-c, right:FIELD_W, label:'', targetId:2, tint:'#f87171', border:'#fecaca'}
    ];
  }
  if(state.currentMetaWorld===2 && state.currentMetaLevel===5){
    const c = 1.0;
    const y = FIELD_H/2;
    return [
      {top:y-c/2, bottom:y+c/2, left:2-c/2, right:2+c/2, label:'', targetId:2, tint:'#f87171', border:'#fecaca'},
      {top:y-c/2, bottom:y+c/2, left:5-c/2, right:5+c/2, label:'', targetId:0, tint:'#a855f7', border:'#d8b4fe'},
      {top:y-c/2, bottom:y+c/2, left:8-c/2, right:8+c/2, label:'', targetId:1, tint:'#60a5fa', border:'#38bdf8'}
    ];
  }
  if(state.currentMetaWorld===2 && state.currentMetaLevel===6){
    const c = 1.0;
    return [
      {top:0, bottom:c, left:0, right:c, label:'', targetId:0, tint:'#a855f7', border:'#d8b4fe'},
      {top:0, bottom:c, left:FIELD_W-c, right:FIELD_W, label:'', targetId:1, tint:'#60a5fa', border:'#38bdf8'},
      {top:FIELD_H-c, bottom:FIELD_H, left:(FIELD_W-c)/2, right:(FIELD_W+c)/2, label:'', targetId:2, tint:'#f87171', border:'#fecaca'}
    ];
  }
  if(state.currentMetaWorld===3 && state.currentMetaLevel===1){
    const c = 1.0;
    return [{top:0, bottom:c, left:(FIELD_W-c)/2, right:(FIELD_W+c)/2, label:'', requiredName:'B', tint:'#60a5fa', border:'#38bdf8'}];
  }
  if(state.currentMetaWorld===3 && state.currentMetaLevel===2){
    const c = 1.0;
    return [{top:FIELD_H-c, bottom:FIELD_H, left:(FIELD_W-c)/2, right:(FIELD_W+c)/2, label:'', requiredName:'C', tint:'#f87171', border:'#fecaca'}];
  }
  if(state.currentMetaWorld===3 && state.currentMetaLevel===3){
    const c = 1.0;
    return [{top:0, bottom:c, left:(FIELD_W-c)/2, right:(FIELD_W+c)/2, label:'', requiredName:'A', tint:'#a855f7', border:'#d8b4fe'}];
  }
  if(state.currentMetaWorld===3 && state.currentMetaLevel===4){
    // M3-N4: dos metas 2×2 centradas en (5,7) y (5,11), usando coordenadas cartesianas de diseño.
    const makeMeta = (cx, yDesign, w, h, requiredName, tint, border) => {
      const cy = FIELD_H - yDesign;
      return {top:cy-h/2, bottom:cy+h/2, left:cx-w/2, right:cx+w/2, label:'', requiredName, tint, border};
    };
    return [
      makeMeta(FIELD_W/2, 7, 2.0, 2.0, 'B', '#60a5fa', '#38bdf8'),
      makeMeta(FIELD_W/2, 11, 2.0, 2.0, 'C', '#f87171', '#fecaca')
    ];
  }
  if(state.currentMetaWorld===3 && state.currentMetaLevel===5){
    // M3-N5: metas rojas laterales, metas azules centrales y pintores morado/azul.
    const makeMeta = (cx, yDesign, w, h, requiredName, tint, border) => {
      const cy = FIELD_H - yDesign;
      return {top:cy-h/2, bottom:cy+h/2, left:cx-w/2, right:cx+w/2, label:'', requiredName, tint, border};
    };
    return [
      makeMeta(2, 7, 4.0, 2.0, 'C', '#f87171', '#fecaca'),
      makeMeta(8, 7, 4.0, 2.0, 'C', '#f87171', '#fecaca'),
      makeMeta(5, 7, 2.0, 2.0, 'B', '#60a5fa', '#38bdf8'),
      makeMeta(5, 11, 2.0, 2.0, 'B', '#60a5fa', '#38bdf8')
    ];
  }
  if(state.currentMetaWorld===3 && state.currentMetaLevel===6){
    // M3-N6: meta roja ancha y meta morada superior.
    const makeMeta = (cx, yDesign, w, h, requiredName, tint, border) => {
      const cy = FIELD_H - yDesign;
      return {top:cy-h/2, bottom:cy+h/2, left:cx-w/2, right:cx+w/2, label:'', requiredName, tint, border};
    };
    return [
      makeMeta(5, 7, 10.0, 2.0, 'C', '#f87171', '#fecaca'),
      makeMeta(5, 17, 2.0, 2.0, 'A', '#a855f7', '#d8b4fe')
    ];
  }
  if(state.currentMetaLevel===2){
    return [
      {top:0, bottom:side, left:0, right:side, label:''},
      {top:0, bottom:side, left:FIELD_W-side, right:FIELD_W, label:''}
    ];
  }
  if(state.currentMetaLevel===3){
    return [
      {top:0, bottom:side, left:FIELD_W-side, right:FIELD_W, label:''},
      {top:FIELD_H-side, bottom:FIELD_H, left:FIELD_W-side, right:FIELD_W, label:''}
    ];
  }
  if(state.currentMetaLevel===4){
    const areaL3 = side * side;
    const w = side;
    const h = (areaL3 * 0.5) / w;
    return [{top:0, bottom:h, left:(FIELD_W-w)/2, right:(FIELD_W+w)/2, label:''}];
  }
  if(state.currentMetaLevel===5){
    const c = 1.0;
    return [
      {top:FIELD_H-c, bottom:FIELD_H, left:0, right:c, label:''},
      {top:FIELD_H-c, bottom:FIELD_H, left:FIELD_W-c, right:FIELD_W, label:''}
    ];
  }
  if(state.currentMetaLevel===6){
    const c = 1.0;
    return [
      {top:0, bottom:c, left:0, right:c, label:''},
      {top:0, bottom:c, left:(FIELD_W-c)/2, right:(FIELD_W+c)/2, label:''},
      {top:0, bottom:c, left:FIELD_W-c, right:FIELD_W, label:''}
    ];
  }
  return [{top:0, bottom:side, left:0, right:FIELD_W, label:''}];
}

function paintZones(){
  // Los charcos son mecánicas exclusivas de niveles del modo Campaña.
  // No deben existir ni visual ni funcionalmente en modo Gol.
  if(state.gameMode !== 'meta') return [];
  if(state.currentMetaWorld !== 3) return [];

  const makePool = (cx, cy, w, h, color, border, deep, name, label) => ({
    left:cx-w/2, right:cx+w/2, top:cy-h/2, bottom:cy+h/2,
    cx, cy, rx:w/2, ry:h/2, r:Math.max(w,h)/2, color, border, deep, name, label
  });
  const cyFromDesign = y => FIELD_H - y;

  if(state.currentMetaLevel===1){
    return [makePool(FIELD_W/2, FIELD_H/2, 1.0, 1.0, '#60a5fa', '#bfdbfe', '#1d4ed8', 'B', 'azul')];
  }
  if(state.currentMetaLevel===2){
    return [makePool(FIELD_W/2, FIELD_H/2, 1.0, 1.0, '#f87171', '#fecaca', '#991b1b', 'C', 'rojo')];
  }
  if(state.currentMetaLevel===3){
    // M3-N3: H9 simétrica. Charco morado central 2×1 y charcos azules C1 a ambos lados.
    const y = FIELD_H/2;
    const pools = [];
    [0.5,1.5,2.5,3.5,6.5,7.5,8.5,9.5].forEach(x=>{
      pools.push(makePool(x, y, 1.0, 1.0, '#60a5fa', '#bfdbfe', '#1d4ed8', 'B', 'azul'));
    });
    pools.push(makePool(FIELD_W/2, y, 2.0, 1.0, '#a855f7', '#d8b4fe', '#581c87', 'A', 'morado'));
    return pools;
  }
  if(state.currentMetaLevel===4){
    // M3-N4:
    // - 5 charcos morados C1 en y=9 para x=3,4,5,6,7.
    // - 1 charco rojo 5×2 centrado en (5,15).
    const pools = [];
    [3,4,5,6,7].forEach(x=>{
      pools.push(makePool(x, cyFromDesign(9), 1.0, 1.0, '#a855f7', '#d8b4fe', '#581c87', 'A', 'morado'));
    });
    pools.push(makePool(FIELD_W/2, cyFromDesign(15), 5.0, 2.0, '#f87171', '#fecaca', '#991b1b', 'C', 'rojo'));
    return pools;
  }
  if(state.currentMetaLevel===5){
    // M3-N5:
    // - 7 charcos morados C1 centrados en (3,10),(3,9),(4,9),(5,9),(6,9),(7,9),(7,10).
    // - 1 charco azul 5×2 centrado en (5,15).
    const pools = [];
    [[3,10],[3,9],[4,9],[5,9],[6,9],[7,9],[7,10]].forEach(([x,y])=>{
      pools.push(makePool(x, cyFromDesign(y), 1.0, 1.0, '#a855f7', '#d8b4fe', '#581c87', 'A', 'morado'));
    });
    pools.push(makePool(5, cyFromDesign(15), 5.0, 2.0, '#60a5fa', '#bfdbfe', '#1d4ed8', 'B', 'azul'));
    return pools;
  }
  if(state.currentMetaLevel===6){
    // M3-N6:
    // - 9 charcos azules C1 en y=9 para x=1,...,9.
    // - 1 charco morado 5×2 centrado en (5,13).
    const pools = [];
    [1,2,3,4,5,6,7,8,9].forEach(x=>{
      pools.push(makePool(x, cyFromDesign(9), 1.0, 1.0, '#60a5fa', '#bfdbfe', '#1d4ed8', 'B', 'azul'));
    });
    pools.push(makePool(5, cyFromDesign(13), 5.0, 2.0, '#a855f7', '#d8b4fe', '#581c87', 'A', 'morado'));
    return pools;
  }
  return [];
}
function keyZones(){
  if(state.gameMode !== 'meta') return [];
  return [];
}
function portalZones(){
  if(state.gameMode !== 'meta') return [];
  return [];
}
function bounceZones(){
  if(state.gameMode !== 'meta') return [];
  return [];
}
function dangerZones(){
  if(state.gameMode !== 'meta') return [];
  return [];
}
