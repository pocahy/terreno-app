// ============================================================
// INÍCIO: anel de progresso do cabeçalho, navegação entre abas,
// resumo da tela Home.
// ============================================================

function renderHeader(){
    const dateEl = document.getElementById('todayDate');
    dateEl.textContent = new Date().toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long'});

    const t = todayStr();
    const doneHabits = state.habits.filter(h => state.completions[t] && state.completions[t][h.id]).length;
    const totalHabits = state.habits.length;
    const doneTasksToday = state.cleaning.filter(c => c.lastDone === t).length;
    const dueTasksToday = state.cleaning.filter(c => daysSince(c.lastDone) >= c.freq).length + doneTasksToday;
    const totalMedDoses = state.medications.reduce((a,m)=>a+m.timesPerDay,0);
    const doneMedDoses = state.medications.reduce((a,m)=>a + medDosesToday(m.id).filter(Boolean).length, 0);
    const totalUnits = totalHabits + Math.max(dueTasksToday,1) + totalMedDoses;
    const doneUnits = doneHabits + doneTasksToday + doneMedDoses;
    const pct = totalUnits ? Math.round((doneUnits/totalUnits)*100) : 0;

    const circumference = 169.6;
    const offset = circumference - (Math.min(pct,100)/100)*circumference;
    document.getElementById('ringFg').style.strokeDashoffset = offset;
    document.getElementById('ringPct').textContent = pct + '%';
    const sub = document.getElementById('ringSub');
    sub.textContent = pct === 0 ? 'terreno de hoje ainda por cuidar' : pct < 100 ? 'terreno em cuidado' : 'terreno cuidado hoje 🌿';
  }

document.querySelectorAll('.navbtn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.navbtn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-'+btn.dataset.tab).classList.add('active');
    });
  });

function goTab(name){
    document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active', b.dataset.tab===name));
    document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.id==='tab-'+name));
  }

function renderHome(){
    const t = todayStr();

    // Medicação
    const md = document.getElementById('homeMeds');
    if(state.medications.length===0){
      md.innerHTML = '<div class="empty">Nenhum medicamento cadastrado ainda.</div>';
    } else {
      const totalDoses = state.medications.reduce((a,m)=>a+m.timesPerDay,0);
      const doneDoses = state.medications.reduce((a,m)=>a + medDosesToday(m.id).filter(Boolean).length, 0);
      const pending = state.medications.filter(m => medDosesToday(m.id).filter(Boolean).length < m.timesPerDay);
      if(pending.length===0){
        md.innerHTML = '<p style="color:var(--moss-dark);font-weight:600;">Todos os medicamentos de hoje tomados 💊</p>';
      } else {
        md.innerHTML = `<p style="margin-bottom:8px;">${doneDoses} de ${totalDoses} doses tomadas hoje. Faltam:</p>` +
          pending.slice(0,4).map(m=>`<div class="habit-row" style="padding:8px 0;"><div class="name" style="font-weight:500;font-size:13.5px;">${m.name} (${m.dose})</div></div>`).join('') +
          `<button class="btn ghost omeds" style="padding-top:6px;">Abrir Remédios →</button>`;
        md.querySelector('.omeds').addEventListener('click', ()=>goTab('medicacao'));
      }
    }

    // Hábitos
    const hb = document.getElementById('homeHabits');
    const pendentes = state.habits.filter(h => !(state.completions[t] && state.completions[t][h.id]));
    if(state.habits.length===0){
      hb.innerHTML = '<div class="empty">Nenhum hábito cadastrado ainda.</div>';
    } else if(pendentes.length===0){
      hb.innerHTML = '<p style="color:var(--moss-dark);font-weight:600;">Todos os hábitos de hoje marcados 🌿</p>';
    } else {
      hb.innerHTML = `<p style="margin-bottom:8px;">${pendentes.length} de ${state.habits.length} ainda por marcar hoje:</p>` +
        pendentes.slice(0,4).map(h=>`<div class="habit-row" style="padding:8px 0;"><div class="name" style="font-weight:500;font-size:13.5px;">${h.name}</div></div>`).join('') +
        `<button class="btn ghost ohabits" style="padding-top:6px;">Abrir Hábitos →</button>`;
      hb.querySelector('.ohabits').addEventListener('click', ()=>goTab('habitos'));
    }

    // Limpeza
    const cl = document.getElementById('homeCleaning');
    const dueOrLate = state.cleaning.filter(c => daysSince(c.lastDone) >= c.freq);
    if(state.cleaning.length===0){
      cl.innerHTML = '<div class="empty">Nenhuma tarefa cadastrada ainda.</div>';
    } else if(dueOrLate.length===0){
      cl.innerHTML = '<p style="color:var(--moss-dark);font-weight:600;">Nada vencendo hoje — tudo em dia.</p>';
    } else {
      cl.innerHTML = `<p style="margin-bottom:8px;">${dueOrLate.length} tarefa${dueOrLate.length>1?'s':''} vencendo ou atrasada${dueOrLate.length>1?'s':''}:</p>` +
        dueOrLate.slice(0,4).map(c=>`<div class="task-row" style="padding:8px 0;"><div class="task-status ${daysSince(c.lastDone)>c.freq?'late':'soon'}"></div><div class="info"><div class="name" style="font-size:13.5px;">${c.name}</div></div></div>`).join('') +
        `<button class="btn ghost ocleaning" style="padding-top:6px;">Abrir Limpeza →</button>`;
      cl.querySelector('.ocleaning').addEventListener('click', ()=>goTab('limpeza'));
    }

    // Compras
    const sh = document.getElementById('homeShopping');
    if(!state.shoppingList){
      sh.innerHTML = '<p>Você ainda não gerou sua lista de compras da semana.</p><button class="btn small secondary oshop" style="margin-top:8px;">Gerar lista</button>';
    } else {
      const total = state.shoppingList.items.length;
      const done = state.shoppingList.items.filter(i=>i.done).length;
      sh.innerHTML = `<p>${done} de ${total} itens já comprados.</p><button class="btn ghost oshop" style="padding-top:6px;">Abrir lista →</button>`;
    }
    sh.querySelector('.oshop').addEventListener('click', ()=>goTab('comida'));
  }
