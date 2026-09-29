// ============================================================
// ESTADO GLOBAL, ARMAZENAMENTO (FIRESTORE) E UTILITÁRIOS DE DATA
// Base compartilhada por todos os outros módulos.
// ============================================================

window.storage = {
    async get(key){
      const doc = await db.collection('users').doc(currentUser.uid).collection('data').doc(key).get();
      if(!doc.exists) throw new Error('chave não encontrada: '+key);
      return { key, value: doc.data().value, shared:false };
    },
    async set(key, value){
      await db.collection('users').doc(currentUser.uid).collection('data').doc(key).set({ value });
      return { key, value, shared:false };
    },
    async delete(key){
      await db.collection('users').doc(currentUser.uid).collection('data').doc(key).delete();
      return { key, deleted:true, shared:false };
    },
    async list(prefix){
      const snap = await db.collection('users').doc(currentUser.uid).collection('data').get();
      const keys = snap.docs.map(d=>d.id).filter(k => !prefix || k.startsWith(prefix));
      return { keys, prefix, shared:false };
    }
  };

const DEFAULT_TASKS = [
    {name:'Louça do dia', freq:1},
    {name:'Bancada da cozinha', freq:1},
    {name:'Lixo', freq:2},
    {name:'Banheiro', freq:7},
    {name:'Roupa de cama', freq:7},
    {name:'Passar pano no chão', freq:7},
    {name:'Geladeira por dentro', freq:30}
  ];

const DEFAULT_REWARDS = [
    {name:'Pedir um iFood', cost:150},
    {name:'Um fim de semana diferente', cost:500},
    {name:'Viagem de férias', cost:3000}
  ];

const DEFAULT_MEDS = [
    {name:'Ritalina LA', dose:'20mg', timesPerDay:1},
    {name:'Elifore', dose:'100mg', timesPerDay:1},
    {name:'Ativ B', dose:'1000mcg', timesPerDay:1},
    {name:'Vitamina D3', dose:'5.000 UI', timesPerDay:1}
  ];

const DEFAULT_HABITS = [
    {name:'Tomar água', cue:'eu sentar pra trabalhar'},
    {name:'Tomar a medicação', cue:'eu servir o café da manhã'},
    {name:'Luz natural nos primeiros 30 min do dia', cue:'eu acordar'},
    {name:'Movimento (mesmo 10 min)', cue:''},
    {name:'Higiene básica em dia', cue:''},
    {name:'Um cômodo arrumado', cue:''}
  ];

const SMALL_REWARDS = [
    {name:'Um café especial', cost:30},
    {name:'Um episódio sem culpa', cost:40}
  ];

const DEFAULT_SETTINGS = {
    wakeTime:'07:00', windDownTime:'22:30', caffeineCutoff:'14:00',
    notificationsOn:false, focoMin:25, pausaMin:5
  };

function defaultMedTimes(n){
    if(n<=1) return ['08:00'];
    if(n===2) return ['08:00','20:00'];
    if(n===3) return ['08:00','14:00','20:00'];
    return Array.from({length:n},(_,i)=>String(8+Math.floor(i*12/(n-1))).padStart(2,'0')+':00');
  }

const DEFAULT_LEARNING_GOALS = [
    {name:'Inglês', notes:''},
    {name:'Programar em Python', notes:''},
    {name:'Estatística', notes:''}
  ];

let state = {
    ingredients: [],
    foodGoal: 'geral',
    recipeFeedback: {},
    customRecipes: [], // receitas sugeridas pela IA e salvas pelo usuário
    points: 0,
    pointsLog: [], // { date, amount, reason }
    rewards: SMALL_REWARDS.concat(DEFAULT_REWARDS).map((r,i)=>({id:'rw'+i, name:r.name, cost:r.cost})),
    redemptions: [], // { id, name, cost, date }
    shoppingPrefs: null,
    shoppingList: null,
    cleaning: DEFAULT_TASKS.map((t,i)=>({id:'c'+i, name:t.name, freq:t.freq, lastDone:null, history:[], durations:[]})),
    habits: DEFAULT_HABITS.map((h,i)=>({id:'h'+i, name:h.name, cue:h.cue})),
    medications: DEFAULT_MEDS.map((m,i)=>({id:'m'+i, name:m.name, dose:m.dose, timesPerDay:m.timesPerDay, times:defaultMedTimes(m.timesPerDay)})),
    medCompletions: {}, // { 'YYYY-MM-DD': { medId: [true,false,...] } }
    completions: {}, // { 'YYYY-MM-DD': { habitId: true } }
    activeTimer: null, // { taskId, phase:'foco'|'pausa', phaseEndsAt, pomodorosCompleted, startedAt }
    learningGoals: DEFAULT_LEARNING_GOALS.map((g,i)=>({id:'lg'+i, name:g.name, notes:g.notes})),
    calendarEvents: null, // { fetchedAt, events: [...] } — cache da última busca no Google Calendar
    tomorrowPlan: null, // { generatedAt, forDate, blocks: [...] }
    settings: Object.assign({}, DEFAULT_SETTINGS),
    energyLog: {},      // { 'YYYY-MM-DD': 1..4 }
    feelings: {},       // { 'YYYY-MM-DD': { habitId: 'prazer'|'conquista' } }
    inbox: [],          // { id, text, createdAt, status:'novo'|'nota' }
    lastOpened: null,
    welcomeBack: null,  // { gap, date, dismissed }
    showFullDay: null,  // data em que a pessoa pediu pra ver o dia completo mesmo com energia baixa
    terrenoCalendarId: null,
    syncedReminderIds: [],
    planSyncedIds: [],
    migrations: {}
  };

function localDateStr(d){
    d = d || new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }

function parseLocalDate(s){
    const [y,m,d] = s.split('-').map(Number);
    return new Date(y, m-1, d);
  }

const todayStr = () => localDateStr(new Date());

const daysSince = (dateStr) => {
    if(!dateStr) return Infinity;
    return Math.round((parseLocalDate(todayStr()) - parseLocalDate(dateStr)) / 86400000);
  };

function nowHHMM(){
    const d = new Date();
    return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  }

function hhmmToMin(t){ const [h,m]=(t||'0:0').split(':').map(Number); return h*60+m; }
function minToHHMM(x){ x=Math.max(0,Math.min(23*60+59,x)); return String(Math.floor(x/60)).padStart(2,'0')+':'+String(x%60).padStart(2,'0'); }

async function loadState(){
    try{
      const res = await window.storage.get('terreno-app-data', false);
      if(res && res.value){
        const parsed = JSON.parse(res.value);
        state = Object.assign(state, parsed);
      }
    }catch(e){ /* first run, no data yet */ }
    // migração: garantir que toda tarefa de limpeza tenha um array de history
    state.cleaning = (state.cleaning||[]).map(t => ({
      ...t,
      history: t.history || (t.lastDone ? [t.lastDone] : []),
      durations: t.durations || []
    }));
    state.medications = state.medications || [];
    state.medCompletions = state.medCompletions || {};
    state.customRecipes = state.customRecipes || [];
    state.points = state.points || 0;
    state.pointsLog = state.pointsLog || [];
    state.rewards = state.rewards || DEFAULT_REWARDS.map((r,i)=>({id:'rw'+i, name:r.name, cost:r.cost}));
    state.redemptions = state.redemptions || [];
    state.learningGoals = state.learningGoals || DEFAULT_LEARNING_GOALS.map((g,i)=>({id:'lg'+i, name:g.name, notes:g.notes}));
    state.calendarEvents = state.calendarEvents || null;
    state.tomorrowPlan = state.tomorrowPlan || null;
    state.settings = Object.assign({}, DEFAULT_SETTINGS, state.settings||{});
    state.energyLog = state.energyLog || {};
    state.feelings = state.feelings || {};
    state.inbox = state.inbox || [];
    state.syncedReminderIds = state.syncedReminderIds || [];
    state.planSyncedIds = state.planSyncedIds || [];
    state.migrations = state.migrations || {};
    state.habits = (state.habits||[]).map(h => typeof h === 'string' ? {id:'h'+Math.random().toString(36).slice(2,8), name:h, cue:''} : Object.assign({cue:''}, h));
    state.medications = state.medications.map(m => Object.assign({}, m, {
      times: (m.times && m.times.length===m.timesPerDay) ? m.times : defaultMedTimes(m.timesPerDay)
    }));
    if(!state.migrations.v2SmallRewards){
      SMALL_REWARDS.forEach((r,i)=>{
        if(!state.rewards.some(x=>x.name===r.name)) state.rewards.unshift({id:'rws'+i+Date.now(), name:r.name, cost:r.cost});
      });
      state.migrations.v2SmallRewards = true;
    }
    if(!state.migrations.v2LightHabit){
      if(!state.habits.some(h=>/luz natural/i.test(h.name))) state.habits.push({id:'hl'+Date.now(), name:'Luz natural nos primeiros 30 min do dia', cue:'eu acordar'});
      state.migrations.v2LightHabit = true;
    }
    // boas-vindas depois de alguns dias fora (sem cobrança, só acolhimento)
    const today = todayStr();
    if(state.lastOpened && state.lastOpened !== today){
      const gap = daysSince(state.lastOpened);
      if(gap >= 3) state.welcomeBack = { gap, date: today, dismissed:false };
    }
    state.lastOpened = today;
    saveState();
    renderAll();
  }

let saveTimer=null;

let saveInFlight=false;

let pendingResave=false;

function showSaveStatus(kind){
    let el = document.getElementById('saveStatus');
    if(!el){
      el = document.createElement('div');
      el.id='saveStatus';
      el.style.cssText='position:fixed;bottom:82px;left:50%;transform:translateX(-50%);max-width:440px;width:calc(100% - 32px);z-index:20;text-align:center;font-size:12px;font-weight:600;padding:8px 14px;border-radius:999px;transition:opacity .3s;pointer-events:none;';
      document.body.appendChild(el);
    }
    clearTimeout(el._hideTimer);
    if(kind==='error'){
      el.textContent = 'Não foi consegui salvar agora — vou tentar de novo automaticamente.';
      el.style.background='var(--rose-pale)'; el.style.color='#7A4550'; el.style.opacity='1';
    } else if(kind==='retrying'){
      el.textContent = 'Tentando salvar novamente...';
      el.style.background='var(--mustard-pale)'; el.style.color='#7A5A17'; el.style.opacity='1';
    } else if(kind==='ok'){
      el.textContent = 'Salvo ✓';
      el.style.background='var(--moss-pale)'; el.style.color='var(--moss-dark)'; el.style.opacity='1';
      el._hideTimer = setTimeout(()=>{ el.style.opacity='0'; }, 1200);
    }
  }

async function attemptSave(payload, attempt){
    try{
      await window.storage.set('terreno-app-data', payload, false);
      showSaveStatus('ok');
    }catch(e){
      console.error('erro ao salvar (tentativa '+attempt+')', e);
      if(attempt < 3){
        showSaveStatus('retrying');
        await new Promise(r=>setTimeout(r, 800*attempt));
        return attemptSave(payload, attempt+1);
      }
      showSaveStatus('error');
    }
  }

function trimOldData(){
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-120);
    const cutoffStr = localDateStr(cutoff);
    state.cleaning.forEach(t=>{
      if(t.history && t.history.length>120){
        t.history = t.history.filter(d=>d>=cutoffStr);
      }
    });
    Object.keys(state.completions||{}).forEach(d=>{
      if(d < cutoffStr) delete state.completions[d];
    });
  }

function saveState(){
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async ()=>{
      if(saveInFlight){ pendingResave = true; return; }
      saveInFlight = true;
      trimOldData();
      const payload = JSON.stringify(state);
      await attemptSave(payload, 1);
      saveInFlight = false;
      if(pendingResave){ pendingResave = false; saveState(); }
    }, 250);
  }


// Mensagem clara para falhas da IA (Gemini), com o motivo real
function aiErrorHTML(e, what){
    const msg = (e && e.message) || '';
    let txt;
    if(!window.terrenoAIReady) txt = 'A IA ainda não carregou neste aparelho. Aguarde alguns segundos e tente de novo.';
    else if(/app check|appcheck|401|403/i.test(msg)) txt = 'Este aparelho não está autorizado a usar a IA. Vá em Mais → Dicas → "Ver código deste aparelho" e cadastre o código no Firebase (App Check → Gerenciar tokens de depuração).';
    else if(e && e.code === 'formato') txt = 'A IA respondeu num formato que não consegui ler. Tente de novo.';
    else if(/quota|429|resource.?exhausted/i.test(msg)) txt = 'Limite de uso gratuito da IA atingido por agora. Tente de novo mais tarde.';
    else if(/network|failed to fetch/i.test(msg)) txt = 'Sem conexão com a internet no momento.';
    else txt = 'Não consegui ' + (what||'falar com a IA') + ' agora.';
    return `<div class="empty" style="padding:14px;">${txt}<div style="font-size:11px;margin-top:6px;opacity:.8;">Detalhe técnico: ${(e && e.code) || ''} ${msg.slice(0,160)}</div></div>`;
  }
