// ============================================================
// INICIALIZAÇÃO: agrega todos os módulos e dispara o carregamento
// do estado salvo. Deve ser o ÚLTIMO arquivo carregado.
// ============================================================

function renderAll(){
    renderHeader();
    renderIngredients();
    renderGoalToggle();
    renderBatchRecipes();
    renderSavedRecipes();
    renderShoppingCard();
    renderCleaning();
    renderPomodoro();
    renderMeds();
    renderRewards();
    renderHabits();
    renderTips();
    renderHome();
    renderCalendarEvents();
    renderLearningGoals();
    if(state.tomorrowPlan) renderTomorrowPlan();
    renderSettings();
    renderInbox();
    if(state.activeTimer) startTicker();
  }

let appLoopsStarted = false;
function startAppLoops(){
    if(appLoopsStarted) return;
    appLoopsStarted = true;
    startReminderLoop();
    setInterval(()=>{ renderNow(); }, 60000); // lista "Agora" acompanha o relógio
    // Se o app ficou aberto de um dia pro outro, redesenha tudo na virada
    let lastDay = todayStr();
    setInterval(()=>{ if(todayStr() !== lastDay){ lastDay = todayStr(); renderAll(); } }, 60000);
  }

window.startTerrenoApp = async function(){
    await loadState();
    startAppLoops();
  };
