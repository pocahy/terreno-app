// ============================================================
// LIMPEZA: tarefas, temporizador Pomodoro, histórico e gráfico.
// ============================================================

const CLEANING_TIPS = [
    {name:'Cozinha', query:'como organizar a cozinha rapido rotina de limpeza'},
    {name:'Banheiro', query:'limpeza rapida banheiro rotina diaria'},
    {name:'Quarto/roupas', query:'organizar quarto bagunçado metodo rapido'},
    {name:'Manutenção geral', query:'rotina de limpeza para quem tem TDAH'}
  ];

const DURATION_PRESETS = [
    {foco:15, pausa:5, label:'15/5'},
    {foco:25, pausa:5, label:'25/5'},
    {foco:45, pausa:10, label:'45/10'}
  ];

const COMPANION_LINES = [
    'Estou aqui com você. Só esse bloco.',
    'Você já começou — essa é a parte mais difícil.',
    'Uma coisa de cada vez. Tá indo.',
    'Se a cabeça fugiu, tudo bem: volta pro próximo passo pequeno.',
    'Seguimos juntos até o fim desse bloco.',
    'Respira. Ombros soltos. Continua no seu ritmo.'
  ];

const MOVE_LINES = [
    'Levanta e se mexe: alonga os braços, gira os ombros.',
    'Bebe um copo de água e anda até a janela.',
    'Faz 10 polichinelos ou sobe e desce um lance de escada.',
    'Alonga o pescoço e as costas. Olha pra longe por um minuto.'
  ];

const RING_C = 2 * Math.PI * 80; // circunferência do anel do timer (r=80)

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

function avgRealMinutes(task){
    if(!task || !task.durations || !task.durations.length) return null;
    return Math.round(task.durations.reduce((a,d)=>a+d.minutes,0)/task.durations.length);
  }

function startPomodoro(taskId, opts){
    const now = Date.now();
    const foco = opts.foco, pausa = opts.pausa;
    state.activeTimer = {
      taskId,
      phase: 'foco',
      focoMin: foco, pausaMin: pausa,
      phaseTotalMs: foco*60000,
      phaseEndsAt: now + foco*60000,
      pomodorosCompleted: 0,
      startedAt: now,
      estimate: opts.estimate || null,
      companion: !!opts.companion
    };
    saveState();
    renderPomodoro();
    startTicker();
  }

function startTicker(){
    clearInterval(timerInterval);
    timerInterval = setInterval(()=>{
      const at = state.activeTimer;
      if(!at) { clearInterval(timerInterval); return; }
      const foco = at.focoMin || 25, pausa = at.pausaMin || 5;
      const remaining = at.phaseEndsAt - Date.now();
      if(remaining <= 0){
        beep();
        if(at.phase === 'foco'){
          at.pomodorosCompleted += 1;
          at.phase = 'pausa';
          at.phaseTotalMs = pausa*60000;
          at.phaseEndsAt = Date.now() + pausa*60000;
          if(typeof notify==='function') notify('☕ Pausa de '+pausa+' min', MOVE_LINES[at.pomodorosCompleted % MOVE_LINES.length]);
        } else {
          at.phase = 'foco';
          at.phaseTotalMs = foco*60000;
          at.phaseEndsAt = Date.now() + foco*60000;
          if(typeof notify==='function') notify('🎯 Voltando ao foco', 'Mais um bloco de '+foco+' min.');
        }
        saveState();
        renderPomodoro();
        return;
      }
      updateTimerDisplay();
    }, 1000);
  }

function updateTimerDisplay(){
    const at = state.activeTimer;
    if(!at) return;
    const remaining = Math.max(0, at.phaseEndsAt - Date.now());
    const total = at.phaseTotalMs || ((at.phase==='foco' ? (at.focoMin||25) : (at.pausaMin||5)) * 60000);
    const frac = Math.max(0, Math.min(1, remaining/total));
    const ring = document.getElementById('timerRingFg');
    if(ring) ring.style.strokeDashoffset = RING_C * (1 - frac);
    const disp = document.getElementById('timerClock');
    if(disp) disp.textContent = fmtClock(remaining);
    const comp = document.getElementById('timerCompanion');
    if(comp && at.companion && at.phase==='foco'){
      const idx = Math.floor((Date.now() - at.startedAt) / (5*60000)) % COMPANION_LINES.length;
      comp.textContent = COMPANION_LINES[idx];
    }
  }

function finishPomodoroTask(){
    const at = state.activeTimer;
    if(!at) return;
    const task = state.cleaning.find(t=>t.id===at.taskId);
    const totalMinutes = Math.max(1, Math.round((Date.now() - at.startedAt)/60000));
    if(task){
      task.durations = task.durations || [];
      task.durations.push({date: todayStr(), minutes: totalMinutes, pomodoros: at.pomodorosCompleted, estimate: at.estimate || null});
      const today = todayStr();
      task.history = task.history || [];
      if(!task.history.includes(today)) task.history.push(today);
      task.lastDone = today;
    }
    addPoints(POINTS.cleaning + POINTS.pomodoro * Math.max(at.pomodorosCompleted,1), 'pomodoro: '+(task?task.name:'tarefa'));
    const est = at.estimate;
    state.activeTimer = null;
    clearInterval(timerInterval);
    saveState();
    renderPomodoro(); renderCleaning(); renderHeader(); renderHome(); renderRewards();
    if(est){
      const box = document.getElementById('pomodoroCard');
      if(box) box.insertAdjacentHTML('afterbegin', `<div class="callout mustard" style="margin-bottom:12px;"><strong>Você estimou ${est} min e levou ${totalMinutes} min</strong>Sem julgamento — é assim que o cérebro calibra a noção de tempo.</div>`);
    }
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
      const curFoco = state.settings.focoMin || 25;
      card.innerHTML = `
        <p style="margin-bottom:8px;">Escolha a tarefa e o tamanho do bloco. Em dias pesados, 15 min já é ótimo.</p>
        <select class="tselect" id="pomodoroTaskSelect">
          ${state.cleaning.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}
        </select>
        <div class="quiz-options" id="durationChips" style="margin-top:10px;">
          ${DURATION_PRESETS.map(p=>`<button class="qopt ${p.foco===curFoco?'selected':''}" data-foco="${p.foco}" data-pausa="${p.pausa}">${p.label}</button>`).join('')}
        </div>
        <label class="eyebrow" style="display:block;margin-top:10px;">quanto você acha que vai levar?</label>
        <select class="tselect" id="pomodoroEstimate" style="margin-top:4px;">
          <option value="">Prefiro não chutar</option>
          ${[5,10,15,20,30,45,60,90].map(m=>`<option value="${m}">${m} min</option>`).join('')}
        </select>
        <div class="timer-sub" id="estimateHint" style="margin-top:4px;"></div>
        <label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:13.5px;color:var(--ink-soft);">
          <input type="checkbox" id="pomodoroCompanion"> Com companhia (mensagens de presença durante o bloco)
        </label>
        <div class="btn-row" style="margin-top:12px;">
          <button class="btn" id="startPomodoroBtn">▶ Começar</button>
          <a class="btn small ghost" href="https://www.focusmate.com" target="_blank" rel="noopener" style="text-decoration:none;">Sessão ao vivo no Focusmate ↗</a>
        </div>`;
      const sel = document.getElementById('pomodoroTaskSelect');
      const hint = ()=>{
        const avg = avgRealMinutes(state.cleaning.find(t=>t.id===sel.value));
        document.getElementById('estimateHint').textContent = avg ? `Sua média real nessa tarefa: ${avg} min.` : '';
      };
      sel.addEventListener('change', hint); hint();
      card.querySelectorAll('#durationChips .qopt').forEach(b=>{
        b.addEventListener('click', ()=>{
          card.querySelectorAll('#durationChips .qopt').forEach(x=>x.classList.remove('selected'));
          b.classList.add('selected');
          state.settings.focoMin = parseInt(b.dataset.foco);
          state.settings.pausaMin = parseInt(b.dataset.pausa);
          saveState();
        });
      });
      document.getElementById('startPomodoroBtn').addEventListener('click', ()=>{
        startPomodoro(sel.value, {
          foco: state.settings.focoMin || 25,
          pausa: state.settings.pausaMin || 5,
          estimate: parseInt(document.getElementById('pomodoroEstimate').value) || null,
          companion: document.getElementById('pomodoroCompanion').checked
        });
      });
      return;
    }
    const task = state.cleaning.find(t=>t.id===at.taskId);
    const isFoco = at.phase==='foco';
    const ringColor = isFoco ? 'var(--moss)' : 'var(--mustard)';
    card.innerHTML = `
      <div class="timer-center">
        <div class="eyebrow">${task ? task.name : 'tarefa'}</div>
        <div class="timer-ring-wrap">
          <svg width="190" height="190" viewBox="0 0 190 190">
            <circle cx="95" cy="95" r="80" fill="none" stroke="var(--surface-2)" stroke-width="16"/>
            <circle id="timerRingFg" cx="95" cy="95" r="80" fill="none" stroke="${ringColor}" stroke-width="16" stroke-linecap="round"
              stroke-dasharray="${RING_C}" stroke-dashoffset="0" transform="rotate(-90 95 95)" style="transition:stroke-dashoffset 1s linear;"/>
          </svg>
          <div class="timer-ring-label">
            <div class="timer-phase ${at.phase}">${isFoco?'🎯 Foco':'☕ Pausa'}</div>
            <div class="timer-small-clock" id="timerClock">${fmtClock(at.phaseEndsAt - Date.now())}</div>
          </div>
        </div>
        ${isFoco
          ? (at.companion ? `<div class="companion-line" id="timerCompanion">${COMPANION_LINES[0]}</div>` : '')
          : `<div class="companion-line">${MOVE_LINES[at.pomodorosCompleted % MOVE_LINES.length]}</div>`}
        <div class="timer-sub">${at.pomodorosCompleted} bloco${at.pomodorosCompleted===1?'':'s'} completo${at.pomodorosCompleted===1?'':'s'} · ${at.focoMin||25}/${at.pausaMin||5}${at.estimate?` · estimativa ${at.estimate} min`:''}</div>
        <div class="btn-row" style="margin-top:6px;">
          <button class="btn small secondary" id="finishPomodoroBtn">Concluir tarefa</button>
          <button class="btn small ghost" id="cancelPomodoroBtn">Cancelar</button>
        </div>
      </div>`;
    document.getElementById('finishPomodoroBtn').addEventListener('click', finishPomodoroTask);
    document.getElementById('cancelPomodoroBtn').addEventListener('click', cancelPomodoro);
    updateTimerDisplay();
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
    const estimated = [];
    withTime.forEach(t=>t.durations.forEach(d=>{ if(d.estimate) estimated.push(d); }));
    let calib = '';
    if(estimated.length >= 3){
      const ratio = estimated.reduce((a,d)=>a + d.minutes/d.estimate, 0) / estimated.length;
      const r = ratio.toFixed(1).replace('.',',');
      calib = `<div class="callout mustard" style="margin-bottom:10px;"><strong>Sua calibragem de tempo</strong>${
        ratio > 1.15 ? `Em média você leva ${r}x o que estima. Vale somar essa folga ao planejar.` :
        ratio < 0.85 ? `Em média você leva ${r}x o que estima — suas tarefas costumam ser mais rápidas do que parecem.` :
        'Suas estimativas estão bem próximas do tempo real.'}</div>`;
    }
    box.innerHTML = calib + withTime.map(t=>{
      const avg = avgRealMinutes(t);
      const last = t.durations.slice(-4).reverse().map(d=> d.estimate ? `${d.minutes}min (chute ${d.estimate})` : d.minutes+'min').join(' · ');
      return `<div class="task-row">
        <div class="info">
          <div class="name">${t.name}</div>
          <div class="when">média ${avg} min · últimas: ${last}</div>
        </div>
      </div>`;
    }).join('');
  }

function markCleaningDone(taskId){
    const task = state.cleaning.find(t2=>t2.id===taskId);
    if(!task) return;
    const today = todayStr();
    if(!task.history.includes(today)) task.history.push(today);
    task.lastDone = today;
    addPoints(POINTS.cleaning, 'limpeza: '+task.name);
    saveState(); renderCleaning(); renderHeader(); renderHome(); renderRewards();
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
        if(remaining<=0){ status='late'; when = t2.lastDone ? `pedindo atenção há ${Math.abs(remaining)} dia${Math.abs(remaining)===1?'':'s'}` : 'ainda não feita'; }
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
        btn.addEventListener('click', ()=> markCleaningDone(btn.dataset.done));
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
      days.push(localDateStr(d));
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
      const d = parseLocalDate(days[i]);
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
