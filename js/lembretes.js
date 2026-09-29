// ============================================================
// LEMBRETES: notificações do app + agendador interno.
//
// Duas camadas:
// 1) Notificações do próprio app (service worker). Funcionam enquanto
//    o Terreno estiver aberto ou recém-minimizado — o Android pausa
//    apps web em segundo plano depois de um tempo.
// 2) Lembretes na Agenda Google (ver agenda.js → "Criar lembretes na
//    Agenda"). Esses chegam mesmo com o Terreno fechado, pelo app do
//    Google Agenda, sem precisar de servidor próprio.
// ============================================================

let swReg = null;

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').then(r=>{ swReg = r; }).catch(e=>console.warn('SW não registrado:', e));
}

async function enableNotifications(){
  if(!('Notification' in window)){
    alert('Este navegador não suporta notificações.');
    return;
  }
  const perm = await Notification.requestPermission();
  state.settings.notificationsOn = perm === 'granted';
  saveState();
  renderSettings();
  if(perm === 'granted') notify('Notificações ativadas 🌿', 'Vou te avisar de remédios, pausas e compromissos enquanto o Terreno estiver aberto.');
  else alert('Permissão negada. Dá pra liberar depois nas configurações do Chrome → Configurações do site → Notificações.');
}

function notify(title, body){
  if(!state.settings || !state.settings.notificationsOn) return;
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  const opts = { body, icon:'icon-192.png', badge:'icon-192.png', tag: title, renotify:true };
  try{
    if(swReg && swReg.showNotification) swReg.showNotification(title, opts);
    else new Notification(title, opts);
  }catch(e){ console.warn('notificação falhou', e); }
}

// ---------------------------------------------------------------
// Agendador interno: roda a cada 30s enquanto o app está aberto.
// Cada lembrete dispara no máximo uma vez por dia.
// ---------------------------------------------------------------
function firedKey(){ return 'terreno-fired-' + todayStr(); }
function getFired(){ try{ return JSON.parse(localStorage.getItem(firedKey())||'[]'); }catch(e){ return []; } }
function markFired(id){ const f = getFired(); f.push(id); try{ localStorage.setItem(firedKey(), JSON.stringify(f)); }catch(e){} }

function checkReminders(){
  if(!state || !state.settings) return;
  const now = hhmmToMin(nowHHMM());
  const fired = getFired();
  const once = (id, windowMin, atMin, title, body)=>{
    if(fired.includes(id)) return;
    if(now >= atMin && now <= atMin + windowMin){ markFired(id); notify(title, body); }
  };

  // Remédios: avisa no horário se a dose ainda não foi marcada (janela de 3h)
  state.medications.forEach(m=>{
    (m.times||[]).forEach((t,i)=>{
      if(medDosesToday(m.id)[i]) return;
      once('med:'+m.id+':'+i, 180, hhmmToMin(t), '💊 Hora do remédio', `${m.name} ${m.dose} (${t})`);
    });
  });

  const s = state.settings;
  once('light', 60, hhmmToMin(s.wakeTime) + 10, '☀️ Luz natural', 'Uns minutos de luz do dia agora ajudam a acertar o relógio do sono.');
  once('caffeine', 30, hhmmToMin(s.caffeineCutoff), '☕ Último café do dia', 'Depois disso, prefira água ou descafeinado — seu sono agradece.');
  once('winddown', 30, hhmmToMin(s.windDownTime), '🌙 Hora de desacelerar', 'Luz mais baixa e telas de lado, se der. Amanhã começa daqui.');

  // Compromissos da agenda: 10 min antes
  const today = todayStr();
  ((state.calendarEvents && state.calendarEvents.events) || []).forEach(ev=>{
    if(ev.allDay || (ev.start||'').slice(0,10) !== today) return;
    const d = new Date(ev.start);
    const startMin = d.getHours()*60 + d.getMinutes();
    once('ev:'+ev.start+ev.summary, 10, startMin - 10, '📅 Em 10 minutos', ev.summary);
  });

  // Blocos do plano do dia (gerado na véspera)
  const plan = state.tomorrowPlan;
  if(plan && plan.forDate === today){
    plan.blocks.forEach((b,i)=>{
      if(b.type === 'compromisso' || !b.time) return;
      once('plan:'+i, 10, hhmmToMin(b.time), (b.type==='estudo'?'📚 ':(b.type==='movimento'?'🏃 ':'🌿 ')) + b.title, b.detail || 'Hora do próximo bloco.');
    });
  }
}

let reminderInterval = null;
function startReminderLoop(){
  clearInterval(reminderInterval);
  checkReminders();
  reminderInterval = setInterval(checkReminders, 30000);
}

// ---------------------------------------------------------------
// Ajustes (sono, cafeína, notificações, agenda)
// ---------------------------------------------------------------
function renderSettings(){
  const box = document.getElementById('settingsCard');
  if(!box) return;
  const s = state.settings;
  const perm = ('Notification' in window) ? Notification.permission : 'indisponível';
  box.innerHTML = `
    <div class="setting-row"><label for="setWake">Horário fixo de acordar</label><input type="time" id="setWake" value="${s.wakeTime}"></div>
    <div class="setting-row"><label for="setCaffeine">Último café do dia</label><input type="time" id="setCaffeine" value="${s.caffeineCutoff}"></div>
    <div class="setting-row"><label for="setWind">Começar a desacelerar</label><input type="time" id="setWind" value="${s.windDownTime}"></div>
    <p style="font-size:12px;margin:6px 0 12px;">Esses horários também guiam o plano de amanhã da IA. Qualquer mudança no horário da Ritalina vale conversar antes com seu psiquiatra.</p>
    <div class="btn-row">
      <button class="btn small ${s.notificationsOn && perm==='granted' ? 'secondary' : ''}" id="enableNotifBtn">${s.notificationsOn && perm==='granted' ? '🔔 Notificações ativas' : '🔔 Ativar notificações'}</button>
      <button class="btn small secondary" id="syncRemindersBtn">📲 Criar lembretes na Agenda Google</button>
    </div>
    <div id="syncStatus" style="margin-top:8px;font-size:12.5px;color:var(--ink-soft);">
      ${state.syncedReminderIds.length ? `${state.syncedReminderIds.length} lembretes ativos no calendário "Terreno". Toque de novo depois de mudar horários.` : 'Os lembretes da Agenda chegam mesmo com o Terreno fechado.'}
    </div>`;
  const bind = (id, key)=> document.getElementById(id).addEventListener('change', e=>{ state.settings[key] = e.target.value; saveState(); });
  bind('setWake','wakeTime'); bind('setCaffeine','caffeineCutoff'); bind('setWind','windDownTime');
  document.getElementById('enableNotifBtn').addEventListener('click', enableNotifications);
  document.getElementById('syncRemindersBtn').addEventListener('click', ()=> syncRemindersToCalendar());
}
