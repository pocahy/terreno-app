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

// Navegação: 4 abas fixas + "Mais" (Hábitos, Remédios, Prêmios, Dicas, Ajustes)
const MORE_TABS = ['habitos','medicacao','premios','dicas','mais'];

function goTab(name){
    document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.id==='tab-'+name));
    document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active',
      b.dataset.tab===name || (b.dataset.tab==='mais' && MORE_TABS.includes(name))));
    window.scrollTo(0,0);
  }

document.querySelectorAll('.navbtn').forEach(btn=> btn.addEventListener('click', ()=> goTab(btn.dataset.tab)));
document.querySelectorAll('[data-go]').forEach(btn=> btn.addEventListener('click', ()=> goTab(btn.dataset.go)));

const ENERGY_LEVELS = [
    {v:1, label:'🪫 Baixa'}, {v:2, label:'😐 Ok'}, {v:3, label:'🙂 Boa'}, {v:4, label:'⚡ Ótima'}
  ];

function setEnergy(v){
    state.energyLog[todayStr()] = v;
    saveState(); renderHome(); renderHabits();
  }

function isLowEnergyMode(){
    const t = todayStr();
    return state.energyLog[t] === 1 && state.showFullDay !== t;
  }

// Lista única "o que fazer agora": junta remédio, compromisso, bloco
// do plano, tarefa solta, hábito e limpeza — decidir menos, navegar menos.
function buildNowItems(){
    const t = todayStr();
    const now = hhmmToMin(nowHHMM());
    const low = isLowEnergyMode();
    const items = [];

    state.medications.forEach(m=>{
      const doses = medDosesToday(m.id);
      const idx = (m.times||[]).findIndex((tm,i)=> !doses[i] && hhmmToMin(tm) <= now + 60);
      if(idx >= 0) items.push({icon:'💊', text:`${m.name} ${m.dose}`, sub:`horário ${m.times[idx]}`, action:'Tomei', run:()=>toggleMedDose(m.id, idx, m.timesPerDay)});
    });

    if(!low){
      const ev = ((state.calendarEvents && state.calendarEvents.events)||[]).find(e=>{
        if(e.allDay || (e.start||'').slice(0,10)!==t) return false;
        const d = new Date(e.start); const m = d.getHours()*60+d.getMinutes();
        return m >= now && m <= now + 180;
      });
      if(ev) items.push({icon:'📅', text:ev.summary, sub:'às '+fmtEventTime(ev), go:'agenda'});

      const plan = state.tomorrowPlan;
      if(plan && plan.forDate === t){
        const b = plan.blocks.find(x=> x.time && x.type!=='compromisso' && hhmmToMin(x.time) >= now - 20);
        if(b) items.push({icon: b.type==='estudo'?'📚':(b.type==='movimento'?'🏃':'🌿'), text:b.title, sub:b.time + (b.detail?' · '+b.detail:''), go:'agenda'});
      }
    }

    const loose = state.inbox.find(x=>x.status==='tarefa' && !x.done);
    if(loose) items.push({icon:'✅', text:loose.text, sub:'tarefa solta', action:'Feito', run:()=>toggleLooseTask(loose.id)});

    const pend = state.habits.filter(h=> !(state.completions[t] && state.completions[t][h.id]));
    const lowOk = h => /água|agua|luz|remédio|medica/i.test(h.name);
    const habit = low ? pend.find(lowOk) : (pend.find(h=>h.cue) || pend[0]);
    if(habit) items.push({icon:'🔁', text:habit.name, sub: habit.cue ? 'quando '+habit.cue : 'hábito de hoje', action:'Feito', run:()=>toggleHabit(habit.id)});

    const due = state.cleaning.filter(c=> daysSince(c.lastDone) >= c.freq).sort((a,b)=>a.freq-b.freq)[0];
    if(due && (!low || items.length < 3)) items.push({icon:'🧹', text:due.name, sub: low ? 'só essa, se der' : 'pedindo atenção', action:'Feito', run:()=>markCleaningDone(due.id)});

    return items.slice(0, low ? 3 : 5);
  }

function renderNow(){
    const box = document.getElementById('homeNow');
    if(!box) return;
    const items = buildNowItems();
    if(!items.length){
      box.innerHTML = '<p style="color:var(--moss-dark);font-weight:600;">Nada pedindo atenção agora 🌿</p>';
    } else {
      box.innerHTML = items.map((it,i)=>`
        <div class="now-row">
          <div class="now-icon">${it.icon}</div>
          <div class="info"><div class="name">${it.text}</div><div class="when">${it.sub||''}</div></div>
          ${it.action ? `<button class="btn small secondary" data-now="${i}">${it.action}</button>` : `<button class="btn small ghost" data-nowgo="${i}">Ver</button>`}
        </div>`).join('');
      box.querySelectorAll('[data-now]').forEach(b=> b.addEventListener('click', ()=> items[+b.dataset.now].run()));
      box.querySelectorAll('[data-nowgo]').forEach(b=> b.addEventListener('click', ()=> goTab(items[+b.dataset.nowgo].go)));
    }
    const bonus = document.getElementById('homeBonus');
    if(bonus && typeof currentBonus==='function') bonus.textContent = `✨ Bônus da semana: ${currentBonus().label} vale o dobro · 🌱 ${state.points} sementes`;
  }

function renderCheckin(){
    const box = document.getElementById('homeCheckin');
    if(!box) return;
    const e = state.energyLog[todayStr()];
    if(!e){
      box.style.display = 'block';
      box.innerHTML = `<p style="font-weight:600;color:var(--ink);margin-bottom:8px;">Como está sua energia hoje?</p>
        <div class="quiz-options">${ENERGY_LEVELS.map(l=>`<button class="qopt" data-energy="${l.v}">${l.label}</button>`).join('')}</div>
        <p style="font-size:12px;margin-top:6px;">Com energia baixa, a Início mostra só o essencial.</p>`;
    } else {
      const l = ENERGY_LEVELS.find(x=>x.v===e);
      box.style.display = 'block';
      box.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:13.5px;">Energia hoje: <strong>${l ? l.label : e}</strong></span>
        <button class="linkbtn" id="changeEnergy">mudar</button></div>`;
      document.getElementById('changeEnergy').addEventListener('click', ()=>{ delete state.energyLog[todayStr()]; saveState(); renderHome(); });
    }
    box.querySelectorAll('[data-energy]').forEach(b=> b.addEventListener('click', ()=> setEnergy(+b.dataset.energy)));
  }

function renderWelcome(){
    const box = document.getElementById('homeWelcome');
    if(!box) return;
    const w = state.welcomeBack;
    if(!w || w.dismissed || w.date !== todayStr()){ box.style.display='none'; return; }
    const kept = state.habits.length ? `Seus ${state.habits.length} hábitos continuam aqui, do jeito que você deixou.` : '';
    box.style.display = 'block';
    box.innerHTML = `<p style="font-family:'Fraunces',serif;font-size:17px;color:var(--moss-dark);font-weight:600;">Que bom te ver de volta 🌿</p>
      <p style="margin-top:6px;font-size:13.5px;">Foram ${w.gap} dias longe — acontece, e não apaga nada. Suas 🌱 ${state.points} sementes continuam guardadas. ${kept}</p>
      <p style="margin-top:6px;font-size:13.5px;">Pra recomeçar, escolha só <strong>uma</strong> coisa da lista "Agora" abaixo.</p>
      <button class="btn small secondary" id="dismissWelcome" style="margin-top:10px;">Combinado</button>`;
    document.getElementById('dismissWelcome').addEventListener('click', ()=>{ state.welcomeBack.dismissed = true; saveState(); renderHome(); });
  }

function renderHome(){
    const t = todayStr();
    renderWelcome();
    renderCheckin();
    renderNow();
    const low = isLowEnergyMode();
    const full = document.getElementById('homeFull');
    const lowBox = document.getElementById('homeLowEnergy');
    if(full) full.style.display = low ? 'none' : 'block';
    if(lowBox){
      lowBox.style.display = low ? 'block' : 'none';
      if(low){
        lowBox.innerHTML = `<p style="font-weight:600;color:var(--moss-dark);">Hoje o mínimo conta.</p>
          <p style="margin-top:4px;font-size:13.5px;">Deixei só o essencial na lista acima. Descanso também é cuidar do terreno.</p>
          <button class="linkbtn" id="showFullDayBtn" style="margin-top:8px;">ver o dia completo mesmo assim</button>`;
        document.getElementById('showFullDayBtn').addEventListener('click', ()=>{ state.showFullDay = t; saveState(); renderHome(); });
      }
    }

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
      cl.innerHTML = `<p style="margin-bottom:8px;">${dueOrLate.length} tarefa${dueOrLate.length>1?'s':''} pedindo atenção:</p>` +
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
