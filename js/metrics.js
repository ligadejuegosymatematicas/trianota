function formatMetaTime(t){
  t=Math.max(0,t||0);
  const m=Math.floor(t/60), sec=Math.floor(t%60), cs=Math.floor((t-Math.floor(t))*100);
  return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0')+'.'+String(cs).padStart(2,'0');
}

function summarizeSeq(seq){
  let passes=0, complexity=0, area=0;
  for(const s of seq){ if(s.metrics){passes++; complexity+=s.metrics.complexity; area+=s.metrics.area;} }
  return {passes, triangles:seq.length, complexity, area};
}

function utilization(area){ return ((area/(FIELD_W*FIELD_H))*100).toFixed(1); }