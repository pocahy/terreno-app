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
    if(state.activeTimer) startTicker();
  }

window.startTerrenoApp = function(){
    loadState();
  };
