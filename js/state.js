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
    'Tomar água',
    'Tomar a medicação',
    'Pegar um pouco de sol / sair de casa',
    'Movimento (mesmo 10 min)',
    'Higiene básica em dia',
    'Um cômodo arrumado'
  ];

let state = {
    ingredients: [],
    foodGoal: 'geral',
    recipeFeedback: {},
    customRecipes: [], // receitas sugeridas pela IA e salvas pelo usuário
    points: 0,
    pointsLog: [], // { date, amount, reason }
    rewards: DEFAULT_REWARDS.map((r,i)=>({id:'rw'+i, name:r.name, cost:r.cost})),
    redemptions: [], // { id, name, cost, date }
    shoppingPrefs: null,
    shoppingList: null,
    cleaning: DEFAULT_TASKS.map((t,i)=>({id:'c'+i, name:t.name, freq:t.freq, lastDone:null, history:[], durations:[]})),
    habits: DEFAULT_HABITS.map((h,i)=>({id:'h'+i, name:h})),
    medications: DEFAULT_MEDS.map((m,i)=>({id:'m'+i, name:m.name, dose:m.dose, timesPerDay:m.timesPerDay})),
    medCompletions: {}, // { 'YYYY-MM-DD': { medId: [true,false,...] } }
    completions: {}, // { 'YYYY-MM-DD': { habitId: true } }
    activeTimer: null // { taskId, phase:'foco'|'pausa', phaseEndsAt, pomodorosCompleted, startedAt }
  };

const todayStr = () => new Date().toISOString().slice(0,10);

const daysSince = (dateStr) => {
    if(!dateStr) return Infinity;
    const diff = (Date.now() - new Date(dateStr).getTime()) / 86400000;
    return Math.floor(diff);
  };

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
    const cutoffStr = cutoff.toISOString().slice(0,10);
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
