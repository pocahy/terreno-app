// ============================================================
// FIREBASE AI LOGIC (GEMINI): módulo ES separado, pois usa import.
// Define window.askGeminiForRecipes, askGeminiForDayMenu,
// askGeminiForWeekMenu, askGeminiForDishDetail (comida.js),
// askGeminiForTomorrowPlan (agenda.js) e askGeminiToSortInbox (inbox.js).
// ============================================================
  import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js';
  import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-app-check.js';
  import { getAI, getGenerativeModel, GoogleAIBackend } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-ai.js';

  try{
    const aiApp = initializeApp(window.FIREBASE_CONFIG, 'ai-app');

    // Modo de depuração do App Check: mais simples que reCAPTCHA para um
    // app de uso pessoal. Em vez de deixar o token só no console (difícil
    // de ver no celular), guardamos ele no navegador e mostramos um botão
    // na interface pra copiar — funciona em qualquer aparelho, sem precisar
    // conectar no computador.
    function getOrCreateDebugToken(){
      let t = localStorage.getItem('terreno-appcheck-debug-token');
      if(!t){
        t = crypto.randomUUID();
        localStorage.setItem('terreno-appcheck-debug-token', t);
      }
      return t;
    }
    const debugToken = getOrCreateDebugToken();
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
    window.terrenoDebugToken = debugToken;

    initializeAppCheck(aiApp, {
      provider: new ReCaptchaEnterpriseProvider(window.RECAPTCHA_SITE_KEY || 'debug-mode'),
      isTokenAutoRefreshEnabled: true
    });

    const ai = getAI(aiApp, { backend: new GoogleAIBackend() });
    const model = getGenerativeModel(ai, { model: 'gemini-3.7-flash' });
    // Modelo configurado pra responder SEMPRE em JSON puro (evita texto
    // extra ou markdown em volta, que quebrava a leitura das respostas)
    const jsonModel = getGenerativeModel(ai, { model: 'gemini-3.7-flash', generationConfig: { responseMimeType: 'application/json' } });

    function parseAIJson(text){
      text = (text||'').trim().replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/```\s*$/,'');
      try{ return JSON.parse(text); }catch(e){
        const m = text.match(/[\[{][\s\S]*[\]}]/);
        if(m){ try{ return JSON.parse(m[0]); }catch(_){} }
        const err = new Error('A IA respondeu num formato inesperado: ' + text.slice(0,120));
        err.code = 'formato'; throw err;
      }
    }

    function asArray(x, keys){
      if(Array.isArray(x)) return x;
      if(x && typeof x === 'object'){
        for(const k of keys.concat(Object.keys(x))){ if(Array.isArray(x[k])) return x[k]; }
      }
      return [];
    }

    async function askJson(prompt){
      const result = await jsonModel.generateContent(prompt);
      return parseAIJson(result.response.text());
    }

    window.terrenoAIReady = true;

    window.askGeminiForRecipes = async function(ingredients, goal){
      const goalText = goal === 'abdominal'
        ? 'com foco em reduzir gordura abdominal (priorize proteína, fibra, e evite ultraprocessados/açúcar)'
        : 'para o dia a dia';
      const prompt = `Você é um assistente de culinária brasileira. Com base nestes ingredientes disponíveis: ${ingredients.join(', ')}, sugira até 3 receitas realistas e rápidas ${goalText}. Pode incluir 1 ou 2 itens comuns de despensa que a pessoa provavelmente já tem (sal, azeite, temperos básicos), mas priorize os ingredientes informados. Para cada ingrediente, informe a quantidade estimada (ex: "200g", "2 unidades", "1 xícara"). Estime também quantas porções a receita rende e as calorias aproximadas por porção. Responda APENAS com um JSON válido, sem markdown, sem texto antes ou depois, exatamente neste formato: [{"name":"Nome da receita","minutes":15,"servings":2,"calories_per_serving":420,"ingredients":[{"item":"peito de frango","amount":"200g"}],"steps":["passo 1","passo 2"]}]. Os valores de calorias e porções são estimativas aproximadas, não medições exatas — isso deve ficar implícito, não precisa declarar isso no JSON.`;
      return await askJson(prompt);
    };

    window.askGeminiForDayMenu = async function(goal){
      const goalText = goal === 'abdominal'
        ? 'com foco em reduzir gordura abdominal (priorize proteína, fibra, evite ultraprocessados/açúcar)'
        : 'equilibrado para o dia a dia';
      const prompt = `Você é um assistente de culinária brasileira. Monte um cardápio realista para 1 dia (café da manhã, almoço, lanche da tarde e jantar), ${goalText}. Para cada refeição, informe o prato, tempo de preparo, quantas porções rende, calorias estimadas por porção, ingredientes com quantidade, e o modo de preparo. Responda APENAS com um JSON válido, sem markdown, exatamente neste formato: [{"slot":"Café da manhã","name":"Nome do prato","minutes":10,"servings":1,"calories_per_serving":350,"ingredients":[{"item":"ovo","amount":"2 unidades"}],"steps":["passo 1"]}, {"slot":"Almoço", ...}, {"slot":"Lanche da tarde", ...}, {"slot":"Jantar", ...}]`;
      return await askJson(prompt);
    };

    window.askGeminiForWeekMenu = async function(goal){
      const goalText = goal === 'abdominal'
        ? 'com foco em reduzir gordura abdominal (priorize proteína, fibra, evite ultraprocessados/açúcar)'
        : 'equilibrado, variado, para o dia a dia';
      const prompt = `Você é um assistente de culinária brasileira. Monte um cardápio realista para 7 dias (domingo a sábado), ${goalText}, com variedade entre os dias (evite repetir o mesmo prato). Para cada dia, informe café da manhã, almoço, lanche da tarde e jantar — apenas o nome do prato e o tempo de preparo em minutos, sem detalhes de ingredientes ou modo de preparo nessa etapa. Responda APENAS com um JSON válido, sem markdown, exatamente neste formato: [{"day":"Domingo","meals":[{"slot":"Café da manhã","name":"Nome do prato","minutes":10}, {"slot":"Almoço","name":"...","minutes":25}, {"slot":"Lanche da tarde","name":"...","minutes":5}, {"slot":"Jantar","name":"...","minutes":20}]}, {"day":"Segunda", ...}]`;
      return await askJson(prompt);
    };

    window.askGeminiForDishDetail = async function(dishName, goal){
      const goalText = goal === 'abdominal' ? 'com foco em reduzir gordura abdominal' : 'para o dia a dia';
      const prompt = `Você é um assistente de culinária brasileira. Dê a receita completa e realista do prato "${dishName}" ${goalText}. Informe tempo de preparo, quantas porções rende, calorias estimadas por porção, ingredientes com quantidade, e o modo de preparo passo a passo. Responda APENAS com um JSON válido, sem markdown, exatamente neste formato: {"name":"${dishName}","minutes":15,"servings":2,"calories_per_serving":400,"ingredients":[{"item":"...","amount":"..."}],"steps":["passo 1","passo 2"]}`;
      return await askJson(prompt);
    };

    window.askGeminiForTomorrowPlan = async function(tomorrowEvents, learningGoals, opts){
      opts = opts || {};
      const wake = opts.wakeTime || '07:00', wind = opts.windDownTime || '22:30';
      const eventsText = tomorrowEvents.length
        ? tomorrowEvents.map(ev => `${ev.allDay ? 'dia todo' : new Date(ev.start).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}: ${ev.summary}`).join('; ')
        : 'nenhum compromisso registrado';
      const goalsText = learningGoals.length
        ? learningGoals.map(g => g.name + (g.notes ? ` (${g.notes})` : '')).join(', ')
        : 'nenhum tema cadastrado';
      const energyText = opts.energy == null ? 'não informada'
        : opts.energy < 1.8 ? 'baixa nos últimos dias — monte um dia MAIS LEVE, com menos blocos de estudo (no máximo 2), blocos curtos de 20-25 min e mais descanso'
        : opts.energy < 2.8 ? 'média' : 'boa';
      const pleasureText = (opts.pleasure && opts.pleasure.length) ? opts.pleasure.join(', ') : 'nenhuma registrada ainda';
      const cuesText = (opts.cues && opts.cues.length) ? opts.cues.join('; ') : 'nenhum';
      const prompt = `Você é um assistente de planejamento diário para uma pessoa adulta com TDAH e depressão em tratamento. Seja realista e gentil, sem sobrecarregar.
Compromissos já marcados para amanhã: ${eventsText}.
Temas que a pessoa quer aprender: ${goalsText}.
Energia recente: ${energyText}.
Atividades que costumam fazer bem à pessoa: ${pleasureText}.
Rotinas âncora já existentes (gatilhos): ${cuesText}.
Regras:
1. O dia começa no horário fixo de acordar (${wake}) e o último bloco termina no horário de desacelerar (${wind}). Não agende estudo nos 60 min antes de ${wind}.
2. Inclua os compromissos já marcados nos horários exatos.
3. Preencha intervalos livres com blocos curtos de estudo (25 a 45 min, estilo pomodoro), revezando os temas entre os dias em vez de todos no mesmo dia. Cada bloco de estudo deve ter um foco concreto e progressivo (o próximo passo de um cronograma), não genérico.
4. No campo "detail" de cada bloco de estudo, comece com um plano no formato "Quando [gatilho concreto], então [primeiro passo pequeno]" e depois o foco do dia.
5. Antes dos blocos de estudo mais exigentes, inclua 5 a 10 minutos de movimento (tipo "movimento").
6. Inclua blocos de transição/descanso entre atividades, e reserve espaço para pelo menos uma atividade que costuma fazer bem à pessoa.
7. Inclua exposição à luz natural logo depois de acordar.
Responda APENAS com um JSON válido, sem markdown, exatamente neste formato: [{"time":"07:00","title":"Título curto","type":"compromisso ou estudo ou descanso ou movimento","detail":"detalhe opcional"}]`;
      return asArray(await askJson(prompt), ['blocks','plano','agenda','items']);
    };

    window.askGeminiToSortInbox = async function(items){
      const list = items.map(it => `{"id":"${it.id}","texto":${JSON.stringify(it.text)}}`).join(',\n');
      const prompt = `Você organiza uma "caixa de entrada" de pensamentos soltos de uma pessoa com TDAH. Para cada item, escolha UMA categoria:
- "limpeza": tarefa doméstica/de casa
- "compra": algo a comprar
- "estudo": tema que a pessoa quer aprender
- "habito": algo que a pessoa quer fazer todo dia
- "tarefa": outra tarefa pontual (trabalho, burocracia, ligação, etc.)
- "nota": ideia, lembrança ou preocupação que não é ação
Reescreva cada item como um título curto e acionável (máx. 8 palavras), começando por verbo quando for ação.
Itens:
[${list}]
Responda APENAS com um JSON válido, sem markdown: [{"id":"...","category":"limpeza|compra|estudo|habito|tarefa|nota","title":"..."}]`;
      return asArray(await askJson(prompt), ['items','itens']);
    };
  }catch(e){
    console.error('Firebase AI Logic não pôde ser inicializado:', e);
  }
