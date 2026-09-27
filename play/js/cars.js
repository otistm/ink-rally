/* Ink Rally: Cars, upgrades, liveries and reward cards, the saved garage, and each car's performance. */
"use strict";
/* ============================================================
   CARS
   stats multiply the base car in engine.js: top speed, accel, grip on tarmac (grip) and on loose ground (loose),
   turn rate, slide (below 1 = longer slides), boost strength, charge speed, jump height.
   shape is the top-down drawing, in metres with the nose pointing along +x.
   ============================================================ */
const CARS=[
  { id:'scribble', name:'Scribble', kind:'Hatchback', number:9,
    blurb:'A plucky little hatchback. Good at everything, great at nothing.',
    stats:{top:1,accel:1,grip:1,loose:1,turn:1,slide:1,boost:1,charge:1,jump:1},
    shape:{len:4.1,wid:1.85,corner:.5,cabin:[-1.05,.45],screen:.95,rear:-1.35,wing:'lip'} },
  { id:'inkwell', name:'Inkwell GT', kind:'Grand tourer', number:1,
    blurb:'Long, low and very fast. Loves tarmac, hates mud.',
    stats:{top:1.1,accel:1.08,grip:1.06,loose:.85,turn:.95,slide:1,boost:1,charge:1,jump:.9},
    shape:{len:4.7,wid:1.95,corner:.7,cabin:[-1.25,0],screen:.55,rear:-1.6,wing:'big',scoop:true} },
  { id:'mudlark', name:'Mudlark', kind:'4x4', number:44,
    blurb:'Big wheels and soft springs. Sure-footed on gravel and snow, and it flies.',
    stats:{top:.93,accel:.95,grip:.95,loose:1.18,turn:.95,slide:1.1,boost:.9,charge:1,jump:1.2},
    shape:{len:4.4,wid:2.1,corner:.3,cabin:[-1.2,.55],screen:1,rear:-1.5,wing:'none',rack:true,spare:true,wheel:1.25} },
  { id:'quill', name:'Quill', kind:'Buggy', number:3,
    blurb:'A featherweight buggy. Twitchy, slidey and built for boosting.',
    stats:{top:.97,accel:1.05,grip:.95,loose:.95,turn:1.15,slide:.8,boost:1.2,charge:1.4,jump:1.1},
    shape:{len:3.7,wid:1.7,corner:.8,cabin:[-.8,.4],screen:.7,rear:-1,wing:'none',cage:true,wheelsOut:true,wheel:1.15} }
];
// Functional upgrades: four levels each, per car, won from reward cards.
const UPGRADES=[
  { id:'engine', name:'Engine', desc:'Higher top speed and quicker pick-up.' },
  { id:'tyres',  name:'Tyres',  desc:'More grip, so you carry more speed through bends.' },
  { id:'boost',  name:'Boost',  desc:'Boosts charge faster, last longer and push harder.' }
];
const UPMAX=4;
// Liveries are ink patterns painted on the body, won from reward cards. A signature livery (sig) belongs to one car and is only offered while driving it.
const LIVERIES=[
  { id:'plain',   name:'Plain' },
  { id:'stripes', name:'Twin stripes' },
  { id:'band',    name:'Racing band' },
  { id:'checks',  name:'Checkers' },
  { id:'hatch',   name:'Hatched' },
  { id:'dots',    name:'Polka dots' },
  { id:'flames',  name:'Flames' },
  { id:'night',   name:'Night' },
  { id:'doodle',  name:'Doodles',      sig:'scribble' },
  { id:'pin',     name:'Pinstripes',   sig:'inkwell' },
  { id:'camo',    name:'Ink camo',     sig:'mudlark' },
  { id:'feather', name:'Feathers',     sig:'quill' }
];
// how many reward cards each podium place gets to choose from
const PICKS={gold:3,silver:2,bronze:1};
const PLACE={gold:'1st',silver:'2nd',bronze:'3rd'};

/* ============================================================
   SAVED GARAGE (localStorage key inkrally-garage; never rename fields)
   {v:1, car, cars:{id:{up:{engine,tyres,boost}, livery, number}}, liveries:[ids owned; signature ones belong to their car]}
   A car is owned when it has an entry in cars. coins, total and ach (achievements) are from earlier versions: kept, but no longer used.
   ============================================================ */
const GARAGE_KEY='inkrally-garage';
function loadGarage(){
  let g=null; try{ g=JSON.parse(localStorage.getItem(GARAGE_KEY)); }catch(e){}
  if(!g||typeof g!=='object') g={};
  g.v=g.v||1; g.coins=Math.max(0,Math.floor(+g.coins||0)); g.total=Math.max(0,Math.floor(+g.total||0));
  if(!g.cars||typeof g.cars!=='object') g.cars={};
  if(!g.cars.scribble) g.cars.scribble={};
  Object.keys(g.cars).forEach(id=>{ const c=g.cars[id]; if(!CARS.some(d=>d.id===id)){ return; }
    c.up=Object.assign({engine:0,tyres:0,boost:0},c.up||{}); if(!c.livery) c.livery='stripes'; if(!c.number) c.number=CARS.find(d=>d.id===id).number; });
  if(!Array.isArray(g.liveries)) g.liveries=['plain','stripes'];
  if(!g.ach||typeof g.ach!=='object') g.ach={};
  if(!g.car||!g.cars[g.car]) g.car='scribble';
  // achievements are gone: anyone who finished all three for a car keeps that car's signature livery
  const OLD_ACH={scribble:['scr_finish','scr_coins','scr_gold'],inkwell:['gt_speed','gt_clean','gt_chalk'],mudlark:['mud_jump','mud_land','mud_snow'],quill:['q_super','q_drift','q_pine']};
  Object.keys(OLD_ACH).forEach(id=>{ const L=LIVERIES.find(l=>l.sig===id); if(OLD_ACH[id].every(a=>g.ach[a])&&!g.liveries.includes(L.id)) g.liveries.push(L.id); });
  return g;
}
const GARAGE=loadGarage();
function saveGarage(){ try{ localStorage.setItem(GARAGE_KEY,JSON.stringify(GARAGE)); }catch(e){} }
const carDef=id=>CARS.find(c=>c.id===id)||CARS[0];
const owned=id=>!!GARAGE.cars[id];
const FREE_LIVERIES=['plain','stripes'];
const liveryOwned=(lid,carId)=>{ const L=LIVERIES.find(l=>l.id===lid); if(!L||(L.sig&&L.sig!==carId)) return false; return FREE_LIVERIES.includes(lid)||GARAGE.liveries.includes(lid); };

// how this car drives right now, with its upgrades
function perfFor(id){
  const d=carDef(id), st=d.stats, up=(GARAGE.cars[id]||{}).up||{engine:0,tyres:0,boost:0};
  return { top:st.top*(1+.035*up.engine), accel:st.accel*(1+.07*up.engine),
    grip:st.grip*(1+.05*up.tyres), loose:st.loose*(1+.05*up.tyres), k:st.slide*(1+.04*up.tyres), turn:st.turn,
    boostDur:st.boost*(1+.12*up.boost), boostPow:st.boost*(1+.1*up.boost), charge:st.charge*(1+.1*up.boost), jump:st.jump };
}
let PERF=perfFor(GARAGE.car);

/* ============================================================
   REWARD CARDS — like Ink Nine's: after a podium finish you choose one.
   A card is an upgrade level for the car you drove, a new car, or a new livery.
   ============================================================ */
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function rewardOffer(n,carId){
  const cs=GARAGE.cars[carId], def=carDef(carId), out=[];
  const ups=shuffle(UPGRADES.filter(u=>cs.up[u.id]<UPMAX).map(u=>({kind:'up',id:u.id,car:carId,tag:`${def.name} upgrade`,
    name:`${u.name} ${['I','II','III','IV'][cs.up[u.id]]}`,desc:u.desc})));
  const cars=shuffle(CARS.filter(c=>!owned(c.id)).map(c=>({kind:'car',id:c.id,tag:'New car',name:c.name,desc:c.blurb})));
  const livs=shuffle(LIVERIES.filter(l=>(!l.sig||l.sig===carId)&&!liveryOwned(l.id,carId)).map(l=>({kind:'livery',id:l.id,tag:l.sig?`${def.name} signature paint`:'New paint',name:l.name,desc:l.sig?`A livery only the ${def.name} can wear.`:'An ink livery for any of your cars.'})));
  // a card of each kind first, so the choice is a real one, then fill with whatever is left
  [ups,cars,livs].forEach(p=>{ if(p.length&&out.length<n) out.push(p.shift()); });
  const rest=shuffle(ups.concat(cars,livs)); while(out.length<n&&rest.length) out.push(rest.shift());
  return shuffle(out);
}
function applyReward(o){
  if(o.kind==='up') GARAGE.cars[o.car].up[o.id]=Math.min(UPMAX,GARAGE.cars[o.car].up[o.id]+1);
  else if(o.kind==='car'){ if(!GARAGE.cars[o.id]) GARAGE.cars[o.id]={up:{engine:0,tyres:0,boost:0},livery:'stripes',number:carDef(o.id).number}; }
  else if(o.kind==='livery'){ if(!GARAGE.liveries.includes(o.id)) GARAGE.liveries.push(o.id); }
  saveGarage(); PERF=perfFor(GARAGE.car);
}
