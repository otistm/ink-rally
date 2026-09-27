/* Ink Rally: Cars, upgrades, liveries, achievements and reward cards, the saved garage, and each car's performance. */
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
// Liveries are ink patterns painted on the body, won from reward cards. A car's signature livery comes from finishing all its achievements.
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
/* Achievements: three per car, earned while driving that car. Each one earns a bonus reward pick at the end of the stage.
   r is what a run did (see newRun in flow.js). */
const ACHIEVEMENTS=[
  { id:'scr_finish', car:'scribble', name:'Off the line',    desc:'Finish any stage.',                         test:r=>r.finished },
  // (id kept from the old "collect 100 coins" achievement, so saved progress still lines up)
  { id:'scr_coins',  car:'scribble', name:'Boost buddy',     desc:'Fire 5 boosts in one stage.',              test:r=>r.boosts>=5 },
  { id:'scr_gold',   car:'scribble', name:'Scribbled gold',  desc:'Win gold on any stage.',                    test:r=>r.medal==='gold' },
  { id:'gt_speed',   car:'inkwell',  name:'Ton-eighty',      desc:'Hit 180 km/h.',                             test:r=>r.maxKmh>=180 },
  { id:'gt_clean',   car:'inkwell',  name:'Not a scratch',   desc:'Finish a stage without touching a bale or a tree.', test:r=>r.finished&&r.touches===0 },
  { id:'gt_chalk',   car:'inkwell',  name:'Chalk champion',  desc:'Win gold on Chalk Hills.',                  test:r=>r.medal==='gold'&&r.stage==='chalk' },
  { id:'mud_jump',   car:'mudlark',  name:'Air mail',        desc:'Fly 70 m in one jump.',                     test:r=>r.longJump>=70 },
  { id:'mud_land',   car:'mudlark',  name:'Frequent flyer',  desc:'Land 5 jumps or crests in one stage.',      test:r=>r.landings>=5 },
  { id:'mud_snow',   car:'mudlark',  name:'Snow plough',     desc:'Win gold on Frostmere.',                    test:r=>r.medal==='gold'&&r.stage==='frostmere' },
  { id:'q_super',    car:'quill',    name:'Supersonic',      desc:'Get 3 super boosts in one stage.',          test:r=>r.supers>=3 },
  { id:'q_drift',    car:'quill',    name:'Long way round',  desc:'Hold one slide for 3 seconds.',             test:r=>r.longSlide>=3 },
  { id:'q_pine',     car:'quill',    name:'Pinewood ace',    desc:'Win gold on Pinewood.',                     test:r=>r.medal==='gold'&&r.stage==='pinewood' }
];
// how many reward cards each podium place gets to choose from
const PICKS={gold:3,silver:2,bronze:1};
const PLACE={gold:'1st',silver:'2nd',bronze:'3rd'};

/* ============================================================
   SAVED GARAGE (localStorage key inkrally-garage; never rename fields)
   {v:1, car, cars:{id:{up:{engine,tyres,boost}, livery, number}}, liveries:[ids owned, shared by all cars], ach:{id:true}}
   A car is owned when it has an entry in cars. coins and total are from the old coin shop: kept, but no longer used.
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
  return g;
}
const GARAGE=loadGarage();
function saveGarage(){ try{ localStorage.setItem(GARAGE_KEY,JSON.stringify(GARAGE)); }catch(e){} }
const carDef=id=>CARS.find(c=>c.id===id)||CARS[0];
const owned=id=>!!GARAGE.cars[id];
const FREE_LIVERIES=['plain','stripes'];
const liveryOwned=(lid,carId)=>{ const L=LIVERIES.find(l=>l.id===lid); if(!L) return false; if(L.sig) return L.sig===carId&&carDone(carId); return FREE_LIVERIES.includes(lid)||GARAGE.liveries.includes(lid); };
const carDone=id=>ACHIEVEMENTS.filter(a=>a.car===id).every(a=>GARAGE.ach[a.id]);

// how this car drives right now, with its upgrades
function perfFor(id){
  const d=carDef(id), st=d.stats, up=(GARAGE.cars[id]||{}).up||{engine:0,tyres:0,boost:0};
  return { top:st.top*(1+.035*up.engine), accel:st.accel*(1+.07*up.engine),
    grip:st.grip*(1+.05*up.tyres), loose:st.loose*(1+.05*up.tyres), k:st.slide*(1+.04*up.tyres), turn:st.turn,
    boostDur:st.boost*(1+.12*up.boost), boostPow:st.boost*(1+.1*up.boost), charge:st.charge*(1+.1*up.boost), jump:st.jump };
}
let PERF=perfFor(GARAGE.car);

/* ============================================================
   REWARD CARDS — like Ink Nine's: after a podium finish (or an achievement) you choose one.
   A card is an upgrade level for the car you drove, a new car, or a new livery.
   ============================================================ */
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function rewardOffer(n,carId){
  const cs=GARAGE.cars[carId], def=carDef(carId), out=[];
  const ups=shuffle(UPGRADES.filter(u=>cs.up[u.id]<UPMAX).map(u=>({kind:'up',id:u.id,car:carId,tag:`${def.name} upgrade`,
    name:`${u.name} ${['I','II','III','IV'][cs.up[u.id]]}`,desc:u.desc})));
  const cars=shuffle(CARS.filter(c=>!owned(c.id)).map(c=>({kind:'car',id:c.id,tag:'New car',name:c.name,desc:c.blurb})));
  const livs=shuffle(LIVERIES.filter(l=>!l.sig&&!liveryOwned(l.id,carId)).map(l=>({kind:'livery',id:l.id,tag:'New paint',name:l.name,desc:'An ink livery for any of your cars.'})));
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
