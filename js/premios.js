// ============================================================
// PRÊMIOS (gamificação): sementes, metas e resgates.
// ============================================================

const POINTS = { habit:2, med:2, cleaning:5, pomodoro:3, aiRecipeSave:3 };

function addPoints(amount, reason){
    state.points = Math.max(0, (state.points||0) + amount);
    state.pointsLog = state.pointsLog || [];
    state.pointsLog.push({date: todayStr(), amount, reason});
    if(state.pointsLog.length > 300) state.pointsLog = state.pointsLog.slice(-300);
  }

function renderRewards(){
    const bal = document.getElementById('pointsBalance');
    if(bal) bal.textContent = `🌱 ${state.points} sementes`;

    const card = document.getElementById('rewardsCard');
    if(card){
      if(state.rewards.length===0){
        card.innerHTML = '<div class="empty">Nenhuma meta cadastrada ainda.</div>';
      } else {
        card.innerHTML = state.rewards.map(r=>{
          const pct = Math.min(100, Math.round((state.points / r.cost)*100));
          const canRedeem = state.points >= r.cost;
          let milestoneMsg = '';
          if(r.cost >= 1000){
            if(pct>=100) milestoneMsg = 'Meta completa! 🎉';
            else if(pct>=75) milestoneMsg = 'Faltou pouco — já passou de 75%.';
            else if(pct>=50) milestoneMsg = 'Metade do caminho andado.';
            else if(pct>=25) milestoneMsg = 'Primeiro quarto concluído, seguindo em frente.';
          }
          return `<div class="med-row" style="flex-direction:column;align-items:stretch;gap:8px;">
            <div style="display:flex;justify-content:space-between;align-items:baseline;">
              <div class="name">${r.name}</div>
              <div class="dose">${state.points}/${r.cost} 🌱</div>
            </div>
            <div style="background:var(--surface-2);border-radius:999px;height:8px;overflow:hidden;">
              <div style="width:${pct}%;background:var(--moss);height:100%;"></div>
            </div>
            ${milestoneMsg ? `<div class="eyebrow" style="color:#7A5A17;">${milestoneMsg}</div>` : ''}
            <div class="btn-row">
              <button class="btn small ${canRedeem?'':'secondary'}" ${canRedeem?'':'disabled'} data-redeem="${r.id}">Resgatar</button>
              <button class="btn small ghost" data-delreward="${r.id}">Remover</button>
            </div>
          </div>`;
        }).join('');
        card.querySelectorAll('[data-redeem]').forEach(btn=>{
          btn.addEventListener('click', ()=>{
            const r = state.rewards.find(x=>x.id===btn.dataset.redeem);
            if(!r || state.points < r.cost) return;
            state.points -= r.cost;
            state.redemptions.push({id:'red'+Date.now(), name:r.name, cost:r.cost, date: todayStr()});
            saveState(); renderRewards();
            alert(`Resgatado: ${r.name} 🎉`);
          });
        });
        card.querySelectorAll('[data-delreward]').forEach(btn=>{
          btn.addEventListener('click', ()=>{
            state.rewards = state.rewards.filter(x=>x.id!==btn.dataset.delreward);
            saveState(); renderRewards();
          });
        });
      }
    }

    const redBox = document.getElementById('redemptionsCard');
    if(redBox){
      const list = (state.redemptions||[]).slice().reverse();
      redBox.innerHTML = list.length===0
        ? '<div class="empty">Nenhum resgate ainda.</div>'
        : list.map(r=>`<div class="task-row"><div class="info"><div class="name">${r.name}</div><div class="when">${new Date(r.date+'T00:00:00').toLocaleDateString('pt-BR')}</div></div><div class="eyebrow">-${r.cost} 🌱</div></div>`).join('');
    }
  }

document.getElementById('addRewardBtn').addEventListener('click', ()=>{
    const name = prompt('Nome da meta/prêmio:');
    if(!name) return;
    const cost = parseInt(prompt('Quantas sementes custa?', '200')) || 200;
    state.rewards.push({id:'rw'+Date.now(), name, cost});
    saveState(); renderRewards();
  });
