// ============================================================
// DICAS: conteúdo de apoio e código de depuração do aparelho.
// ============================================================

const TIPS = [
    {title:'Energia baixa', items:[
      'Troque "tudo ou nada" por "o mínimo hoje conta". Uma tarefa pela metade ainda é progresso.',
      'Deixe tarefas essenciais (remédio, água, escovar dentes) sempre no mesmo lugar/horário — assim exigem menos decisão.',
      'Descanso não precisa ser "produtivo" para ser válido.'
    ]},
    {title:'Sobrecarga e ansiedade', items:[
      'Escreva os pensamentos que estão girando num papel — tirar da cabeça alivia a memória de trabalho.',
      'Reduza estímulos por alguns minutos: som baixo, luz mais fraca, um cômodo só.',
      'Pergunte "o que EU preciso agora" antes de "o que eu deveria estar fazendo".'
    ]},
    {title:'Rotina e tempo', items:[
      'Sempre estime mais tempo do que "parece" necessário para compromissos.',
      'Use alarmes para transições (sair de casa, tomar remédio, parar uma tarefa), não só para começar.',
      'Corpo por perto ajuda: fazer uma tarefa chata com alguém (mesmo por chamada de vídeo) sustenta o foco.'
    ]},
    {title:'Quando procurar apoio', items:[
      'Mudanças bruscas de sono, apetite ou humor que persistem por semanas valem uma conversa com seu psiquiatra.',
      'Terapia (TCC é a mais estudada para TDAH em adultos) ajuda a construir estratégias externas de organização.',
      'Ajustes de medicação são normais ao longo do tratamento — não hesite em relatar o que não está funcionando.'
    ]}
  ];

document.getElementById('showDebugTokenBtn').addEventListener('click', ()=>{
    const box = document.getElementById('debugTokenBox');
    const token = window.terrenoDebugToken;
    if(!token){
      box.innerHTML = '<div class="empty">A IA ainda não terminou de carregar. Aguarde alguns segundos e tente de novo.</div>';
      return;
    }
    box.innerHTML = `
      <div class="chip" style="width:100%;justify-content:space-between;font-family:monospace;font-size:12.5px;word-break:break-all;">
        <span>${token}</span>
      </div>
      <button class="btn small secondary" id="copyDebugTokenBtn" style="margin-top:8px;">Copiar código</button>
      <p id="copyDebugTokenMsg" style="margin-top:6px;font-size:12px;"></p>`;
    document.getElementById('copyDebugTokenBtn').addEventListener('click', async ()=>{
      try{
        await navigator.clipboard.writeText(token);
        document.getElementById('copyDebugTokenMsg').textContent = 'Copiado ✓';
      }catch(e){
        document.getElementById('copyDebugTokenMsg').textContent = 'Não consegui copiar automaticamente — selecione o texto acima manualmente.';
      }
    });
  });

function renderTips(){
    const box = document.getElementById('tipsAccordion');
    box.innerHTML = TIPS.map((t,i)=>`
      <div class="accordion">
        <div class="acc-head" data-i="${i}"><span>${t.title}</span><span class="arrow">▾</span></div>
        <div class="acc-body" id="accbody-${i}"><ul>${t.items.map(x=>`<li>${x}</li>`).join('')}</ul></div>
      </div>`).join('');
    box.querySelectorAll('.acc-head').forEach(h=>{
      h.addEventListener('click', ()=>{
        h.classList.toggle('open');
        document.getElementById('accbody-'+h.dataset.i).classList.toggle('open');
      });
    });
  }
