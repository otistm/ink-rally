/* Ink Rally: Cars, upgrades, liveries and achievements, the saved garage, and each car's performance. */
"use strict";
/* ============================================================
   CARS
   stats multiply the base car in engine.js: top speed, accel, grip on tarmac (grip) and on loose ground (loose),
   turn rate, slide (below 1 = longer slides), boost strength, charge speed, jump height.
   shape is the top-down drawing, in metres with the nose pointing along +x.
   ============================================================ */
const CARS=[
  { id:'scribble', name:'Scribble', kind:'Hatchback', price:0, number:9,
    blurb:'A plucky little hatchback. Good at everything, great at nothing.',
    stats:{top:1,accel:1,grip:1,loose:1,turn:1,slide:1,boost:1,charge:1,jump:1},
    shape:{len:4.1,wid:1.85,corner:.5,cabin:[-1.05,.45],screen:.95,rear:-1.35,wing:'lip'} },
  { id:'inkwell', name:'Inkwell GT', kind:'Grand tourer', price:600, number:1,
    blurb:'Long, low and very fast. Loves tarmac, hates mud.',
    stats:{top:1.1,accel:1.08,grip:1.06,loose:.85,turn:.95,slide:1,boost:1,charge:1,jump:.9},
    shape:{len:4.7,wid:1.95,corner:.7,cabin:[-1.25,0],screen:.55,rear:-1.6,wing:'big',scoop:true} },
  { id:'mudlark', name:'Mudlark', kind:'4x4', price:600, number:44,
    blurb:'Big wheels and soft springs. Sure-footed on gravel and snow, and it flies.',
    stats:{top:.93,accel:.95,grip:.95,loose:1.18,turn:.95,slide:1.1,boost:.9,charge:1,jump:1.2},
    shape:{len:4.4,wid:2.1,corner:.3,cabin:[-1.2,.55],screen:1,rear:-1.5,wing:'none',rack:true,spare:true,wheel:1.25} },
  { id:'quill', name:'Quill', kind:'Buggy', price:900, number:3,
    blurb:'A featherweight buggy. Twitchy, slidey and built for boosting.',
    stats:{top:.97,accel:1.05,grip:.95,loose:.95,turn:1.15,slide:.8,boost:1.2,charge:1.4,jump:1.1},
    shape:{len:3.7,wid:1.7,corner:.8,cabin:[-.8,.4],screen:.7,rear:-1,wing:'none',cage:true,wheelsOut:true,wheel:1.15} }
];
// Functional upgrades: four levels each, bought per car.
const UPGRADES=[
  { id:'engine', name:'Engine', desc:'Higher top speed and quicker pick-up.', cost:[50,100,160,240] },
  { id:'tyres',  name:'Tyres',  desc:'More grip, so you carry more speed through bends.', cost:[50,100,160,240] },
  { id:'boost',  name:'Boost',  desc:'Boosts charge faster, last longer and push harder.', cost:[60,120,180,260] }
];
const UPMAX=4;
// Liveries are ink patterns painted on the body. A car's signature livery comes from finishing all its achievements.
const LIVERIES=[
  { id:'plain',   name:'Plain',        cost:0 },
  { id:'stripes', name:'Twin stripes', cost:0 },
  { id:'band',    name:'Racing band',  cost:80 },
  { id:'checks',  name:'Checkers',     cost:120 },
  { id:'hatch',   name:'Hatched',      cost:120 },
  { id:'dots',    name:'Polka dots',   cost:160 },
  { id:'flames',  name:'Flames',       cost:250 },
  { id:'night',   name:'Night',        cost:300 },
  { id:'doodle',  name:'Doodles',      sig:'scribble' },
  { id:'pin',     name:'Pinstripes',   sig:'inkwell' },
  { id:'camo',    name:'Ink camo',     sig:'mudlark' },
  { id:'feather', name:'Feathers',     sig:'quill' }
];
/* Achievements: three per car, earned while driving that car. r is what a run did (see newRun in flow.js). */
const ACHIEVEMENTS=[
  { id:'scr_finish', car:'scribble', name:'Off the line',    desc:'Finish any stage.',                         reward:20,  test:r=>r.finished },
  { id:'scr_coins',  car:'scribble', name:'Pocket money',    desc:'Collect 100 coins in one stage.',           reward:50,  test:r=>r.coins>=100 },
  { id:'scr_gold',   car:'scribble', name:'Scribbled gold',  desc:'Win gold on any stage.',                    reward:80,  test:r=>r.medal==='gold' },
  { id:'gt_speed',   car:'inkwell',  name:'Ton-eighty',      desc:'Hit 180 km/h.',                             reward:50,  test:r=>r.maxKmh>=180 },
  { id:'gt_clean',   car:'inkwell',  name:'Not a scratch',   desc:'Finish a stage without touching a bale or a tree.', reward:80, test:r=>r.finished&&r.touches===0 },
  { id:'gt_chalk',   car:'inkwell',  name:'Chalk champion',  desc:'Win gold on Chalk Hills.',                  reward:100, test:r=>r.medal==='gold'&&r.stage==='chalk' },
  { id:'mud_jump',   car:'mudlark',  name:'Air mail',        desc:'Fly 70 m in one jump.',                     reward:60,  test:r=>r.longJump>=70 },
  { id:'mud_land',   car:'mudlark',  name:'Frequent flyer',  desc:'Land 5 jumps or crests in one stage.',      reward:60,  test:r=>r.landings>=5 },
  { id:'mud_snow',   car:'mudlark',  name:'Snow plough',     desc:'Win gold on Frostmere.',                    reward:100, test:r=>r.medal==='gold'&&r.stage==='frostmere' },
  { id:'q_super',    car:'quill',    name:'Supersonic',      desc:'Get 3 super boosts in one stage.',          reward:60,  test:r=>r.supers>=3 },
  { id:'q_drift',    car:'quill',    name:'Long way round',  desc:'Hold one slide for 3 seconds.',             reward:60,  test:r=>r.longSlide>=3 },
  { id:'q_pine',     car:'quill',    name:'Pinewood ace',    desc:'Win gold on Pinewood.',                     reward:100, test:r=>r.medal==='gold'&&r.stage==='pinewood' }
];
const MEDAL_COINS={gold:50,silver:30,bronze:15};

/* ============================================================
   SAVED GARAGE (localStorage key inkrally-garage; never rename fields)
   {v:1, coins, car, cars:{id:{up:{engine,tyres,boost}, livery, number}}, liveries:[ids owned, shared by all cars], ach:{id:true}, total}
   A car is owned when it has an entry in cars.
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
const liveryOwned=(lid,carId)=>{ const L=LIVERIES.find(l=>l.id===lid); if(!L) return false; if(L.sig) return L.sig===carId&&carDone(carId); return L.cost===0||GARAGE.liveries.includes(lid); };
const carDone=id=>ACHIEVEMENTS.filter(a=>a.car===id).every(a=>GARAGE.ach[a.id]);

// how this car drives right now, with its upgrades
function perfFor(id){
  const d=carDef(id), st=d.stats, up=(GARAGE.cars[id]||{}).up||{engine:0,tyres:0,boost:0};
  return { top:st.top*(1+.035*up.engine), accel:st.accel*(1+.07*up.engine),
    grip:st.grip*(1+.05*up.tyres), loose:st.loose*(1+.05*up.tyres), k:st.slide*(1+.04*up.tyres), turn:st.turn,
    boostDur:st.boost*(1+.12*up.boost), boostPow:st.boost*(1+.1*up.boost), charge:st.charge*(1+.1*up.boost), jump:st.jump };
}
let PERF=perfFor(GARAGE.car);
