// ============================================================
// LIMPEZA: tarefas, temporizador Pomodoro, histórico e gráfico.
// ============================================================

const CLEANING_TIPS = [
    {name:'Cozinha', query:'como organizar a cozinha rapido rotina de limpeza'},
    {name:'Banheiro', query:'limpeza rapida banheiro rotina diaria'},
    {name:'Quarto/roupas', query:'organizar quarto bagunçado metodo rapido'},
    {name:'Manutenção geral', query:'rotina de limpeza para quem tem TDAH'}
  ];

const FOCO_MIN = 25, PAUSA_MIN = 5;

let timerInterval = null;

function beep(){
    try{
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.16, ctx.currentTime);
      o.start(); o.stop(ctx.currentTime + 0.35);
    }catch(e){}
  }

function fmtClock(ms){
    const s = Math.max(0, Math.round(ms/1000));
    const m = Math.floor(s/60), r = s%60;
    return String(m).padStart(2,'0') + ':' + String(r).padStart(2,'0');
  }

function startPomodoro(taskId){
    const now = Date.now();
    state.activeTimer = {
      taskId,
      phase: 'foco',
      phaseEndsAt: now + FOCO_MIN*60000,
      pomodorosCompleted: 0,
      startedAt: now
    };
    saveState();
    renderPomodoro();
    startTicker();
  }

function startTicker(){
    clearInterval(timerInterval);
    timerInterval = setInterval(()=>{
      if(!state.activeTimer) { clearInterval(timerInterval); return; }
      const remaining = state.activeTimer.phaseEndsAt - Date.now();
      if(remaining <= 0){
        beep();
        if(state.activeTimer.phase === 'foco'){
          state.activeTimer.pomodorosCompleted += 1;
          state.activeTimer.phase = 'pausa';
          state.activeTimer.phaseEndsAt = Date.now() + PAUSA_MIN*60000;
        } else {
          state.activeTimer.phase = 'foco';
          state.activeTimer.phaseEndsAt = Date.now() + FOCO_MIN*60000;
        }
        saveState();
      }
      updateTimerDisplay();
    }, 1000);
  }

function updateTimerDisplay(){
    const disp = document.getElementById('timerClock');
    if(!disp || !state.activeTimer) return;
    disp.textContent = fmtClock(state.activeTimer.phaseEndsAt - Date.now());
    const phaseEl = document.getElementById('timerPhaseLabel');
    if(phaseEl){
      phaseEl.textContent = state.activeTimer.phase === 'foco' ? '🎯 Foco' : '☕ Pausa';
      phaseEl.className = 'timer-phase ' + state.activeTimer.phase;
    }
    const countEl = document.getElementById('timerCount');
    if(countEl) countEl.textContent = `${state.activeTimer.pomodorosCompleted} pomodoro${state.activeTimer.pomodorosCompleted===1?'':'s'} completo${state.activeTimer.pomodorosCompleted===1?'':'s'}`;
  }

function finishPomodoroTask(){
    const at = state.activeTimer;
    if(!at) return;
    const task = state.cleaning.find(t=>t.id===at.taskId);
    const totalMinutes = Math.max(1, Math.round((Date.now() - at.startedAt)/60000));
    if(task){
      task.durations = task.durations || [];
      task.durations.push({date: todayStr(), minutes: totalMinutes, pomodoros: at.pomodorosCompleted});
      const today = todayStr();
      task.history = task.history || [];
      if(!task.history.includes(today)) task.history.push(today);
      task.lastDone = today;
    }
    addPoints(POINTS.cleaning + POINTS.pomodoro * Math.max(at.pomodorosCompleted,1), 'pomodoro: '+(task?task.name:'tarefa'));
    state.activeTimer = null;
    clearInterval(timerInterval);
    saveState();
    renderPomodoro(); renderCleaning(); renderHeader(); renderHome(); renderRewards();
  }

function cancelPomodoro(){
    state.activeTimer = null;
    clearInterval(timerInterval);
    saveState();
    renderPomodoro();
  }

function renderPomodoro(){
    const card = document.getElementById('pomodoroCard');
    if(!card) return;
    const at = state.activeTimer;
    if(!at){
      if(state.cleaning.length===0){
        card.innerHTML = '<div class="empty">Adicione uma tarefa de limpeza primeiro.</div>';
        return;
      }
      card.innerHTML = `
        <p style="margin-bottom:8px;">Escolha uma tarefa e cuide dela em blocos de 25 min de foco + 5 min de pausa.</p>
        <select class="tselect" id="pomodoroTaskSelect">
          ${state.cleaning.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}
        </select>
        <div class="btn-row" style="margin-top:10px;">
          <button class="btn" id="startPomodoroBtn">▶ Iniciar Pomodoro</button>
        </div>`;
      document.getElementById('startPomodoroBtn').addEventListener('click', ()=>{
        const taskId = document.getElementById('pomodoroTaskSelect').value;
        startPomodoro(taskId);
      });
      return;
    }
    const task = state.cleaning.find(t=>t.id===at.taskId);
    card.innerHTML = `
      <div class="timer-center">
        <div class="eyebrow">${task ? task.name : 'tarefa'}</div>
        <div class="timer-phase ${at.phase}" id="timerPhaseLabel">${at.phase==='foco'?'🎯 Foco':'☕ Pausa'}</div>
        <div class="timer-display" id="timerClock">${fmtClock(at.phaseEndsAt - Date.now())}</div>
        <div class="timer-sub" id="timerCount">${at.pomodorosCompleted} pomodoro${at.pomodorosCompleted===1?'':'s'} completo${at.pomodorosCompleted===1?'':'s'}</div>
        <div class="btn-row" style="margin-top:6px;">
          <button class="btn small secondary" id="finishPomodoroBtn">Concluir tarefa</button>
          <button class="btn small ghost" id="cancelPomodoroBtn">Cancelar</button>
        </div>
      </div>`;
    document.getElementById('finishPomodoroBtn').addEventListener('click', finishPomodoroTask);
    document.getElementById('cancelPomodoroBtn').addEventListener('click', cancelPomodoro);
    startTicker();
  }

function renderTimeHistory(){
    const box = document.getElementById('timeHistoryCard');
    if(!box) return;
    const withTime = state.cleaning.filter(t => t.durations && t.durations.length);
    if(withTime.length===0){
      box.innerHTML = '<div class="empty">Use o temporizador em alguma tarefa pra começar a comparar os tempos.</div>';
      return;
    }
    box.innerHTML = withTime.map(t=>{
      const avg = Math.round(t.durations.reduce((a,d)=>a+d.minutes,0)/t.durations.length);
      const last = t.durations.slice(-4).reverse().map(d=>d.minutes+'min').join(' · ');
      return `<div class="task-row">
        <div class="info">
          <div class="name">${t.name}</div>
          <div class="when">média ${avg} min · últimas: ${last}</div>
        </div>
      </div>`;
    }).join('');
  }

function renderCleaning(){
    const card = document.getElementById('cleaningCard');
    if(state.cleaning.length===0){
      card.innerHTML = '<div class="empty">Nenhuma tarefa ainda. Adicione uma abaixo.</div>';
    } else {
      const t = todayStr();
      card.innerHTML = state.cleaning.map(t2=>{
        const ds = daysSince(t2.lastDone);
        const remaining = t2.freq - ds;
        const doneToday = t2.lastDone === t;
        let status='ok', when=`em dia · próxima em ${remaining} dia${remaining===1?'':'s'}`;
        if(remaining<=0){ status='late'; when = t2.lastDone ? `atrasada há ${Math.abs(remaining)} dia${Math.abs(remaining)===1?'':'s'}` : 'ainda não feita'; }
        else if(remaining<=1){ status='soon'; when='vence hoje/amanhã'; }
        if(doneToday){ status='ok'; when='feita hoje ✓'; }
        return `<div class="task-row">
          <div class="task-status ${status}"></div>
          <div class="info"><div class="name">${t2.name}</div><div class="when">${when}</div></div>
          <div class="btn-row">
            ${doneToday
              ? `<button class="btn small ghost" data-undo="${t2.id}">Desfazer</button>`
              : `<button class="btn small secondary" data-done="${t2.id}">Feito</button>`}
          </div>
        </div>`;
      }).join('');
      card.querySelectorAll('button[data-done]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const task = state.cleaning.find(t2=>t2.id===btn.dataset.done);
          const today = todayStr();
          if(!task.history.includes(today)) task.history.push(today);
          task.lastDone = today;
          addPoints(POINTS.cleaning, 'limpeza: '+task.name);
          saveState(); renderCleaning(); renderHeader(); renderHome(); renderRewards();
        });
      });
      card.querySelectorAll('button[data-undo]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const task = state.cleaning.find(t2=>t2.id===btn.dataset.undo);
          const today = todayStr();
          task.history = task.history.filter(d=>d!==today);
          task.lastDone = task.history.length ? task.history[task.history.length-1] : null;
          addPoints(-POINTS.cleaning, 'limpeza desfeita: '+task.name);
          saveState(); renderCleaning(); renderHeader(); renderHome(); renderRewards();
        });
      });
    }

    const tipsCard = document.getElementById('cleaningTipsCard');
    tipsCard.innerHTML = CLEANING_TIPS.map(t=>`
      <div class="task-row" style="align-items:center;">
        <div class="info"><div class="name">${t.name}</div><div class="when">buscar vídeos e dicas no YouTube</div></div>
        <a class="btn small secondary" style="text-decoration:none;" target="_blank" rel="noopener"
           href="https://www.youtube.com/results?search_query=${encodeURIComponent(t.query)}">Buscar</a>
      </div>`).join('');

    renderCleaningChart();
    renderTimeHistory();
  }

function renderCleaningChart(){
    const box = document.getElementById('cleaningChart');
    if(!box) return;
    const DAYS = 14;
    const days = [];
    for(let i=DAYS-1;i>=0;i--){
      const d = new Date(); d.setDate(d.getDate()-i);
      days.push(d.toISOString().slice(0,10));
    }
    const counts = days.map(ds => state.cleaning.reduce((acc,t)=> acc + (t.history && t.history.includes(ds) ? 1 : 0), 0));
    const max = Math.max(1, ...counts);
    const total7 = counts.slice(-7).reduce((a,b)=>a+b,0);

    const barW = 18, gap = 6, chartH = 90;
    const svgW = days.length * (barW+gap);
    const bars = counts.map((c,i)=>{
      const h = Math.round((c/max) * chartH);
      const x = i*(barW+gap);
      const y = chartH - h;
      const d = new Date(days[i]);
      const isToday = days[i] === todayStr();
      return `<rect x="${x}" y="${y}" width="${barW}" height="${Math.max(h,2)}" rx="4"
        fill="${isToday ? 'var(--mustard)' : 'var(--moss)'}" opacity="${c===0?0.25:1}"></rect>
        ${ (i % 2 === 0) ? `<text x="${x+barW/2}" y="${chartH+14}" font-size="9" fill="var(--ink-faint)" text-anchor="middle" font-family="Work Sans, sans-serif">${d.getDate()}</text>` : ''}`;
    }).join('');

    box.innerHTML = `
      <p style="margin-bottom:2px;"><strong style="color:var(--ink);">${total7}</strong> tarefas concluídas nos últimos 7 dias</p>
      <div style="overflow-x:auto;margin-top:10px;">
        <svg width="${svgW}" height="${chartH+22}" viewBox="0 0 ${svgW} ${chartH+22}">${bars}</svg>
      </div>
      <p style="font-size:11.5px;margin-top:4px;">últimos 14 dias · barra em destaque = hoje</p>`;
  }

document.getElementById('addTaskBtn').addEventListener('click', ()=>{
    const name = prompt('Nome da nova tarefa:');
    if(!name) return;
    const freq = parseInt(prompt('A cada quantos dias repetir? (ex: 7)', '7')) || 7;
    state.cleaning.push({id:'c'+Date.now(), name, freq, lastDone:null, history:[], durations:[]});
    saveState(); renderCleaning(); renderHome(); renderPomodoro();
  });
