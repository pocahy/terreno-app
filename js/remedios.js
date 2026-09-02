// ============================================================
// REMÉDIOS: doses diárias, adesão semanal e calendário anual.
// ============================================================

function medDosesToday(medId){
    const t = todayStr();
    const arr = (state.medCompletions[t] || {})[medId];
    return arr || [];
  }

function toggleMedDose(medId, idx, timesPerDay){
    const t = todayStr();
    state.medCompletions[t] = state.medCompletions[t] || {};
    const arr = state.medCompletions[t][medId] || new Array(timesPerDay).fill(false);
    arr[idx] = !arr[idx];
    state.medCompletions[t][medId] = arr;
    const med = state.medications.find(m=>m.id===medId);
    addPoints(arr[idx] ? POINTS.med : -POINTS.med, 'remédio: '+(med?med.name:medId));
    saveState(); renderMeds(); renderHeader(); renderHome(); renderRewards();
  }

function renderMeds(){
    const card = document.getElementById('medsCard');
    if(!card) return;
    if(state.medications.length===0){
      card.innerHTML = '<div class="empty">Nenhum medicamento cadastrado ainda.</div>';
    } else {
      card.innerHTML = state.medications.map(m=>{
        const doses = medDosesToday(m.id);
        const dots = Array.from({length:m.timesPerDay}).map((_,i)=>{
          const on = !!doses[i];
          return `<div class="dose-dot ${on?'on':''}" data-med="${m.id}" data-idx="${i}">${i+1}</div>`;
        }).join('');
        return `<div class="med-row">
          <div style="flex:1;">
            <div class="name">${m.name}</div>
            <div class="dose">${m.dose}${m.timesPerDay>1?` · ${m.timesPerDay}x ao dia`:''}</div>
          </div>
          <div class="dose-dots">${dots}</div>
        </div>`;
      }).join('');
      card.querySelectorAll('.dose-dot').forEach(dot=>{
        dot.addEventListener('click', ()=>{
          const med = state.medications.find(m=>m.id===dot.dataset.med);
          toggleMedDose(med.id, parseInt(dot.dataset.idx), med.timesPerDay);
        });
      });
    }
    renderMedsAdherence();
  }

const DAY_LETTERS = ['D','S','T','Q','Q','S','S'];

function getWeekDates(){
    const now = new Date();
    const dow = now.getDay(); // 0 = domingo
    const sunday = new Date(now); sunday.setDate(now.getDate() - dow);
    return Array.from({length:7}, (_,i)=>{
      const d = new Date(sunday); d.setDate(sunday.getDate()+i);
      return d.toISOString().slice(0,10);
    });
  }

function medDayStatus(dateStr){
    let taken=0, possible=0;
    state.medications.forEach(m=>{
      possible += m.timesPerDay;
      const arr = (state.medCompletions[dateStr]||{})[m.id] || [];
      taken += arr.filter(Boolean).length;
    });
    if(possible===0) return 'nodata';
    if(taken===0) return 'none';
    if(taken>=possible) return 'full';
    return 'partial';
  }

function renderMedsAdherence(){
    const box = document.getElementById('medsAdherenceCard');
    if(!box) return;
    if(state.medications.length===0){
      box.innerHTML = '<div class="empty">Cadastre um medicamento pra acompanhar a adesão.</div>';
      return;
    }
    const week = getWeekDates();
    const today = todayStr();
    box.innerHTML = state.medications.map(m=>{
      const cells = week.map((ds,i)=>{
        const isFuture = ds > today;
        const arr = (state.medCompletions[ds]||{})[m.id] || [];
        const taken = arr.filter(Boolean).length;
        let cls = 'none';
        if(taken>=m.timesPerDay && m.timesPerDay>0) cls='full';
        else if(taken>0) cls='partial';
        return `<div class="week-dot ${isFuture?'future':cls}">${DAY_LETTERS[i]}</div>`;
      }).join('');
      return `<div class="med-row" style="align-items:flex-start;">
        <div style="flex:1;">
          <div class="name">${m.name}</div>
          <div class="dose">${m.dose}</div>
        </div>
        <div style="display:flex;gap:4px;">${cells}</div>
      </div>`;
    }).join('');
  }

const MONTH_ABBR = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

function renderYearCalendar(){
    const gridEl = document.getElementById('yearCalGrid');
    if(!gridEl) return;
    const year = new Date().getFullYear();
    const jan1 = new Date(year,0,1);
    const dec31 = new Date(year,11,31);
    const gridStart = new Date(jan1); gridStart.setDate(jan1.getDate() - jan1.getDay());

    const days = [];
    let cur = new Date(gridStart);
    while(cur <= dec31){ days.push(new Date(cur)); cur.setDate(cur.getDate()+1); }
    while(days.length % 7 !== 0){ days.push(new Date(cur)); cur.setDate(cur.getDate()+1); }

    const weeks = [];
    for(let i=0;i<days.length;i+=7) weeks.push(days.slice(i,i+7));
    const today = todayStr();

    let lastMonth = -1;
    const monthLabels = [];
    const weekCols = weeks.map(week=>{
      const firstOfMonthDay = week.find(d => d.getFullYear()===year && d.getDate()<=7 && d.getDay()===0);
      let label = '';
      if(firstOfMonthDay && firstOfMonthDay.getMonth() !== lastMonth){
        label = MONTH_ABBR[firstOfMonthDay.getMonth()];
        lastMonth = firstOfMonthDay.getMonth();
      }
      monthLabels.push(label);
      const cells = week.map(d=>{
        const ds = d.toISOString().slice(0,10);
        if(d.getFullYear() !== year) return `<div class="cal-day" style="background:transparent;"></div>`;
        if(ds > today) return `<div class="cal-day future"></div>`;
        const status = medDayStatus(ds);
        const cls = status==='nodata' ? '' : status;
        return `<div class="cal-day ${cls}" data-date="${ds}" title="${ds}"></div>`;
      }).join('');
      return `<div class="cal-week">${cells}</div>`;
    });

    gridEl.innerHTML = `
      <div style="display:flex;gap:3px;margin-bottom:2px;">
        ${monthLabels.map(l=>`<div class="cal-month-label" style="width:12px;">${l}</div>`).join('')}
      </div>
      <div style="display:flex;gap:3px;">${weekCols.join('')}</div>`;

    gridEl.querySelectorAll('.cal-day[data-date]').forEach(el=>{
      el.addEventListener('click', ()=> showMedDayDetail(el.dataset.date));
    });
  }

function showMedDayDetail(dateStr){
    const box = document.getElementById('medDayDetail');
    if(!box) return;
    const label = new Date(dateStr+'T00:00:00').toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long'});
    const rows = state.medications.map(m=>{
      const arr = (state.medCompletions[dateStr]||{})[m.id] || [];
      const taken = arr.filter(Boolean).length;
      const ok = m.timesPerDay>0 && taken >= m.timesPerDay;
      const color = ok ? 'var(--moss-dark)' : taken>0 ? '#7A5A17' : 'var(--rose)';
      return `<div class="med-row" style="padding:7px 0;">
        <div style="flex:1;"><div class="name" style="font-size:13.5px;">${m.name}</div><div class="dose">${m.dose}</div></div>
        <div class="eyebrow" style="color:${color};">${taken}/${m.timesPerDay}</div>
      </div>`;
    }).join('');
    box.innerHTML = `<div class="eyebrow" style="margin-bottom:4px;">${label}</div>` +
      (rows || '<div class="empty">Nenhum medicamento cadastrado.</div>');
  }

document.getElementById('toggleYearCalBtn').addEventListener('click', function(){
    const wrap = document.getElementById('yearCalWrap');
    const showing = wrap.style.display !== 'none';
    wrap.style.display = showing ? 'none' : 'block';
    this.textContent = showing ? 'Ver calendário anual' : 'Ocultar calendário';
    if(!showing) renderYearCalendar();
  });

document.getElementById('addMedBtn').addEventListener('click', ()=>{
    const name = prompt('Nome do medicamento:');
    if(!name) return;
    const dose = prompt('Dose (ex: 20mg):', '') || '';
    const timesPerDay = parseInt(prompt('Quantas vezes ao dia?', '1')) || 1;
    state.medications.push({id:'m'+Date.now(), name, dose, timesPerDay});
    saveState(); renderMeds(); renderHome();
  });
