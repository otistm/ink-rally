/* Ink Rally: Saved progress, the stages screen, pause and the finish card. */
"use strict";
/* ============================================================
   SAVED PROGRESS (localStorage; never rename these keys)
   inkrally-bests: {stageId:{t, splits:[s1,s2], rev, old}}   inkrally-meta: {v:1, voice}
   rev is the stage layout the time was set on (missing means 1). A time from an older layout is kept under `old`, never deleted.
   ============================================================ */
function load(k,d){ try{ const v=JSON.parse(localStorage.getItem(k)); return v&&typeof v==='object'?v:d; }catch(e){ return d; } }
function store(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
const bests=load('inkrally-bests',{});
const meta=Object.assign({v:1,voice:true},load('inkrally-meta',{}));
voiceOn=meta.voice!==false;
const revOf=id=>{ const d=STAGES.find(s=>s.id===id); return d&&d.rev||1; };
function bestFor(id){ const b=bests[id]; return b&&isFinite(b.t)&&(b.rev||1)===revOf(id)?b:null; }
function medalFor(st,t){ const m=st.medals; return t<=m.gold?'gold':t<=m.silver?'silver':t<=m.bronze?'bronze':null; }
const MEDAL={gold:'Gold',silver:'Silver',bronze:'Bronze'};

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
function openCard(html,home){ const c=$('card'); $('panel').innerHTML=html; c.classList.toggle('home',!!home); c.hidden=false; $('panel').style.animation='none'; void $('panel').offsetWidth; $('panel').style.animation=''; }
function closeCard(){ $('card').hidden=true; }

function showHome(){
  S.st='home'; hudShow(false); hush(); engineSet(0,false,0,false,false);
  const rows=STAGES.map((def,i)=>{ const st=stageFor(def), b=bestFor(def.id), m=b?medalFor(st,b.t):null;
    return `<button class="event" data-id="${def.id}" style="animation-delay:${.1+i*.08}s">
      <div class="tw-wrap">${trophySvg(m,38)}<small>${b?fmt(b.t):'No time'}</small></div>
      <div class="ev"><i>Stage ${i+1} · ${SURF[def.surface].name} · ${(st.length/1000).toFixed(1)} km</i><b>${def.name}</b><span>${def.blurb}</span></div></button>`; }).join('');
  const car=carDef(GARAGE.car);
  openCard(`<h2 class="logo">Ink Rally</h2><p>Drive fast. Stay on the road. Get trophies.</p>
    <button class="shopbtn" id="toGarage"><canvas></canvas><span><b>Garage</b><small>${car.name} · upgrade and paint</small></span><span class="wal"><i class="coin" aria-hidden="true"></i>${GARAGE.coins.toLocaleString()}</span></button>
    <div class="events">${rows}</div>
    <div class="how"><b>How to drive.</b> Your car goes by itself. Put your thumb on the wheel at the bottom and turn it left or right to steer. Let go and it straightens up.<br>
    Turn hard and the car slides. Hold the slide through a bend, then straighten up for a <b>boost</b>.<br>
    Your co-driver calls each bend before you reach it. The number is how fast it is: <b>1</b> is a crawl, <b>6</b> is nearly flat out.</div>
    <button class="fbc${voiceOn?' on':''}" id="voiceBtn" aria-pressed="${voiceOn}">Co-driver voice: ${voiceOn?'on':'off'}</button>
    <p class="ver">Version ${VERSION}</p>`,true);
  document.querySelectorAll('.event').forEach(b=>b.onclick=()=>{ audioInit(); startStage(b.dataset.id); });
  { const cs=GARAGE.cars[GARAGE.car]; carThumb($('toGarage').querySelector('canvas'),GARAGE.car,cs.livery,cs.number,{ang:-.3,zoom:.9}); }
  $('toGarage').onclick=()=>{ audioInit(); GV.car=GARAGE.car; GV.tab='up'; showGarage('home'); };
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
function showFinish(again){
  if(again&&S.finHTML){ openCard(S.finHTML); wireFinish(); return; }
  const st=S.stage, id=st.def.id, t=S.finT, prev=bestFor(id), isBest=!prev||t<prev.t, m=medalFor(st,t), pm=prev?medalFor(st,prev.t):null;
  if(isBest){ const was=bests[id], old=was&&(was.rev||1)!==revOf(id)?was:was&&was.old;
    bests[id]={t,splits:S.splitT.slice(),rev:revOf(id)}; if(old) bests[id].old=old; store('inkrally-bests',bests); }
  const rows=[['Gold',st.medals.gold],['Silver',st.medals.silver],['Bronze',st.medals.bronze]].map(r=>({nm:r[0],t:r[1]}));
  rows.push({nm:'You',t,me:true}); rows.sort((a,b)=>a.t-b.t);
  const board=rows.map((r,i)=>`<div class="row${r.me?' me':''}" style="animation-delay:${.3+i*.07}s"><span class="pos">${i+1}</span><span class="nm">${r.nm}</span><i></i><b>${fmt(r.t)}</b></div>`).join('');
  const i=STAGES.findIndex(d=>d.id===id), next=STAGES[i+1];
  const newMedal=m&&(!pm||['gold','silver','bronze'].indexOf(m)<['gold','silver','bronze'].indexOf(pm));
  const B=S.banked||{coins:0,bonus:0,of:0}, achPay=S.newAch.reduce((a,x)=>a+x.reward,0);
  const earn=`<div class="earn"><div><span>Coins picked up</span><span>${B.coins} of ${B.of}</span></div>
    ${B.bonus?`<div><span>${MEDAL[m]} bonus</span><span>+${B.bonus}</span></div>`:''}
    ${S.newAch.map(a=>`<div class="ach"><span>Achievement: ${a.name}</span><span>+${a.reward}</span></div>`).join('')}
    <div class="tot"><span>Earned</span><span><i class="coin" aria-hidden="true"></i>+${B.coins+B.bonus+achPay}</span></div>
    <div><span>In your garage</span><span>${GARAGE.coins.toLocaleString()}</span></div></div>`;
  S.finHTML=`<h2>${isBest&&prev?'New best!':'Stage clear'}</h2><p>${st.def.name}</p>
    <div class="big">${fmt(t)}</div>
    <p class="nxt">${prev?(isBest?`${fmtDiff(t-prev.t)} on your best`:`Your best is ${fmt(prev.t)} (${fmtDiff(t-prev.t)})`):'First time through'}</p>
    ${m?`<div class="award">${trophySvg(m,64)}<p>${MEDAL[m]}${newMedal?'!':''}</p></div>`:`<p class="perk">Beat ${fmt(st.medals.bronze)} for a trophy.</p>`}
    ${earn}
    <div class="board">${board}</div>
    <button class="btn" id="fAgain">Drive it again</button>
    <button class="btn ghost" id="fGarage">Garage</button>
    ${next?`<button class="btn ghost" id="fNext">Next stage: ${next.name}</button>`:''}
    <button class="btn ghost" id="fHome">Stages</button>`;
  openCard(S.finHTML); wireFinish();
  if(m) setTimeout(()=>sfx('finish'),250);
}
function wireFinish(){
  const id=S.stage.def.id, i=STAGES.findIndex(d=>d.id===id), next=STAGES[i+1];
  $('fAgain').onclick=()=>startStage(id);
  $('fGarage').onclick=()=>{ GV.car=GARAGE.car; GV.tab='up'; showGarage('finish'); };
  if(next) $('fNext').onclick=()=>startStage(next.id);
  $('fHome').onclick=showHome;
}
