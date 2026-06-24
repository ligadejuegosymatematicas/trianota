function checkGoal(id){
  const d=state.discs[id];
  const left=(FIELD_W-GOAL_W)/2, right=(FIELD_W+GOAL_W)/2;
  const top=GOAL_TOP, bottom=GOAL_TOP+GOAL_D;
  // Gol si la ficha completa queda dentro del rectángulo visible del arco.
  return d.x-R>=left && d.x+R<=right && d.y-R>=top && d.y+R<=bottom;
}