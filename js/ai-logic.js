// ============================================================
// FIREBASE AI LOGIC (GEMINI): módulo ES separado, pois usa import.
// Define window.askGeminiForRecipes, askGeminiForDayMenu,
// askGeminiForWeekMenu e askGeminiForDishDetail, usados por comida.js.
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

    window.askGeminiForRecipes = async function(ingredients, goal){
      const goalText = goal === 'abdominal'
        ? 'com foco em reduzir gordura abdominal (priorize proteína, fibra, e evite ultraprocessados/açúcar)'
        : 'para o dia a dia';
      const prompt = `Você é um assistente de culinária brasileira. Com base nestes ingredientes disponíveis: ${ingredients.join(', ')}, sugira até 3 receitas realistas e rápidas ${goalText}. Pode incluir 1 ou 2 itens comuns de despensa que a pessoa provavelmente já tem (sal, azeite, temperos básicos), mas priorize os ingredientes informados. Para cada ingrediente, informe a quantidade estimada (ex: "200g", "2 unidades", "1 xícara"). Estime também quantas porções a receita rende e as calorias aproximadas por porção. Responda APENAS com um JSON válido, sem markdown, sem texto antes ou depois, exatamente neste formato: [{"name":"Nome da receita","minutes":15,"servings":2,"calories_per_serving":420,"ingredients":[{"item":"peito de frango","amount":"200g"}],"steps":["passo 1","passo 2"]}]. Os valores de calorias e porções são estimativas aproximadas, não medições exatas — isso deve ficar implícito, não precisa declarar isso no JSON.`;
      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      text = text.replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/```\s*$/,'');
      return JSON.parse(text);
    };

    window.askGeminiForDayMenu = async function(goal){
      const goalText = goal === 'abdominal'
        ? 'com foco em reduzir gordura abdominal (priorize proteína, fibra, evite ultraprocessados/açúcar)'
        : 'equilibrado para o dia a dia';
      const prompt = `Você é um assistente de culinária brasileira. Monte um cardápio realista para 1 dia (café da manhã, almoço, lanche da tarde e jantar), ${goalText}. Para cada refeição, informe o prato, tempo de preparo, quantas porções rende, calorias estimadas por porção, ingredientes com quantidade, e o modo de preparo. Responda APENAS com um JSON válido, sem markdown, exatamente neste formato: [{"slot":"Café da manhã","name":"Nome do prato","minutes":10,"servings":1,"calories_per_serving":350,"ingredients":[{"item":"ovo","amount":"2 unidades"}],"steps":["passo 1"]}, {"slot":"Almoço", ...}, {"slot":"Lanche da tarde", ...}, {"slot":"Jantar", ...}]`;
      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      text = text.replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/```\s*$/,'');
      return JSON.parse(text);
    };

    window.askGeminiForWeekMenu = async function(goal){
      const goalText = goal === 'abdominal'
        ? 'com foco em reduzir gordura abdominal (priorize proteína, fibra, evite ultraprocessados/açúcar)'
        : 'equilibrado, variado, para o dia a dia';
      const prompt = `Você é um assistente de culinária brasileira. Monte um cardápio realista para 7 dias (domingo a sábado), ${goalText}, com variedade entre os dias (evite repetir o mesmo prato). Para cada dia, informe café da manhã, almoço, lanche da tarde e jantar — apenas o nome do prato e o tempo de preparo em minutos, sem detalhes de ingredientes ou modo de preparo nessa etapa. Responda APENAS com um JSON válido, sem markdown, exatamente neste formato: [{"day":"Domingo","meals":[{"slot":"Café da manhã","name":"Nome do prato","minutes":10}, {"slot":"Almoço","name":"...","minutes":25}, {"slot":"Lanche da tarde","name":"...","minutes":5}, {"slot":"Jantar","name":"...","minutes":20}]}, {"day":"Segunda", ...}]`;
      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      text = text.replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/```\s*$/,'');
      return JSON.parse(text);
    };

    window.askGeminiForDishDetail = async function(dishName, goal){
      const goalText = goal === 'abdominal' ? 'com foco em reduzir gordura abdominal' : 'para o dia a dia';
      const prompt = `Você é um assistente de culinária brasileira. Dê a receita completa e realista do prato "${dishName}" ${goalText}. Informe tempo de preparo, quantas porções rende, calorias estimadas por porção, ingredientes com quantidade, e o modo de preparo passo a passo. Responda APENAS com um JSON válido, sem markdown, exatamente neste formato: {"name":"${dishName}","minutes":15,"servings":2,"calories_per_serving":400,"ingredients":[{"item":"...","amount":"..."}],"steps":["passo 1","passo 2"]}`;
      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      text = text.replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/```\s*$/,'');
      return JSON.parse(text);
    };
  }catch(e){
    console.error('Firebase AI Logic não pôde ser inicializado:', e);
  }
