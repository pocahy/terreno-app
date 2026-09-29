// ============================================================
// AGENDA: conexão com Google Calendar, metas de aprendizado e
// geração de plano do dia seguinte com IA.
// ============================================================

let googleCalendarToken = null;

const CAL_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',     // ler seus compromissos
  'https://www.googleapis.com/auth/calendar.app.created'   // criar/editar só o calendário "Terreno"
];

async function getCalendarToken(force){
  if(googleCalendarToken && !force) return googleCalendarToken;
  const provider = new firebase.auth.GoogleAuthProvider();
  CAL_SCOPES.forEach(sc => provider.addScope(sc));
  const result = await auth.currentUser.reauthenticateWithPopup(provider);
  const credential = firebase.auth.GoogleAuthProvider.credentialFromResult(result);
  googleCalendarToken = credential.accessToken;
  return googleCalendarToken;
}

async function calApi(method, path, body){
  const token = await getCalendarToken();
  const res = await fetch('https://www.googleapis.com/calendar/v3' + path, {
    method,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  if(res.status === 401){ googleCalendarToken = null; throw new Error('token expirado'); }
  if(!res.ok && res.status !== 404 && res.status !== 410) throw new Error('Calendar API ' + res.status + ' ' + await res.text());
  if(res.status === 204 || method === 'DELETE') return null;
  return res.status === 404 || res.status === 410 ? null : res.json();
}

const userTZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';

async function ensureTerrenoCalendar(){
  if(state.terrenoCalendarId){
    const cal = await calApi('GET', '/calendars/' + encodeURIComponent(state.terrenoCalendarId));
    if(cal) return state.terrenoCalendarId;
  }
  const created = await calApi('POST', '/calendars', { summary:'Terreno', description:'Lembretes criados pelo app Terreno', timeZone:userTZ });
  state.terrenoCalendarId = created.id;
  saveState();
  return created.id;
}

async function clearEvents(calId, ids){
  for(const id of ids){
    try{ await calApi('DELETE', `/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(id)}`); }catch(e){ console.warn(e); }
  }
}

function eventBody(summary, date, time, durationMin, description, recurring){
  const end = minToHHMM(hhmmToMin(time) + durationMin);
  const ev = {
    summary,
    description: description || '',
    start: { dateTime: `${date}T${time}:00`, timeZone: userTZ },
    end:   { dateTime: `${date}T${end}:00`, timeZone: userTZ },
    reminders: { useDefault:false, overrides:[{ method:'popup', minutes:0 }] }
  };
  if(recurring) ev.recurrence = ['RRULE:FREQ=DAILY'];
  return ev;
}

async function syncRemindersToCalendar(){
  const status = document.getElementById('syncStatus');
  const say = t => { if(status) status.textContent = t; };
  try{
    say('Conectando com a Agenda Google...');
    const calId = await ensureTerrenoCalendar();
    say('Atualizando lembretes...');
    await clearEvents(calId, state.syncedReminderIds);
    const today = todayStr();
    const s = state.settings;
    const items = [];
    state.medications.forEach(m => (m.times||[]).forEach(t => items.push(['💊 ' + m.name + ' ' + m.dose, t, 'Marque a dose no Terreno depois de tomar.'])));
    items.push(['☀️ Luz natural', minToHHMM(hhmmToMin(s.wakeTime)+10), 'Uns minutos de luz do dia ajudam a acertar o relógio do sono.']);
    items.push(['☕ Último café do dia', s.caffeineCutoff, 'Depois disso, água ou descafeinado.']);
    items.push(['🌙 Hora de desacelerar', s.windDownTime, 'Luz mais baixa, telas de lado se der.']);
    const ids = [];
    for(const [title, time, desc] of items){
      const ev = await calApi('POST', `/calendars/${encodeURIComponent(calId)}/events`, eventBody(title, today, time, 10, desc, true));
      if(ev) ids.push(ev.id);
    }
    state.syncedReminderIds = ids;
    saveState();
    say(`${ids.length} lembretes diários criados no calendário "Terreno" ✓ — eles tocam pelo app do Google Agenda, mesmo com o Terreno fechado.`);
  }catch(e){
    console.error(e);
    say('Não consegui criar os lembretes agora. Tente de novo — se pedir permissão, aceite o acesso à Agenda.');
  }
}

async function sendPlanToCalendar(){
  const msg = document.getElementById('planSyncStatus');
  const say = t => { if(msg) msg.textContent = t; };
  const plan = state.tomorrowPlan;
  if(!plan || !plan.blocks || !plan.blocks.length){ say('Gere o plano primeiro.'); return; }
  try{
    say('Enviando para a Agenda...');
    const calId = await ensureTerrenoCalendar();
    await clearEvents(calId, state.planSyncedIds);
    const blocks = plan.blocks.filter(b => b.time && /^\d{1,2}:\d{2}$/.test(b.time));
    const ids = [];
    for(let i=0;i<blocks.length;i++){
      const b = blocks[i];
      if(b.type === 'compromisso') continue; // já está na sua agenda principal
      const next = blocks[i+1];
      const dur = next ? Math.max(5, hhmmToMin(next.time) - hhmmToMin(b.time)) : 30;
      const icon = b.type === 'estudo' ? '📚 ' : b.type === 'movimento' ? '🏃 ' : b.type === 'descanso' ? '🌿 ' : '▫️ ';
      const ev = await calApi('POST', `/calendars/${encodeURIComponent(calId)}/events`, eventBody(icon + b.title, plan.forDate || todayStr(), b.time.padStart(5,'0'), dur, b.detail, false));
      if(ev) ids.push(ev.id);
    }
    state.planSyncedIds = ids;
    saveState();
    say(`${ids.length} blocos enviados ao calendário "Terreno", com aviso no horário de cada um ✓`);
  }catch(e){
    console.error(e);
    say('Não consegui enviar agora. Tente de novo.');
  }
}

document.getElementById('connectCalendarBtn').addEventListener('click', async ()=>{
  const statusBox = document.getElementById('calendarStatus');
  statusBox.innerHTML = '<p>Conectando com o Google Calendar...</p>';
  try{
    await getCalendarToken(true);
    await fetchCalendarEvents();
  }catch(e){
    console.error(e);
    statusBox.innerHTML = '<p>Não consegui conectar agora. Tente de novo — se aparecer um aviso de "app não verificado", isso é esperado (é seu próprio app), pode continuar.</p>';
  }
});

async function fetchCalendarEvents(){
  const statusBox = document.getElementById('calendarStatus');
  if(!googleCalendarToken){
    statusBox.innerHTML = '<p>Conecte sua agenda do Google pra ver os compromissos de hoje e amanhã aqui.</p>';
    return;
  }
  statusBox.innerHTML = '<p>Buscando compromissos...</p>';
  try{
    const timeMin = new Date(); timeMin.setHours(0,0,0,0);
    const timeMax = new Date(timeMin); timeMax.setDate(timeMax.getDate()+2); // hoje + amanhã
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime`;
    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + googleCalendarToken } });
    if(!res.ok) throw new Error('Calendar API respondeu ' + res.status);
    const data = await res.json();
    const events = (data.items||[]).map(ev => ({
      summary: ev.summary || '(sem título)',
      start: ev.start.dateTime || ev.start.date,
      end: ev.end.dateTime || ev.end.date,
      allDay: !ev.start.dateTime
    }));
    state.calendarEvents = { fetchedAt: new Date().toISOString(), events };
    saveState();
    statusBox.innerHTML = `<p style="color:var(--moss-dark);font-weight:600;">Agenda conectada — atualizado agora.</p>`;
    renderCalendarEvents();
  }catch(e){
    console.error(e);
    statusBox.innerHTML = '<p>Não consegui buscar os compromissos agora. Toque em "Conectar/Atualizar" pra tentar de novo.</p>';
  }
}

function fmtEventTime(ev){
  if(ev.allDay) return 'dia todo';
  const d = new Date(ev.start);
  return d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
}

function renderCalendarEvents(){
  const box = document.getElementById('calendarEventsCard');
  if(!box) return;
  if(!state.calendarEvents || !state.calendarEvents.events || state.calendarEvents.events.length===0){
    box.innerHTML = '<div class="empty">Nenhum compromisso carregado ainda.</div>';
    return;
  }
  const today = todayStr();
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate()+1); return localDateStr(d); })();
  const groups = { [today]: [], [tomorrow]: [] };
  state.calendarEvents.events.forEach(ev=>{
    const ds = (ev.start||'').slice(0,10);
    if(groups[ds]) groups[ds].push(ev);
  });
  const label = (ds) => ds===today ? 'Hoje' : ds===tomorrow ? 'Amanhã' : ds;
  box.innerHTML = [today, tomorrow].map(ds => `
    <h3 style="margin-top:10px;">${label(ds)}</h3>
    ${groups[ds].length===0 ? '<div class="empty">Nenhum compromisso.</div>' :
      groups[ds].map(ev=>`<div class="task-row"><div class="info"><div class="name" style="font-size:13.5px;">${ev.summary}</div></div><div class="eyebrow">${fmtEventTime(ev)}</div></div>`).join('')}
  `).join('');
}

// ---------------------------------------------------------------
// METAS DE APRENDIZADO
// ---------------------------------------------------------------
function renderLearningGoals(){
  const box = document.getElementById('learningGoalsCard');
  if(!box) return;
  if(state.learningGoals.length===0){
    box.innerHTML = '<div class="empty">Nenhum tema cadastrado ainda.</div>';
    return;
  }
  box.innerHTML = state.learningGoals.map(g=>`
    <div class="task-row">
      <div class="info"><div class="name">${g.name}</div>${g.notes ? `<div class="when">${g.notes}</div>` : ''}</div>
      <button class="btn small ghost" data-del="${g.id}">Remover</button>
    </div>`).join('');
  box.querySelectorAll('[data-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      state.learningGoals = state.learningGoals.filter(g=>g.id!==btn.dataset.del);
      saveState(); renderLearningGoals();
    });
  });
}

document.getElementById('addLearningGoalBtn').addEventListener('click', ()=>{
  const name = prompt('O que você quer aprender?');
  if(!name) return;
  const notes = prompt('Alguma nota? (nível atual, foco específico — opcional)', '') || '';
  state.learningGoals.push({id:'lg'+Date.now(), name, notes});
  saveState(); renderLearningGoals();
});

// ---------------------------------------------------------------
// PLANO DE AMANHÃ COM IA
// ---------------------------------------------------------------
document.getElementById('genTomorrowPlanBtn').addEventListener('click', async ()=>{
  const box = document.getElementById('tomorrowPlanResults');
  box.innerHTML = '<div class="empty">Montando o plano de amanhã...</div>';
  try{
    if(!window.askGeminiForTomorrowPlan) throw new Error('IA ainda não configurada.');
    const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate()+1); return localDateStr(d); })();
    const tomorrowEvents = (state.calendarEvents && state.calendarEvents.events || [])
      .filter(ev => (ev.start||'').slice(0,10) === tomorrow);
    const recentEnergy = [0,1,2].map(i=>{ const d=new Date(); d.setDate(d.getDate()-i); return state.energyLog[localDateStr(d)]; }).filter(Boolean);
    const plan = await window.askGeminiForTomorrowPlan(tomorrowEvents, state.learningGoals, {
      wakeTime: state.settings.wakeTime,
      windDownTime: state.settings.windDownTime,
      pleasure: (typeof pleasureHabits==='function' ? pleasureHabits() : []).slice(0,3).map(p=>p.habit.name),
      energy: recentEnergy.length ? recentEnergy.reduce((a,b)=>a+b,0)/recentEnergy.length : null,
      cues: state.habits.filter(h=>h.cue).map(h=>`quando ${h.cue} → ${h.name}`)
    });
    if(!Array.isArray(plan) || plan.length===0){
      box.innerHTML = '<div class="empty">A IA não retornou um plano dessa vez. Tente de novo.</div>';
      return;
    }
    state.tomorrowPlan = { generatedAt: new Date().toISOString(), forDate: tomorrow, blocks: plan };
    saveState();
    renderTomorrowPlan();
  }catch(e){
    console.error(e);
    box.innerHTML = '<div class="empty">Não consegui montar o plano agora. Tente de novo em instantes.</div>';
  }
});

function renderTomorrowPlan(){
  const box = document.getElementById('tomorrowPlanResults');
  if(!box || !state.tomorrowPlan) return;
  const fd = state.tomorrowPlan.forDate;
  const label = fd === todayStr() ? 'Plano de hoje' : fd ? 'Plano de ' + parseLocalDate(fd).toLocaleDateString('pt-BR',{weekday:'long', day:'numeric', month:'long'}) : 'Plano';
  box.innerHTML = `<div class="eyebrow" style="margin-bottom:4px;">${label}</div>` + state.tomorrowPlan.blocks.map(b=>`
    <div class="task-row" style="align-items:flex-start;">
      <div class="task-status ${b.type==='estudo' ? 'soon' : b.type==='movimento' ? 'late' : 'ok'}"></div>
      <div class="info">
        <div class="name">${b.time} — ${b.title}</div>
        ${b.detail ? `<div class="when">${b.detail}</div>` : ''}
      </div>
    </div>`).join('') + `
    <div class="btn-row" style="margin-top:10px;"><button class="btn small secondary" id="sendPlanToCalendarBtn">📲 Enviar pra Agenda (com avisos)</button></div>
    <div id="planSyncStatus" style="margin-top:6px;font-size:12.5px;color:var(--ink-soft);"></div>`;
  document.getElementById('sendPlanToCalendarBtn').addEventListener('click', sendPlanToCalendar);
}
