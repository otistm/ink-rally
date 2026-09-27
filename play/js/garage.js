/* Ink Rally: The garage. Pick your car, see its upgrades, paint it and set its number.
   Everything here is won from reward cards after a podium finish. */
"use strict";
/* ============================================================
   GARAGE
   ============================================================ */
let GV={car:null,tab:'up',raf:0,bounce:0};

// draw a car into a small canvas: nose pointing right, tipped a little so it reads as a toy on the page
function carThumb(cv,id,livery,number,o={}){
  const d=Math.min(2,devicePixelRatio||1), w=cv.clientWidth||cv.width, h=cv.clientHeight||cv.height;
  cv.width=Math.round(w*d); cv.height=Math.round(h*d); const g=cv.getContext('2d'), def=carDef(id), sh=def.shape;
  const s=Math.min(w/(sh.len+(sh.wing==='big'||sh.spare?1.4:.8)), h/(sh.wid+(sh.wheelsOut?1.2:.7)))*(o.zoom||1);
  g.setTransform(d,0,0,d,0,0); g.clearRect(0,0,w,h);
  g.save(); g.translate(w/2+(o.dx||0),h/2+(o.dy||0)); g.rotate(o.ang||0); g.scale(s,s);
  g.fillStyle='rgba(0,0,0,.14)'; rr(g,-sh.len/2+.25,-sh.wid/2+.3,sh.len,sh.wid,.5); g.fill();
  const sq=o.sq||0; g.scale(1-sq*.2,1+sq*.35);
  drawCarShape(g,def,livery,number,{px:1/s,steer:o.steer||0,roll:o.roll||0});
  g.restore();
}
function showGarage(from){
  S.st='home'; hudShow(false); hush(); engineSet(0,false,0,false,false);
  GV.from=from||'home'; if(!GV.car) GV.car=GARAGE.car; renderGarage();
}
function renderGarage(){
  const id=GV.car, def=carDef(id), have=owned(id), cs=GARAGE.cars[id];
  const picks=CARS.map(c=>`<button class="cp${c.id===id?' on':''}${owned(c.id)?'':' lock'}" data-car="${c.id}" aria-pressed="${c.id===id}"><canvas></canvas>${c.name.split(' ')[0]}</button>`).join('');
  const P=perfFor(id);
  const stat=(n,v)=>`<span>${n}</span><div class="bar"><i style="transform:scaleX(${clamp(v,.08,1).toFixed(3)})"></i></div>`;
  const stats=stat('Top speed',(P.top-.85)/.45)+stat('Grip on tarmac',(P.grip-.8)/.55)+stat('Grip on gravel and snow',(P.loose-.75)/.65)+stat('Boost',((P.boostPow+P.charge)/2-.8)/.8)+stat('Jumps',(P.jump-.8)/.6);
  const tabs=have?`<div class="tabs" role="tablist">${[['up','Upgrades'],['paint','Paint']].map(([k,n])=>`<button class="tab${GV.tab===k?' on':''}" role="tab" aria-selected="${GV.tab===k}" data-tab="${k}">${n}</button>`).join('')}</div>`:'';
  let body='';
  if(!have){
    body=`<p class="cblurb">${def.blurb}</p><div class="stats">${stats}</div>
      <p class="sighint">Not in your garage yet. Finish a stage in the top three, then choose it from the reward cards.</p>`;
  } else if(GV.tab==='up'){
    body=`<p class="cblurb">${def.blurb}</p><div class="stats">${stats}</div><div class="gl">${UPGRADES.map(u=>{ const lv=cs.up[u.id];
      return `<div class="srow"><div class="sinfo"><b>${u.name}</b><small>${u.desc}</small><span class="pips" aria-label="Level ${lv} of ${UPMAX}">${Array.from({length:UPMAX},(_,i)=>`<i class="${i<lv?'on':''}"></i>`).join('')}</span></div>
        <span class="tagx">${lv>=UPMAX?'Maxed':`Level ${lv} of ${UPMAX}`}</span></div>`; }).join('')}</div>
      <p class="sighint">Win upgrades for the ${def.name} by driving it: finish in the top three and choose one from the reward cards.</p>`;
  } else if(GV.tab==='paint'){
    body=`<div class="lv">${LIVERIES.filter(l=>!l.sig||l.sig===id).map(l=>{ const got=liveryOwned(l.id,id), on=cs.livery===l.id;
      const tag=on?'On':got?'Owned':'Reward card';
      return `<button class="lvb${on?' on':''}${got?'':' lock'}" data-liv="${l.id}" aria-pressed="${on}"><canvas></canvas>${l.name}<small>${tag}</small></button>`; }).join('')}</div>
      <p class="sighint">Paint is won from reward cards. Each car also has a signature livery that only it can wear, offered while you drive it.</p>
      <p class="perk" id="gmsg"></p>`;
  }
  openCard(`<h2>Garage</h2>
    <div class="carpick">${picks}</div>
    <div class="stage"><canvas id="gcar" aria-label="${def.name}"></canvas>
      <div class="cap"><b>${def.name}</b><small>${def.kind}${have?'':' · not won yet'}</small></div>
      ${have?`<div class="num" aria-label="Race number"><button id="numDn" aria-label="Lower number">−</button><b id="numV">${cs.number}</b><button id="numUp" aria-label="Higher number">+</button></div>`:''}</div>
    ${have&&GARAGE.car!==id?`<button class="btn" id="useCar">Drive the ${def.name}</button><p></p>`:''}
    ${tabs}${body}
    <button class="btn ghost" id="gDone">${GV.from==='finish'?'Back':'Done'}</button>`,true);
  // wire it up
  document.querySelectorAll('.cp').forEach(b=>{ carThumb(b.querySelector('canvas'),b.dataset.car,(GARAGE.cars[b.dataset.car]||{}).livery||'stripes',(GARAGE.cars[b.dataset.car]||{}).number||carDef(b.dataset.car).number);
    b.onclick=()=>{ GV.car=b.dataset.car; if(owned(GV.car)) { GARAGE.car=GV.car; saveGarage(); PERF=perfFor(GARAGE.car); } GV.bounce=1; renderGarage(); }; });
  document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{ GV.tab=b.dataset.tab; renderGarage(); });
  document.querySelectorAll('.lvb').forEach(b=>{ carThumb(b.querySelector("canvas"),id,b.dataset.liv,cs.number,{zoom:1.12}); b.onclick=()=>pickLivery(b); });
  if($('useCar')) $('useCar').onclick=()=>{ GARAGE.car=id; saveGarage(); PERF=perfFor(id); sfx('buy'); renderGarage(); };
  if($('numUp')) $('numUp').onclick=()=>setNumber(1);
  if($('numDn')) $('numDn').onclick=()=>setNumber(-1);
  $('gDone').onclick=()=>{ cancelAnimationFrame(GV.raf); GV.raf=0; if(GV.from==='finish'&&S.stage) showFinish(true); else showHome(); };
  $('gcar').onclick=()=>{ GV.bounce=1; audioInit(); sfx('bump',.5); };
  startPreview();
}
// the car in the garage bobs on its springs and twitches its wheels; tap it to bounce it
function startPreview(){
  cancelAnimationFrame(GV.raf); const cv=$('gcar'); if(!cv) return; const t0=performance.now();
  const id=GV.car, cs=GARAGE.cars[id], liv=cs?cs.livery:'stripes', num=cs?cs.number:carDef(id).number;
  const tick=now=>{ if(!document.body.contains(cv)) return; const t=(now-t0)/1000;
    GV.bounce*=.9; const sq=RM?0:Math.sin(t*2.2)*.03+Math.sin(now/60)*GV.bounce*.25;
    carThumb(cv,id,liv,num,{ang:-.35+(RM?0:Math.sin(t*.7)*.08),steer:RM?0:Math.sin(t*1.3)*.35,sq,zoom:.5,dy:16});
    GV.raf=requestAnimationFrame(tick); };
  GV.raf=requestAnimationFrame(tick);
}
function nope(el,msg){ sfx('nope'); if(el){ el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); } if(msg&&$('gmsg')) $('gmsg').textContent=msg; }
function pickLivery(b){
  const lid=b.dataset.liv, L=LIVERIES.find(l=>l.id===lid), cs=GARAGE.cars[GV.car]; audioInit();
  if(!liveryOwned(lid,GV.car)) return nope(b,`${L.name} is won from reward cards. Finish a stage in the top three, then choose it from the reward cards.`);
  sfx('tick'); cs.livery=lid; saveGarage(); GV.bounce=1; renderGarage();
}
function setNumber(d){ const cs=GARAGE.cars[GV.car]; cs.number=((cs.number-1+d+99)%99)+1; saveGarage(); $('numV').textContent=cs.number; audioInit(); sfx('tick'); startPreview(); }
