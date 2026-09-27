/* Ink Rally: Saved progress, the stages screen, pause and the finish card. */
"use strict";
/* ============================================================
   SAVED PROGRESS (localStorage; never rename these keys)
   inkrally-bests: {stageId:{t, splits:[s1,s2], rev, old}}   inkrally-meta: {v:1, voice, name, grp}
   rev is the stage layout the time was set on (missing means 1). A time from an older layout is kept under `old`, never deleted.
   ============================================================ */
function load(k,d){ try{ const v=JSON.parse(localStorage.getItem(k)); return v&&typeof v==='object'?v:d; }catch(e){ return d; } }
function store(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
const bests=load('inkrally-bests',{});
const meta=Object.assign({v:1,voice:true,name:'',grp:''},load('inkrally-meta',{}));
voiceOn=meta.voice!==false;
const revOf=id=>{ const d=STAGES.find(s=>s.id===id); return d&&d.rev||1; };
function bestFor(id){ const b=bests[id]; return b&&isFinite(b.t)&&(b.rev||1)===revOf(id)?b:null; }
function medalFor(st,t){ const m=st.medals; return t<=m.gold?'gold':t<=m.silver?'silver':t<=m.bronze?'bronze':null; }
const MEDAL={gold:'Gold',silver:'Silver',bronze:'Bronze'};
// three rival drivers set the pace on every stage: beat Flick for 1st, Gus for 2nd, Nell for 3rd
const RIVALS={gold:{name:'Flick Moreau',bio:'gold pace'},silver:{name:'Gus Paddock',bio:'silver pace'},bronze:{name:'Nell Quarry',bio:'bronze pace'}};

// trophies are told apart by ink alone: gold is solid with a star, silver is hatched, bronze is an outline
function trophySvg(kind,size=40){
  const fill=kind==='gold'?'#000':kind==='silver'?'url(#hx)':'#fff', dash=kind?'':' stroke-dasharray="3 3"', op=kind?1:.45;
  return `<svg class="troph" width="${size}" height="${size*1.1}" viewBox="0 0 40 44" aria-hidden="true" style="opacity:${op}">
  <defs><pattern id="hx" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="#fff"/><line x1="0" y1="0" x2="0" y2="4" stroke="#000" stroke-width="1.6"/></pattern></defs>
  <g stroke="#000" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"${dash}>
  <path d="M10 7H5c0 6 3 9 6.5 9.5M30 7h5c0 6-3 9-6.5 9.5" fill="none"/><path d="M10 4h20v9c0 7-4.5 11-10 11S10 20 10 13z" fill="${fill}"/>
  <path d="M17 24h6v6h-6z" fill="#fff"/><path d="M11 31h18v6H11z" fill="${kind?'#000':'#fff'}"/></g>
  ${kind==='gold'?'<path d="M20 7.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#fff"/>':''}</svg>`;
}
// still: redraw the card in place without its entrance bounce (used between reward picks)
function openCard(html,home,still){ const c=$('card'), P=$('panel'), top=c.scrollTop; P.innerHTML=html; c.classList.toggle('home',!!home); c.hidden=false; P.classList.toggle('still',!!still);
  if(still){ c.scrollTop=top; return; } P.style.animation='none'; void P.offsetWidth; P.style.animation=''; }
function closeCard(){ $('card').hidden=true; }

function showHome(){
  S.st='home'; hudShow(false); hush(); engineSet(0,false,0,false,false);
  const rows=STAGES.map((def,i)=>{ const st=stageFor(def), b=bestFor(def.id), m=b?medalFor(st,b.t):null;
    return `<button class="event" data-id="${def.id}" style="animation-delay:${.1+i*.08}s">
      <div class="tw-wrap">${trophySvg(m,38)}<small>${b?fmt(b.t):'No time'}</small></div>
      <div class="ev"><i>Stage ${i+1} · ${SURF[def.surface].name} · ${(st.length/1000).toFixed(1)} km</i><b>${def.name}</b><span>${def.blurb}</span></div></button>`; }).join('');
  const car=carDef(GARAGE.car);
  openCard(`<h2 class="logo">Ink Rally</h2><p>Drive fast. Stay on the road. Get trophies.</p>
    <button class="shopbtn" id="toGarage"><canvas></canvas><span><b>Garage</b><small>${car.name} · cars, upgrades and paint</small></span></button>
    ${ONLINE?`<p class="asname">Driving as <b>${esc(meta.name)}</b>${meta.grp?` in <b>${esc(meta.grp)}</b>`:''} <button class="linkbtn" id="editName">Change name or group</button></p>`:''}
    <div class="events">${rows}</div>
    ${ONLINE?'<p class="netline center" id="netline">Going online…</p>':''}
    <button class="fbc${voiceOn?' on':''}" id="voiceBtn" aria-pressed="${voiceOn}">Co-driver voice: ${voiceOn?'on':'off'}</button>
    <p class="ver">Version ${VERSION}</p>`,true);
  document.querySelectorAll('.event').forEach(b=>b.onclick=()=>{ audioInit(); startStage(b.dataset.id); });
  { const cs=GARAGE.cars[GARAGE.car]; carThumb($('toGarage').querySelector('canvas'),GARAGE.car,cs.livery,cs.number,{ang:-.3,zoom:.9}); }
  $('toGarage').onclick=()=>{ audioInit(); GV.car=GARAGE.car; GV.tab='up'; showGarage('home'); };
  if($('editName')) $('editName').onclick=()=>showName(true);
  refreshNetLine();
  $('voiceBtn').onclick=()=>{ voiceOn=!voiceOn; meta.voice=voiceOn; store('inkrally-meta',meta); showHome(); if(voiceOn) say('Voice on',true); };
}
function showPause(){
  if(S.st!=='drive'&&S.st!=='count') return;
  S.paused=S.st; S.st='pause'; hush(); engineSet(0,false,0,false,false); IN.reset();
  openCard(`<h2>Paused</h2><p>${S.def.name} · ${fmt(S.race)}</p>
    <button class="btn" id="pResume">Keep driving</button>
    <button class="btn ghost" id="pRestart">Restart the stage</button>
    <button class="btn ghost" id="pHome">Stages</button>`);
  $('pResume').onclick=()=>{ closeCard(); S.st=S.paused; lastT=performance.now(); };
  $('pRestart').onclick=()=>startStage(S.def.id);
  $('pHome').onclick=showHome;
}
/* The finish card. A podium place (and each achievement) earns a reward pick, chosen from cards like Ink Nine's.
   The buttons to move on appear once every pick is made, so a reward is never skipped by accident. */
function showFinish(again){
  if(!again||!S.fin){
    const st=S.stage, id=st.def.id, t=S.finT, prev=bestFor(id), isBest=!prev||t<prev.t, m=medalFor(st,t), pm=prev?medalFor(st,prev.t):null;
    if(isBest){ const was=bests[id], old=was&&(was.rev||1)!==revOf(id)?was:was&&was.old;
      bests[id]={t,splits:S.splitT.slice(),rev:revOf(id)}; if(old) bests[id].old=old; store('inkrally-bests',bests); }
    const rows=['gold','silver','bronze'].map(k=>({nm:RIVALS[k].name,bio:RIVALS[k].bio,t:st.medals[k]}));
    rows.push({nm:meta.name?`${esc(meta.name)} (you)`:'You',t,me:true}); rows.sort((a,b)=>a.t-b.t);
    const board=rows.map((r,i)=>`<div class="row${r.me?' me':''}" style="animation-delay:${.3+i*.07}s"><span class="pos">${i+1}</span><span class="nm">${r.nm}${r.bio?`<small>${r.bio}</small>`:''}</span><i></i><b>${fmt(r.t)}</b></div>`).join('');
    const newMedal=m&&(!pm||['gold','silver','bronze'].indexOf(m)<['gold','silver','bronze'].indexOf(pm));
    S.fin={top:`<h2>${m?PLACE[m]+' place'+(m==='gold'?'!':''):isBest&&prev?'New best!':'Stage clear'}</h2><p>${st.def.name}${m&&isBest&&prev?' · a new best':''}</p>
      <div class="big">${fmt(t)}</div>
      <p class="nxt">${prev?(isBest?`${fmtDiff(t-prev.t)} on your best`:`Your best is ${fmt(prev.t)} (${fmtDiff(t-prev.t)})`):'First time through'}</p>
      ${m?`<div class="award">${trophySvg(m,64)}<p>${MEDAL[m]}${newMedal?'!':''}</p></div>`:`<p class="perk">Beat ${fmt(st.medals.bronze)} for 3rd place and a reward.</p>`}`,
      board:`<h3>This run</h3><div class="board">${board}</div>`};
    if(m) setTimeout(()=>sfx('finish'),250);
  }
  renderFinish(false);
}
function renderFinish(still){
  const id=S.stage.def.id, i=STAGES.findIndex(d=>d.id===id), next=STAGES[i+1];
  // the next pick still to make; offers are dealt once and kept, so leaving for the garage and back shows the same cards
  let g=S.picks.find(p=>!p.done);
  while(g&&!(g.offer=g.offer||rewardOffer(g.n,S.run.car)).length){ g.done=true; g=S.picks.find(p=>!p.done); }
  const won=S.chosen.length?`<div class="won"><b>Your reward${S.chosen.length>1?'s':''}</b>${S.chosen.map(o=>`<span>${o.name}${o.kind==='up'?` for the ${carDef(o.car).name}`:''}</span>`).join('')}</div>`:'';
  const pick=g?`<h3>${g.why}: ${g.n>1?'choose a reward':'your reward'}</h3><div class="picks">${g.offer.map((o,k)=>`<button class="pick" data-k="${k}" style="animation-delay:${.15+k*.09}s"><i>${o.tag}</i><b>${o.name}</b><span>${o.desc}</span></button>`).join('')}</div>`:'';
  const btns=g?'':`<button class="btn" id="fAgain">Drive it again</button>
    <button class="btn ghost" id="fGarage">Garage</button>
    ${next?`<button class="btn ghost" id="fNext">Next stage: ${next.name}</button>`:''}
    <button class="btn ghost" id="fHome">Stages</button>`;
  openCard(S.fin.top+won+pick+S.fin.board+leaderboardHTML()+btns,false,still);
  if(g){ document.querySelectorAll('.pick').forEach(b=>b.onclick=()=>{ if(g.done) return; g.done=true; audioInit();
      const o=g.offer[+b.dataset.k]; applyReward(o); S.chosen.push(o); b.classList.add('chosen'); sfx('buy');
      setTimeout(()=>renderFinish(true),480); }); return; }
  $('fAgain').onclick=()=>startStage(id);
  $('fGarage').onclick=()=>{ GV.car=GARAGE.car; GV.tab='up'; showGarage('finish'); };
  if(next) $('fNext').onclick=()=>startStage(next.id);
  $('fHome').onclick=showHome;
}

/* ============================================================
   NAME AND GROUP — like Ink Nine: the name friends see over your ghost and on the leaderboard,
   and an optional group code so a crew of friends only race each other
   ============================================================ */
function showName(editing){
  S.st='home'; hudShow(false);
  openCard(`<h2 class="logo">Ink Rally</h2><p>${editing?'Change the name friends see on the leaderboard and over your ghost car.':'What should we call you? Friends will see this name on the leaderboard and over your ghost car.'}</p>
    <form id="nameForm" class="nameform" autocomplete="off"><label for="nameIn">Your name</label>
    <input id="nameIn" maxlength="16" placeholder="Your name" value="${esc(meta.name||'')}" autocapitalize="words" spellcheck="false" enterkeyhint="go">
    ${ONLINE?`<label for="grpIn">Group code (optional)</label><input id="grpIn" class="grpin" maxlength="24" placeholder="e.g. sunday-crew" value="${esc(meta.grp||'')}" autocapitalize="none" spellcheck="false">
    <small class="nhelp">Friends who enter the same code race each other's ghosts and share a leaderboard. Leave it empty to race everyone.</small>`:''}
    <p class="nerr" id="nerr"></p><button class="btn" type="submit">${editing?'Save':'Start your engine'}</button>
    ${editing?'<button class="btn ghost" type="button" id="nameBack">Back</button>':''}</form>`,true);
  const inp=$('nameIn'); setTimeout(()=>inp.focus(),120);
  $('nameForm').onsubmit=e=>{ e.preventDefault(); audioInit();
    const v=inp.value.replace(/\s+/g,' ').trim();
    if(!v){ $('nerr').textContent='Enter a name to start.'; inp.classList.remove('nope'); void inp.offsetWidth; inp.classList.add('nope'); sfx('nope'); return; }
    meta.name=v.slice(0,16); if($('grpIn')) meta.grp=$('grpIn').value.toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,24);
    store('inkrally-meta',meta); syncName(); sfx('buy'); showHome(); };
  if(editing) $('nameBack').onclick=showHome;
}
async function refreshNetLine(){
  if(!ONLINE) return; await NET.ready; const el=$('netline'); if(!el) return;
  if(NET.err){ el.textContent='Online play problem: '+NET.err; el.classList.add('bad'); return; }
  if(!NET.sb){ el.textContent='Online play is offline right now.'; return; }
  try{ const {data,error}=await NET.sb.from('rally_runs').select('player_id,name').eq('grp',meta.grp||'');
    if(error) throw error;
    const others=[...new Map((data||[]).filter(r=>r.player_id!==NET.uid).map(r=>[r.player_id,r.name||'Driver'])).values()];
    const where=meta.grp?`group ${meta.grp}`:'the open group';
    if($('netline')) el.textContent=others.length?`Online in ${where} with ${others.slice(0,6).join(', ')}${others.length>6?` and ${others.length-6} more`:''}.`:`Online in ${where}. Nobody else has set a time yet.`;
  }catch(e){ el.textContent='Online play problem: '+(e.message||e.code||'could not read the leaderboard'); el.classList.add('bad'); }
}
