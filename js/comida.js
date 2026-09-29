// ============================================================
// COMIDA: ingredientes, receitas, feedback de paladar, lista de
// compras, sugestões e cardápios via IA (Gemini).
// ============================================================

const RECIPES = [
    {id:'r1', name:'Ovos mexidos com espinafre', meal:'Café da manhã', minutes:8, goals:['geral','abdominal'],
      ing:['ovo','espinafre','sal','azeite'], tag:'rico em proteína',
      steps:['Refogue o espinafre no azeite por 1 min.','Bata os ovos com sal e adicione à frigideira.','Mexa em fogo baixo até dar liga (2-3 min).']},
    {id:'r2', name:'Iogurte com granola e banana', meal:'Café da manhã', minutes:3, goals:['geral'],
      ing:['iogurte','granola','banana'], tag:'sem fogão',
      steps:['Corte a banana.','Monte num pote: iogurte, granola, banana por cima.']},
    {id:'r3', name:'Panqueca de aveia e banana', meal:'Café da manhã', minutes:10, goals:['geral'],
      ing:['aveia','banana','ovo'], tag:'poucos passos',
      steps:['Amasse a banana, misture com ovo e aveia.','Frite pequenas porções na frigideira antiaderente, 2 min cada lado.']},
    {id:'r4', name:'Frango grelhado com arroz e legumes', meal:'Almoço/Janta', minutes:25, goals:['geral'],
      ing:['frango','arroz','cenoura','sal','azeite'], tag:'rende porções',
      steps:['Tempere o frango com sal e grelhe 6-7 min de cada lado.','Cozinhe o arroz normalmente.','Refogue a cenoura em cubos com azeite.']},
    {id:'r5', name:'Omelete de queijo com salada rápida', meal:'Almoço/Janta', minutes:12, goals:['geral','abdominal'],
      ing:['ovo','queijo','alface','tomate','azeite'], tag:'rico em proteína',
      steps:['Bata os ovos, adicione queijo ralado e leve à frigideira.','Corte alface e tomate, tempere com azeite e sal.']},
    {id:'r6', name:'Macarrão com atum e tomate', meal:'Almoço/Janta', minutes:15, goals:['geral'],
      ing:['macarrão','atum','tomate','alho','azeite'], tag:'poucos passos',
      steps:['Cozinhe o macarrão.','Refogue alho e tomate no azeite, adicione o atum escorrido.','Misture tudo.']},
    {id:'r7', name:'Feijão, arroz e ovo frito', meal:'Almoço/Janta', minutes:15, goals:['geral'],
      ing:['feijão','arroz','ovo'], tag:'clássico e rápido',
      steps:['Esquente o feijão e o arroz (se já prontos).','Frite o ovo e sirva por cima.']},
    {id:'r8', name:'Salmão assado com batata-doce', meal:'Almoço/Janta', minutes:30, goals:['geral','abdominal'],
      ing:['salmão','batata-doce','azeite','sal'], tag:'ômega-3',
      steps:['Corte a batata-doce em rodelas, tempere e leve ao forno 20 min a 200°C.','Adicione o salmão temperado na mesma assadeira nos últimos 12 min.']},
    {id:'r9', name:'Wrap de frango desfiado', meal:'Almoço/Janta', minutes:10, goals:['geral','abdominal'],
      ing:['frango','tortilha','alface','tomate'], tag:'sem sujar louça',
      steps:['Desfie o frango já cozido.','Monte o wrap com alface, tomate e frango.']},
    {id:'r10', name:'Mix de castanhas e frutas', meal:'Lanche', minutes:1, goals:['geral','abdominal'],
      ing:['castanha','banana'], tag:'zero preparo',
      steps:['Junte numa tigela e coma.']},
    {id:'r11', name:'Torrada com queijo e ovo', meal:'Lanche', minutes:6, goals:['geral'],
      ing:['pão','queijo','ovo'], tag:'poucos passos',
      steps:['Frite o ovo.','Monte o pão com queijo e ovo por cima.']},
    {id:'r12', name:'Vitamina de banana com aveia', meal:'Lanche', minutes:4, goals:['geral'],
      ing:['banana','leite','aveia'], tag:'sem fogão',
      steps:['Bata tudo no liquidificador.']},
    {id:'r13', name:'Salada de grão-de-bico com atum', meal:'Almoço/Janta', minutes:10, goals:['abdominal'],
      ing:['grão-de-bico','atum','tomate','azeite','limão'], tag:'fibra + proteína',
      steps:['Escorra o grão-de-bico e o atum.','Misture com tomate picado, azeite, limão e sal.']},
    {id:'r14', name:'Omelete de vegetais variados', meal:'Café da manhã', minutes:10, goals:['abdominal'],
      ing:['ovo','brócolis','pimentão','cebola','azeite'], tag:'baixo em carboidrato refinado',
      steps:['Refogue os vegetais picados no azeite por 3 min.','Adicione os ovos batidos e cozinhe em fogo baixo até firmar.']},
    {id:'r15', name:'Frango com brócolis e batata-doce assados', meal:'Almoço/Janta', minutes:30, goals:['abdominal'],
      ing:['frango','brócolis','batata-doce','azeite','sal'], tag:'proteína + fibra',
      steps:['Corte tudo em pedaços, tempere com azeite e sal.','Asse em uma única assadeira a 200°C por 25 min, virando na metade.']},
    {id:'rb1', name:'Frango desfiado (base pra semana)', meal:'Base semanal', minutes:35, goals:['geral','abdominal'], batch:true, yield:'rende ~6 porções',
      ing:['frango','sal','alho','azeite'], tag:'cozinhe 1x, use a semana toda',
      steps:['Cozinhe o frango temperado em água (ou panela de pressão) até ficar bem macio, 20-25 min.','Desfie com dois garfos ainda morno.','Divida em potes de porção individual — geladeira até 3-4 dias, ou congele.'],
      uses:['Wrap de frango', 'Salada com grão-de-bico', 'Misturado no arroz', 'Recheio de omelete']},
    {id:'rb2', name:'Arroz e feijão em lote', meal:'Base semanal', minutes:40, goals:['geral'], batch:true, yield:'rende ~5-6 porções',
      ing:['arroz','feijão','alho','sal'], tag:'cozinhe 1x, use a semana toda',
      steps:['Cozinhe o arroz e o feijão em quantidade maior que o de costume.','Deixe esfriar antes de guardar (evita mofo/umidade em excesso).','Divida em potes — geladeira até 4 dias, congelador até 3 meses.'],
      uses:['Base pra qualquer prato do dia a dia', 'Combine com o frango desfiado ou um ovo frito na hora']},
    {id:'rb3', name:'Legumes assados em lote', meal:'Base semanal', minutes:30, goals:['abdominal'], batch:true, yield:'rende ~4-5 porções',
      ing:['brócolis','cenoura','batata-doce','azeite','sal'], tag:'cozinhe 1x, use a semana toda',
      steps:['Corte tudo em pedaços parecidos.','Tempere com azeite e sal e espalhe numa assadeira.','Asse a 200°C por 25 min.','Guarde na geladeira até 4 dias.'],
      uses:['Acompanhamento pronto pra qualquer proteína', 'Misture com ovo mexido de manhã']},
    {id:'rb4', name:'Ovos cozidos (snack rápido)', meal:'Base semanal', minutes:12, goals:['geral','abdominal'], batch:true, yield:'rende 6-8 ovos',
      ing:['ovo'], tag:'cozinhe 1x, use a semana toda',
      steps:['Cozinhe os ovos por 9-10 min em água fervente.','Esfrie em água gelada — descasque só na hora de comer.','Guarde na geladeira até 5 dias.'],
      uses:['Lanche rápido sem preparo', 'Complemento de salada ou wrap']}
  ];

function norm(s){
    return s.toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }

function renderIngredients(){
    const wrap = document.getElementById('ingredientChips');
    wrap.innerHTML = '';
    state.ingredients.forEach((ing,idx)=>{
      const chip = document.createElement('span');
      chip.className='chip';
      chip.innerHTML = `${ing} <button data-idx="${idx}">×</button>`;
      chip.querySelector('button').addEventListener('click', ()=>{
        state.ingredients.splice(idx,1);
        saveState(); renderIngredients(); renderRecipes();
      });
      wrap.appendChild(chip);
    });
    renderRecipes();
  }

function renderBatchRecipes(){
    const box = document.getElementById('batchCard');
    const pool = RECIPES.filter(r => r.batch && (state.foodGoal === 'geral' || r.goals.includes('abdominal')))
      .slice().sort((a,b)=> prefMultiplier(b.id) - prefMultiplier(a.id));
    box.innerHTML = `<p style="margin-bottom:8px;">Cozinhe uma vez (ex: no fim de semana) e use ao longo da semana — menos decisão no dia a dia.</p>` +
      pool.map(r=>`<div class="recipe">
        <div class="row1"><span class="name">${r.name}</span><span class="meta">${r.minutes} min · ${r.yield}</span></div>
        <div class="match full">usos: ${r.uses.join(', ')}</div>
        <details><summary>ver modo de preparo</summary><ol>${r.steps.map(s=>`<li>${s}</li>`).join('')}</ol></details>
        ${recipeActionsBlock(r.id)}
      </div>`).join('');
    wireRecipeActions(box);
  }

const RATING_EMOJI = {love:'😍', like:'🙂', neutral:'😐', dislike:'👎'};

const RATING_VALUE = {love:2, like:1, neutral:0, dislike:-1};

function prefMultiplier(id){
    const fb = state.recipeFeedback[id];
    if(!fb || !fb.history.length) return 1;
    const avg = fb.history.reduce((a,h)=>a+(RATING_VALUE[h.rating] ?? 0),0) / fb.history.length;
    if(avg>=1.3) return 1.4;
    if(avg>0) return 1.15;
    if(avg===0) return 1;
    return 0.55;
  }

function recipeFeedbackMeta(id){
    const fb = state.recipeFeedback[id];
    if(!fb || !fb.history.length) return '';
    const last = fb.history[fb.history.length-1];
    let extra = last.notes ? ` · "${last.notes}"` : '';
    return `<div class="meta" style="margin-top:4px;display:block;">feita ${fb.timesMade}x · última vez ${RATING_EMOJI[last.rating]||''}${extra}</div>`;
  }

function recipeActionsBlock(id){
    return `<div class="recipe-actions" data-recipe="${id}">
      ${recipeFeedbackMeta(id)}
      <button class="btn small secondary markMadeBtn" data-recipe="${id}" style="margin-top:6px;">Marcar como feita</button>
    </div>`;
  }

function wireRecipeActions(root){
    root.querySelectorAll('.markMadeBtn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.dataset.recipe;
        const wrap = root.querySelector(`.recipe-actions[data-recipe="${id}"]`);
        wrap.innerHTML = `
          <p class="eyebrow" style="margin:8px 0 6px;">Como ficou?</p>
          <div class="quiz-options feedbackRating">
            <button class="qopt" data-rating="love">😍 Adorei</button>
            <button class="qopt" data-rating="like">🙂 Gostei</button>
            <button class="qopt" data-rating="neutral">😐 Neutro</button>
            <button class="qopt" data-rating="dislike">👎 Não curti</button>
          </div>
          <input type="text" class="feedbackNotes" style="margin-top:8px;" placeholder="Mudou algo na receita? (opcional)">
          <div class="btn-row" style="margin-top:8px;">
            <button class="btn small saveFeedbackBtn">Salvar</button>
            <button class="btn small ghost cancelFeedbackBtn">Cancelar</button>
          </div>`;
        wrap.querySelectorAll('.feedbackRating .qopt').forEach(o=>{
          o.addEventListener('click', ()=>{
            wrap.querySelectorAll('.feedbackRating .qopt').forEach(x=>x.classList.remove('selected'));
            o.classList.add('selected');
            wrap.dataset.selectedRating = o.dataset.rating;
          });
        });
        wrap.querySelector('.cancelFeedbackBtn').addEventListener('click', ()=>{
          renderRecipes(); renderBatchRecipes();
        });
        wrap.querySelector('.saveFeedbackBtn').addEventListener('click', ()=>{
          const rating = wrap.dataset.selectedRating || 'neutral';
          const notes = wrap.querySelector('.feedbackNotes').value.trim();
          state.recipeFeedback[id] = state.recipeFeedback[id] || {timesMade:0, history:[]};
          state.recipeFeedback[id].timesMade += 1;
          state.recipeFeedback[id].history.push({date: todayStr(), rating, notes});
          saveState();
          renderRecipes(); renderBatchRecipes();
        });
      });
    });
  }

function renderGoalToggle(){
    document.querySelectorAll('#goalToggle .qopt').forEach(btn=>{
      btn.classList.toggle('selected', btn.dataset.goal === state.foodGoal);
    });
    const info = document.getElementById('goalInfo');
    if(state.foodGoal === 'abdominal'){
      info.innerHTML = `<div class="callout mustard" style="margin-top:12px;margin-bottom:0;">
        <strong>O que realmente ajuda</strong>
        Menos sobre dieta radical, mais sobre padrão: priorize proteína e fibra em cada refeição (saciam mais), reduza açúcar refinado/ultraprocessados, modere álcool, durma bem e mantenha atividade física — inclusive exercícios de força. Restrições extremas tendem a não durar e podem mexer com humor e energia, o que pesa mais ainda com TDAH e depressão.
      </div>`;
    } else {
      info.innerHTML = '';
    }
  }

document.getElementById('goalToggle').addEventListener('click', (e)=>{
    const btn = e.target.closest('.qopt');
    if(!btn) return;
    state.foodGoal = btn.dataset.goal;
    saveState(); renderGoalToggle(); renderRecipes(); renderBatchRecipes();
  });

function recipeMetaLine(r){
    const parts = [`${r.minutes||'?'} min`];
    if(r.servings) parts.push(`${r.servings} porç${r.servings>1?'ões':'ão'}`);
    if(r.calories_per_serving) parts.push(`~${r.calories_per_serving} kcal/porção`);
    return parts.join(' · ');
  }

function recipeIngredientsHTML(r){
    const list = r.ingredients || [];
    if(list.length===0) return '';
    const items = list.map(i => typeof i === 'string' ? i : `${i.item}${i.amount ? ' — '+i.amount : ''}`);
    return `<ul style="margin:6px 0 0;padding-left:18px;font-size:13px;color:var(--ink-soft);">${items.map(i=>`<li>${i}</li>`).join('')}</ul>`;
  }

document.getElementById('genDayMenuBtn').addEventListener('click', async ()=>{
    const box = document.getElementById('menuResults');
    box.innerHTML = '<div class="empty">Montando o cardápio do dia...</div>';
    try{
      if(!window.askGeminiForDayMenu) throw new Error('IA ainda não configurada.');
      const meals = await window.askGeminiForDayMenu(state.foodGoal);
      if(!Array.isArray(meals) || meals.length===0){
        box.innerHTML = '<div class="empty">A IA não retornou um cardápio dessa vez. Tente de novo.</div>';
        return;
      }
      box.innerHTML = `<div class="section-title" style="margin-top:0;">Cardápio de hoje</div>` +
        meals.map((r,idx)=>`<div class="recipe">
          <div class="row1"><span class="name">${r.slot}: ${r.name}</span><span class="meta">${recipeMetaLine(r)}</span></div>
          ${recipeIngredientsHTML(r)}
          <details><summary>ver modo de preparo</summary><ol>${(r.steps||[]).map(s=>`<li>${s}</li>`).join('')}</ol></details>
          <div class="btn-row" style="margin-top:8px;">
            <button class="btn small secondary saveMenuItemBtn" data-idx="${idx}">💾 Salvar receita</button>
          </div>
        </div>`).join('');
      box.querySelectorAll('.saveMenuItemBtn').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const r = meals[parseInt(btn.dataset.idx)];
          state.customRecipes.push({
            id: 'ai'+Date.now()+Math.random().toString(36).slice(2,6),
            name: r.name, minutes: r.minutes||15, servings: r.servings||null,
            calories_per_serving: r.calories_per_serving||null,
            ing: (r.ingredients||[]).map(i => norm(typeof i === 'string' ? i : i.item)),
            ingredients: r.ingredients||[], steps: r.steps||[],
            tag: 'sugerido pela IA', goals: ['geral'], meal: r.slot||'Sugestão IA'
          });
          addPoints(POINTS.aiRecipeSave, 'receita salva: '+r.name);
          saveState(); renderSavedRecipes(); renderRewards();
          btn.textContent = 'Salva ✓'; btn.disabled = true;
        });
      });
    }catch(e){
      console.error(e);
      box.innerHTML = aiErrorHTML(e, 'montar o cardápio');
    }
  });

document.getElementById('genWeekMenuBtn').addEventListener('click', async ()=>{
    const box = document.getElementById('menuResults');
    box.innerHTML = '<div class="empty">Montando o cardápio da semana... isso pode levar um pouco mais de tempo.</div>';
    try{
      if(!window.askGeminiForWeekMenu) throw new Error('IA ainda não configurada.');
      const days = await window.askGeminiForWeekMenu(state.foodGoal);
      if(!Array.isArray(days) || days.length===0){
        box.innerHTML = '<div class="empty">A IA não retornou um cardápio dessa vez. Tente de novo.</div>';
        return;
      }
      box.innerHTML = `<div class="section-title" style="margin-top:0;">Cardápio da semana</div>` +
        days.map(d=>`<div class="recipe">
          <div class="name" style="margin-bottom:4px;">${d.day}</div>
          ${(d.meals||[]).map(m=>`<div class="task-row" style="padding:6px 0;">
            <div class="info"><div class="name" style="font-size:13.5px;">${m.slot}: ${m.name}</div></div>
            <button class="btn small ghost viewDishBtn" data-name="${m.name.replace(/"/g,'&quot;')}">Ver receita</button>
          </div>`).join('')}
        </div>`).join('');
      box.querySelectorAll('.viewDishBtn').forEach(btn=>{
        btn.addEventListener('click', async ()=>{
          const dishName = btn.dataset.name;
          btn.textContent = 'Carregando...';
          try{
            const r = await window.askGeminiForDishDetail(dishName, state.foodGoal);
            const detailId = 'dish-detail-'+Math.random().toString(36).slice(2,8);
            const detailHTML = `<div class="recipe" id="${detailId}" style="margin-top:8px;background:var(--surface-2);border-radius:var(--radius-sm);padding:10px;">
              <div class="row1"><span class="name">${r.name}</span><span class="meta">${recipeMetaLine(r)}</span></div>
              ${recipeIngredientsHTML(r)}
              <ol style="margin:8px 0 0;padding-left:18px;font-size:13.5px;color:var(--ink-soft);">${(r.steps||[]).map(s=>`<li>${s}</li>`).join('')}</ol>
              <div class="btn-row" style="margin-top:8px;">
                <button class="btn small secondary saveDishBtn">💾 Salvar receita</button>
              </div>
            </div>`;
            btn.closest('.task-row').insertAdjacentHTML('afterend', detailHTML);
            btn.remove();
            document.getElementById(detailId).querySelector('.saveDishBtn').addEventListener('click', (e)=>{
              state.customRecipes.push({
                id: 'ai'+Date.now()+Math.random().toString(36).slice(2,6),
                name: r.name, minutes: r.minutes||15, servings: r.servings||null,
                calories_per_serving: r.calories_per_serving||null,
                ing: (r.ingredients||[]).map(i => norm(typeof i === 'string' ? i : i.item)),
                ingredients: r.ingredients||[], steps: r.steps||[],
                tag: 'sugerido pela IA', goals: ['geral'], meal: 'Sugestão IA'
              });
              addPoints(POINTS.aiRecipeSave, 'receita salva: '+r.name);
              saveState(); renderSavedRecipes(); renderRewards();
              e.target.textContent = 'Salva ✓'; e.target.disabled = true;
            });
          }catch(err){
            console.error(err);
            btn.textContent = 'Erro, tentar de novo';
          }
        });
      });
    }catch(e){
      console.error(e);
      box.innerHTML = aiErrorHTML(e, 'montar o cardápio');
    }
  });

document.getElementById('askAiBtn').addEventListener('click', async ()=>{
    if(state.ingredients.length===0){
      alert('Adicione pelo menos um ingrediente antes de pedir uma sugestão.');
      return;
    }
    const box = document.getElementById('aiResults');
    box.innerHTML = '<div class="empty">Perguntando à IA... isso pode levar alguns segundos.</div>';
    try{
      if(!window.askGeminiForRecipes) throw new Error('IA ainda não configurada neste app.');
      const recipes = await window.askGeminiForRecipes(state.ingredients, state.foodGoal);
      if(!Array.isArray(recipes) || recipes.length===0){
        box.innerHTML = '<div class="empty">A IA não retornou nenhuma receita dessa vez. Tente de novo.</div>';
        return;
      }
      box.innerHTML = recipes.map((r,idx)=>`<div class="recipe">
        <div class="row1"><span class="name">${r.name}</span><span class="meta">${recipeMetaLine(r)}</span></div>
        <div class="eyebrow" style="margin-top:2px;">sugerido pela IA</div>
        ${recipeIngredientsHTML(r)}
        <details><summary>ver modo de preparo</summary><ol>${(r.steps||[]).map(s=>`<li>${s}</li>`).join('')}</ol></details>
        <div class="btn-row" style="margin-top:8px;">
          <button class="btn small secondary saveAiBtn" data-idx="${idx}">💾 Salvar receita</button>
        </div>
      </div>`).join('');
      box.querySelectorAll('.saveAiBtn').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const r = recipes[parseInt(btn.dataset.idx)];
          state.customRecipes.push({
            id: 'ai'+Date.now()+Math.random().toString(36).slice(2,6),
            name: r.name,
            minutes: r.minutes || 15,
            servings: r.servings || null,
            calories_per_serving: r.calories_per_serving || null,
            ing: (r.ingredients||[]).map(i => norm(typeof i === 'string' ? i : i.item)),
            ingredients: r.ingredients || [],
            steps: r.steps || [],
            tag: 'sugerido pela IA',
            goals: ['geral'],
            meal: 'Sugestão IA'
          });
          saveState(); renderSavedRecipes();
          addPoints(POINTS.aiRecipeSave, 'receita salva: '+r.name);
          saveState(); renderRewards();
          btn.textContent = 'Salva ✓'; btn.disabled = true;
        });
      });
    }catch(e){
      console.error(e);
      box.innerHTML = aiErrorHTML(e, 'buscar sugestões');
    }
  });

function renderSavedRecipes(){
    const box = document.getElementById('savedRecipesCard');
    if(!box) return;
    const list = state.customRecipes || [];
    if(list.length===0){
      box.innerHTML = '<div class="empty">Nenhuma receita da IA salva ainda — peça uma sugestão acima.</div>';
      return;
    }
    box.innerHTML = list.map(r=>`<div class="recipe">
      <div class="row1"><span class="name">${r.name}</span><span class="meta">${recipeMetaLine(r)}</span></div>
      <div class="eyebrow" style="margin-top:2px;">sugerido pela IA</div>
      ${recipeIngredientsHTML(r)}
      <details><summary>ver modo de preparo</summary><ol>${r.steps.map(s=>`<li>${s}</li>`).join('')}</ol></details>
      <div class="btn-row" style="margin-top:8px;">
        <button class="btn small ghost delAiBtn" data-id="${r.id}">Remover</button>
      </div>
    </div>`).join('');
    box.querySelectorAll('.delAiBtn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        state.customRecipes = state.customRecipes.filter(r=>r.id!==btn.dataset.id);
        saveState(); renderSavedRecipes();
      });
    });
  }

function renderRecipes(){
    const box = document.getElementById('recipeResults');
    if(state.ingredients.length === 0){
      box.innerHTML = '<div class="empty">Adicione alguns ingredientes acima para ver sugestões.</div>';
      return;
    }
    const have = state.ingredients.map(norm);
    const allRecipes = RECIPES.concat(state.customRecipes || []);
    const pool = state.foodGoal === 'abdominal' ? allRecipes.filter(r=>r.goals.includes('abdominal')) : allRecipes;
    const scored = pool.map(r=>{
      const matched = r.ing.filter(i => have.some(h => i.includes(h) || h.includes(i)));
      const baseScore = matched.length / r.ing.length;
      return {r, matched, score: baseScore * prefMultiplier(r.id)};
    }).filter(x=>x.matched.length>0)
      .sort((a,b)=> b.score - a.score || b.matched.length - a.matched.length);

    if(scored.length===0){
      const msg = state.foodGoal === 'abdominal'
        ? 'Nenhuma receita do foco "gordura abdominal" bate com esses ingredientes ainda — tente adicionar vegetais, ovo, frango ou grão-de-bico.'
        : 'Nenhuma receita bate com esses ingredientes ainda — tente adicionar mais um ou dois itens.';
      box.innerHTML = `<div class="empty">${msg}</div>`;
      return;
    }

    box.innerHTML = scored.slice(0,6).map(({r,matched,score})=>{
      const missing = r.ing.filter(i=>!matched.includes(i));
      const full = missing.length===0;
      return `<div class="recipe">
        <div class="row1"><span class="name">${r.name}</span><span class="meta">${r.minutes} min · ${r.meal}</span></div>
        ${r.tag ? `<div class="eyebrow" style="margin-top:2px;">${r.tag}</div>` : ''}
        <div class="match ${full?'full':'partial'}">${full ? '✓ você tem tudo' : 'falta: '+missing.join(', ')}</div>
        <details><summary>ver modo de preparo</summary><ol>${r.steps.map(s=>`<li>${s}</li>`).join('')}</ol></details>
        ${recipeActionsBlock(r.id)}
      </div>`;
    }).join('');
    wireRecipeActions(box);
  }

document.getElementById('addIngredientBtn').addEventListener('click', addIngredient);

document.getElementById('ingredientInput').addEventListener('keydown', e=>{
    if(e.key==='Enter'){ e.preventDefault(); addIngredient(); }
  });

function addIngredient(){
    const input = document.getElementById('ingredientInput');
    const val = input.value.trim();
    if(!val) return;
    state.ingredients.push(val);
    input.value='';
    saveState(); renderIngredients();
  }

const QUIZ_STEPS = [
    {key:'pessoas', q:'Para quantas pessoas você cozinha?', opts:['1','2','3-4','5+']},
    {key:'dias', q:'Quantos dias quer planejar?', opts:['3 dias','5 dias','7 dias']},
    {key:'proteina', q:'Proteína favorita?', opts:['Frango','Carne vermelha','Peixe/ovos','Vegetariano']},
    {key:'tempo', q:'Tempo disponível pra cozinhar no dia a dia?', opts:['Rápido (<15min)','Médio','Sem pressa','Meal prep (cozinho 1x pra semana)']},
    {key:'objetivo', q:'Objetivo alimentar?', opts:['Geral','Reduzir gordura abdominal']}
  ];

function renderShoppingCard(){
    const card = document.getElementById('shoppingCard');
    if(state.shoppingList){
      card.innerHTML = renderShoppingListHTML() +
        `<div class="btn-row" style="margin-top:12px;"><button class="btn ghost" id="redoQuizBtn">Refazer perguntas</button></div>`;
      document.getElementById('redoQuizBtn').addEventListener('click', ()=>{
        state.shoppingList = null; state.shoppingPrefs = null; saveState(); renderShoppingCard(); renderHome();
      });
      card.querySelectorAll('.checklist-item .check-box').forEach(box=>{
        box.addEventListener('click', ()=>{
          const idx = box.dataset.idx;
          state.shoppingList.items[idx].done = !state.shoppingList.items[idx].done;
          saveState(); renderShoppingCard(); renderHome();
        });
      });
      return;
    }
    // start / continue quiz
    if(!state._quizAnswers) state._quizAnswers = {};
    const stepIdx = QUIZ_STEPS.findIndex(s => !(s.key in state._quizAnswers));
    if(stepIdx === -1){
      state.shoppingPrefs = state._quizAnswers;
      state.shoppingList = generateShoppingList(state._quizAnswers);
      state._quizAnswers = null;
      saveState(); renderShoppingCard(); renderHome();
      return;
    }
    const step = QUIZ_STEPS[stepIdx];
    card.innerHTML = `<p style="margin-bottom:4px;font-weight:600;color:var(--ink);">${step.q}</p>
      <div class="quiz-options">${step.opts.map(o=>`<button class="qopt" data-val="${o}">${o}</button>`).join('')}</div>
      <div class="eyebrow" style="margin-top:8px;">pergunta ${stepIdx+1} de ${QUIZ_STEPS.length}</div>`;
    card.querySelectorAll('.qopt').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        state._quizAnswers[step.key] = btn.dataset.val;
        renderShoppingCard();
      });
    });
  }

function generateShoppingList(a){
    const pessoas = a.pessoas === '5+' ? 5 : a.pessoas === '3-4' ? 3.5 : parseInt(a.pessoas)||1;
    const dias = parseInt(a.dias) || 5;
    const factor = pessoas * dias;

    const proteinMap = {
      'Frango': [`Peito de frango — aprox. ${Math.round(factor*0.15*10)/10} kg`, 'Ovos — 1 dúzia'],
      'Carne vermelha': [`Carne moída ou em cubos — aprox. ${Math.round(factor*0.15*10)/10} kg`, 'Ovos — 1 dúzia'],
      'Peixe/ovos': ['Filé de peixe (salmão, tilápia) — algumas porções', 'Ovos — 2 dúzias'],
      'Vegetariano': ['Ovos — 2 dúzias', 'Feijão/lentilha — 1 pacote', 'Tofu ou queijo — a gosto']
    };
    const items = [];
    const add = (cat, list) => list.forEach(name => items.push({cat, name, done:false}));
    const abdominal = a.objetivo === 'Reduzir gordura abdominal';

    add('Proteínas', proteinMap[a.proteina] || proteinMap['Frango']);

    if(abdominal){
      add('Carboidratos (fibrosos)', ['Arroz integral', 'Aveia', 'Batata-doce', 'Pão 100% integral (opcional)']);
      add('Vegetais e frutas (bastante variedade)', ['Brócolis ou couve-flor', 'Folhas verde-escuras', 'Pimentão', 'Tomate', 'Grão-de-bico ou lentilha', 'Frutas com casca (maçã, pera)']);
      add('Despensa e temperos', ['Azeite', 'Sal', 'Alho', 'Limão', 'Iogurte natural sem açúcar', 'Castanhas (porção controlada)']);
      add('Reduzir da lista', ['Refrigerantes e sucos industrializados', 'Doces e sobremesas prontas', 'Frituras e embutidos']);
    } else {
      add('Carboidratos', ['Arroz', 'Aveia', dias>=5 ? 'Batata-doce' : 'Batata', 'Pão de forma integral']);
      add('Vegetais e frutas', ['Banana', 'Tomate', 'Alface ou espinafre', 'Cenoura', dias>=5 ? 'Uma fruta extra da estação' : null].filter(Boolean));
      add('Despensa e temperos', ['Azeite', 'Sal', 'Alho', 'Iogurte natural (café da manhã rápido)', 'Castanhas (lanche sem preparo)']);
    }

    if(a.tempo === 'Rápido (<15min)'){
      add('Facilitadores p/ dias corridos', ['Legumes já picados/congelados', 'Frango já temperado ou pré-cozido', 'Marmita extra pra congelar no fim de semana']);
    }
    if(a.tempo === 'Meal prep (cozinho 1x pra semana)'){
      add('Para o dia de preparo (meal prep)', [
        `Proteína em quantidade maior (ex: frango) — aprox. ${Math.round(factor*0.22*10)/10} kg pra desfiar/porcionar`,
        'Potes de vidro ou plástico com tampa (porções individuais)',
        'Sacos ou potes próprios pra congelar',
        'Etiquetas ou caneta pra marcar a data de preparo'
      ]);
    }
    add('Compatibilidade com a medicação', ['Água (deixar garrafa visível)', 'Chá ou café descafeinado p/ tarde/noite', 'Evitar excesso de suco de toranja/grapefruit', abdominal ? 'Moderar álcool (o corpo prioriza queimá-lo antes da gordura)' : null].filter(Boolean));

    return {items, generatedAt: todayStr()};
  }

function renderShoppingListHTML(){
    const groups = {};
    state.shoppingList.items.forEach((it,idx)=>{
      groups[it.cat] = groups[it.cat] || [];
      groups[it.cat].push({...it, idx});
    });
    return Object.entries(groups).map(([cat, items])=>`
      <h3 style="margin-top:14px;">${cat}</h3>
      ${items.map(it=>`
        <div class="checklist-item">
          <div class="check-box ${it.done?'checked':''}" data-idx="${it.idx}">
            <svg viewBox="0 0 24 24"><polyline points="5 13 10 18 19 7"/></svg>
          </div>
          <div class="label ${it.done?'done':''}">${it.name}</div>
        </div>`).join('')}
    `).join('');
  }
