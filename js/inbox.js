// ============================================================
// CAIXA DE ENTRADA ("descarrego mental"): botão + sempre visível,
// captura por texto ou voz, e triagem pela IA para o lugar certo
// do app (limpeza, compras, estudo, hábito, tarefa ou nota).
// ============================================================

let inboxSuggestions = {}; // id -> {category, title}

const INBOX_CATS = {
  limpeza: '🧹 Limpeza', compra: '🛒 Compras', estudo: '📚 Estudo',
  habito: '🔁 Hábito', tarefa: '✅ Tarefa', nota: '📝 Nota'
};

function openInbox(){
  document.getElementById('inboxModal').classList.add('open');
  renderInbox();
  setTimeout(()=> document.getElementById('inboxText').focus(), 50);
}
function closeInbox(){ document.getElementById('inboxModal').classList.remove('open'); }

function addInboxItem(text){
  text = (text||'').trim();
  if(!text) return;
  text.split(/\n+/).map(t=>t.trim()).filter(Boolean).forEach(t=>{
    state.inbox.push({ id:'ib'+Date.now()+Math.random().toString(36).slice(2,6), text:t, createdAt:new Date().toISOString(), status:'novo' });
  });
  saveState(); renderInbox(); renderHome();
}

function applySuggestion(id){
  const it = state.inbox.find(x=>x.id===id);
  const sug = inboxSuggestions[id];
  if(!it || !sug) return;
  const title = sug.title || it.text;
  switch(sug.category){
    case 'limpeza':
      state.cleaning.push({id:'c'+Date.now(), name:title, freq:7, lastDone:null, history:[], durations:[]});
      break;
    case 'compra':
      if(!state.shoppingList) state.shoppingList = { items:[], generatedAt: todayStr() };
      state.shoppingList.items.push({cat:'Da caixa de entrada', name:title, done:false});
      break;
    case 'estudo':
      state.learningGoals.push({id:'lg'+Date.now(), name:title, notes:''});
      break;
    case 'habito':
      state.habits.push({id:'h'+Date.now(), name:title, cue:''});
      break;
    case 'tarefa':
      it.text = title; it.status = 'tarefa'; it.done = false;
      delete inboxSuggestions[id];
      saveState(); renderAll(); renderInbox();
      return;
    default:
      it.text = title; it.status = 'nota';
      delete inboxSuggestions[id];
      saveState(); renderInbox();
      return;
  }
  state.inbox = state.inbox.filter(x=>x.id!==id);
  delete inboxSuggestions[id];
  saveState(); renderAll(); renderInbox();
}

function discardInbox(id){
  state.inbox = state.inbox.filter(x=>x.id!==id);
  delete inboxSuggestions[id];
  saveState(); renderInbox(); renderHome();
}

function toggleLooseTask(id){
  const it = state.inbox.find(x=>x.id===id);
  if(!it) return;
  it.done = !it.done;
  it.doneAt = it.done ? todayStr() : null;
  saveState(); renderInbox(); renderHome();
}

function renderInbox(){
  const list = document.getElementById('inboxList');
  if(!list) return;
  const novos = state.inbox.filter(x=>x.status==='novo');
  const tarefas = state.inbox.filter(x=>x.status==='tarefa' && (!x.done || x.doneAt===todayStr()));
  const notas = state.inbox.filter(x=>x.status==='nota');
  const row = (it, extra) => `<div class="task-row" style="align-items:flex-start;">
      <div class="info"><div class="name" style="font-size:13.5px;${it.done?'text-decoration:line-through;color:var(--ink-faint);':''}">${it.text}</div>${extra||''}</div>
      <button class="btn small ghost" data-discard="${it.id}">✕</button>
    </div>`;
  list.innerHTML =
    (novos.length ? `<div class="section-title" style="margin-top:4px;">Para organizar (${novos.length})</div>` +
      novos.map(it=>{
        const sug = inboxSuggestions[it.id];
        return row(it, sug ? `<div class="when">${INBOX_CATS[sug.category]||sug.category}: ${sug.title}
            <button class="linkbtn" data-apply="${it.id}">mandar pra lá</button></div>` : '');
      }).join('') +
      `<div class="btn-row" style="margin-top:8px;"><button class="btn small secondary" id="sortInboxBtn">🤖 Organizar com IA</button></div>
       <div id="sortInboxMsg" style="font-size:12.5px;margin-top:4px;color:var(--ink-soft);"></div>` : '<div class="empty" style="padding:12px;">Nada pendente pra organizar.</div>') +
    (tarefas.length ? `<div class="section-title">Tarefas soltas</div>` +
      tarefas.map(it=>`<div class="task-row"><div class="habit-toggle ${it.done?'on':''}" data-loose="${it.id}" style="width:30px;height:30px;"><svg viewBox="0 0 24 24"><polyline points="5 13 10 18 19 7"/></svg></div><div class="info"><div class="name" style="font-size:13.5px;${it.done?'text-decoration:line-through;color:var(--ink-faint);':''}">${it.text}</div></div><button class="btn small ghost" data-discard="${it.id}">✕</button></div>`).join('') : '') +
    (notas.length ? `<div class="section-title">Notas guardadas</div>` + notas.map(it=>row(it)).join('') : '');

  list.querySelectorAll('[data-discard]').forEach(b=> b.addEventListener('click', ()=> discardInbox(b.dataset.discard)));
  list.querySelectorAll('[data-apply]').forEach(b=> b.addEventListener('click', ()=> applySuggestion(b.dataset.apply)));
  list.querySelectorAll('[data-loose]').forEach(b=> b.addEventListener('click', ()=> toggleLooseTask(b.dataset.loose)));
  const sortBtn = document.getElementById('sortInboxBtn');
  if(sortBtn) sortBtn.addEventListener('click', sortInboxWithAI);
  const badge = document.getElementById('inboxBadge');
  if(badge){ badge.textContent = novos.length; badge.style.display = novos.length ? 'flex' : 'none'; }
}

async function sortInboxWithAI(){
  const msg = document.getElementById('sortInboxMsg');
  const novos = state.inbox.filter(x=>x.status==='novo');
  if(!novos.length) return;
  if(!window.askGeminiToSortInbox){ msg.textContent = 'A IA ainda está carregando — tente em alguns segundos.'; return; }
  msg.textContent = 'Organizando...';
  try{
    const res = await window.askGeminiToSortInbox(novos);
    (res||[]).forEach(r=>{ if(r && r.id) inboxSuggestions[r.id] = { category:r.category, title:r.title }; });
    renderInbox();
    const m2 = document.getElementById('sortInboxMsg');
    if(m2) m2.textContent = 'Confira as sugestões e toque em "mandar pra lá" nas que fizerem sentido.';
  }catch(e){
    console.error(e);
    msg.innerHTML = aiErrorHTML(e, 'organizar');
  }
}

// ---- eventos fixos ----
document.getElementById('inboxFab').addEventListener('click', openInbox);
document.getElementById('inboxClose').addEventListener('click', closeInbox);
document.getElementById('inboxModal').addEventListener('click', e=>{ if(e.target.id==='inboxModal') closeInbox(); });
document.getElementById('inboxSave').addEventListener('click', ()=>{
  const ta = document.getElementById('inboxText');
  addInboxItem(ta.value); ta.value=''; ta.focus();
});

// Ditado por voz (Chrome no Android tem reconhecimento de fala nativo)
(function setupVoice(){
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = document.getElementById('inboxMic');
  if(!Rec){ btn.style.display='none'; return; }
  let rec = null, listening = false;
  btn.addEventListener('click', ()=>{
    if(listening && rec){ rec.stop(); return; }
    rec = new Rec(); rec.lang = 'pt-BR'; rec.interimResults = false; rec.continuous = false;
    rec.onresult = e=>{
      const txt = Array.from(e.results).map(r=>r[0].transcript).join(' ');
      const ta = document.getElementById('inboxText');
      ta.value = (ta.value ? ta.value + '\n' : '') + txt;
    };
    rec.onend = ()=>{ listening=false; btn.textContent='🎤'; btn.classList.remove('rec'); };
    rec.onerror = ()=>{ listening=false; btn.textContent='🎤'; btn.classList.remove('rec'); };
    listening = true; btn.textContent='⏹'; btn.classList.add('rec');
    rec.start();
  });
})();
