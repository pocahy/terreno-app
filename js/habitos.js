// ============================================================
// HÁBITOS: contagem semanal e registro diário.
// ============================================================

function weekCount(habitId){
    let count=0;
    for(let i=0;i<7;i++){
      const d = new Date(); d.setDate(d.getDate()-i);
      const ds = d.toISOString().slice(0,10);
      if(state.completions[ds] && state.completions[ds][habitId]) count++;
    }
    return count;
  }

function renderHabits(){
    const card = document.getElementById('habitsCard');
    const t = todayStr();
    if(state.habits.length===0){
      card.innerHTML = '<div class="empty">Nenhum hábito ainda. Adicione um abaixo.</div>';
      return;
    }
    card.innerHTML = state.habits.map(h=>{
      const on = !!(state.completions[t] && state.completions[t][h.id]);
      const wk = weekCount(h.id);
      return `<div class="habit-row">
        <div>
          <div class="name">${h.name}</div>
          <div class="week">${wk}/7 dias essa semana</div>
        </div>
        <div class="habit-toggle ${on?'on':''}" data-id="${h.id}">
          <svg viewBox="0 0 24 24"><polyline points="5 13 10 18 19 7"/></svg>
        </div>
      </div>`;
    }).join('');
    card.querySelectorAll('.habit-toggle').forEach(el=>{
      el.addEventListener('click', ()=>{
        const id = el.dataset.id;
        const h = state.habits.find(x=>x.id===id);
        state.completions[t] = state.completions[t] || {};
        state.completions[t][id] = !state.completions[t][id];
        addPoints(state.completions[t][id] ? POINTS.habit : -POINTS.habit, 'hábito: '+(h?h.name:id));
        saveState(); renderHabits(); renderHeader(); renderHome(); renderRewards();
      });
    });
  }

document.getElementById('addHabitBtn').addEventListener('click', ()=>{
    const name = prompt('Nome do novo hábito:');
    if(!name) return;
    state.habits.push({id:'h'+Date.now(), name});
    saveState(); renderHabits(); renderHome();
  });
