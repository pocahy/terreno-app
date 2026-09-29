// ============================================================
// HÁBITOS: registro diário, gatilhos "Quando..., então..."
// (implementation intentions), reações de prazer/conquista e
// insights simples de ativação comportamental.
// ============================================================

function weekCount(habitId){
    let count=0;
    for(let i=0;i<7;i++){
      const d = new Date(); d.setDate(d.getDate()-i);
      const ds = localDateStr(d);
      if(state.completions[ds] && state.completions[ds][habitId]) count++;
    }
    return count;
  }

function toggleHabit(id){
    const t = todayStr();
    const h = state.habits.find(x=>x.id===id);
    state.completions[t] = state.completions[t] || {};
    state.completions[t][id] = !state.completions[t][id];
    if(!state.completions[t][id] && state.feelings[t]) delete state.feelings[t][id];
    addPoints(state.completions[t][id] ? POINTS.habit : -POINTS.habit, 'hábito: '+(h?h.name:id));
    saveState(); renderHabits(); renderHeader(); renderHome(); renderRewards();
  }

function setFeeling(habitId, kind){
    const t = todayStr();
    state.feelings[t] = state.feelings[t] || {};
    if(state.feelings[t][habitId] === kind) delete state.feelings[t][habitId];
    else state.feelings[t][habitId] = kind;
    saveState(); renderHabits();
  }

function renderHabits(){
    const card = document.getElementById('habitsCard');
    const t = todayStr();
    if(state.habits.length===0){
      card.innerHTML = '<div class="empty">Nenhum hábito ainda. Adicione um abaixo.</div>';
      renderHabitInsights();
      return;
    }
    card.innerHTML = state.habits.map(h=>{
      const on = !!(state.completions[t] && state.completions[t][h.id]);
      const wk = weekCount(h.id);
      const feel = (state.feelings[t]||{})[h.id];
      return `<div class="habit-row" style="align-items:flex-start;">
        <div style="flex:1;">
          <div class="name">${h.name}</div>
          ${h.cue ? `<div class="habit-cue">quando ${h.cue} → então faço</div>` : ''}
          <div class="week">${wk}/7 dias essa semana · <button class="linkbtn" data-edit="${h.id}">editar</button></div>
          ${on ? `<div class="feel-row">
              <button class="feel-chip ${feel==='prazer'?'on':''}" data-feel="prazer" data-id="${h.id}">😊 me fez bem</button>
              <button class="feel-chip ${feel==='conquista'?'on':''}" data-feel="conquista" data-id="${h.id}">💪 conquista</button>
            </div>` : ''}
        </div>
        <div class="habit-toggle ${on?'on':''}" data-id="${h.id}">
          <svg viewBox="0 0 24 24"><polyline points="5 13 10 18 19 7"/></svg>
        </div>
      </div>`;
    }).join('');
    card.querySelectorAll('.habit-toggle').forEach(el=> el.addEventListener('click', ()=> toggleHabit(el.dataset.id)));
    card.querySelectorAll('.feel-chip').forEach(el=> el.addEventListener('click', ()=> setFeeling(el.dataset.id, el.dataset.feel)));
    card.querySelectorAll('[data-edit]').forEach(el=> el.addEventListener('click', ()=> editHabit(el.dataset.edit)));
    renderHabitInsights();
  }

function editHabit(id){
    const h = state.habits.find(x=>x.id===id);
    if(!h) return;
    const name = prompt('Nome do hábito (deixe vazio para remover):', h.name);
    if(name === null) return;
    if(name.trim() === ''){
      if(confirm('Remover o hábito "'+h.name+'"?')){
        state.habits = state.habits.filter(x=>x.id!==id);
        saveState(); renderHabits(); renderHome(); renderHeader();
      }
      return;
    }
    const cue = prompt('Gatilho — "Quando..." (algo que você já faz todo dia; opcional):', h.cue || '');
    h.name = name.trim();
    h.cue = (cue||'').trim().replace(/^quando\s+/i,'');
    saveState(); renderHabits(); renderHome();
  }

// Hábitos que mais aparecem como "me fez bem" nos últimos 28 dias
function pleasureHabits(){
    const counts = {};
    for(let i=0;i<28;i++){
      const d = new Date(); d.setDate(d.getDate()-i);
      const f = state.feelings[localDateStr(d)] || {};
      Object.keys(f).forEach(id=>{ if(f[id]==='prazer') counts[id]=(counts[id]||0)+1; });
    }
    return Object.entries(counts).sort((a,b)=>b[1]-a[1])
      .map(([id,n])=>({habit: state.habits.find(h=>h.id===id), n})).filter(x=>x.habit);
  }

function renderHabitInsights(){
    const box = document.getElementById('habitInsightsCard');
    if(!box) return;
    const results = [];
    state.habits.forEach(h=>{
      const withH=[], withoutH=[];
      for(let i=0;i<28;i++){
        const d = new Date(); d.setDate(d.getDate()-i);
        const ds = localDateStr(d);
        const e = state.energyLog[ds];
        if(!e) continue;
        const done = !!(state.completions[ds] && state.completions[ds][h.id]);
        (done ? withH : withoutH).push(e);
      }
      if(withH.length>=3 && withoutH.length>=3){
        const a = withH.reduce((x,y)=>x+y,0)/withH.length;
        const b = withoutH.reduce((x,y)=>x+y,0)/withoutH.length;
        if(a - b >= 0.3) results.push({h, a, b});
      }
    });
    results.sort((x,y)=>(y.a-y.b)-(x.a-x.b));
    const pleasure = pleasureHabits().slice(0,3);
    const lvl = v => ['','baixa','ok','boa','ótima'][Math.round(v)] || v.toFixed(1);
    if(results.length===0 && pleasure.length===0){
      box.innerHTML = '<div class="empty">Registre sua energia na Início e toque em "😊 me fez bem" / "💪 conquista" nos hábitos por alguns dias. Os padrões aparecem aqui.</div>';
      return;
    }
    box.innerHTML =
      results.slice(0,2).map(r=>`<div class="task-row"><div class="info"><div class="name">${r.h.name}</div><div class="when">Nos dias em que você fez isso, sua energia ficou em média ${lvl(r.a)}; nos outros, ${lvl(r.b)}.</div></div></div>`).join('') +
      pleasure.map(p=>`<div class="task-row"><div class="info"><div class="name">${p.habit.name}</div><div class="when">Marcado como "me fez bem" ${p.n}x nas últimas 4 semanas.</div></div></div>`).join('') +
      '<p style="font-size:12px;margin-top:8px;">São associações, não causa e efeito — servem de pista pra reservar espaço pro que costuma te fazer bem.</p>';
  }

document.getElementById('addHabitBtn').addEventListener('click', ()=>{
    const name = prompt('Nome do novo hábito:');
    if(!name) return;
    const cue = prompt('Gatilho — "Quando..." (ex: eu servir o café). Opcional:', '') || '';
    state.habits.push({id:'h'+Date.now(), name:name.trim(), cue: cue.trim().replace(/^quando\s+/i,'')});
    saveState(); renderHabits(); renderHome();
  });
