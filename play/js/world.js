/* Ink Rally: Game state S, and the scenery along each stage (trees, crowds, chevron boards). */
"use strict";
/* ============================================================
   STATE
   ============================================================ */
const S={
  st:'home',          // home, count, drive, finish, pause
  stage:null, scene:null, def:null,
  car:null, race:0, count:0, t:0,
  calls:[], callI:0, note:null, splitI:0, splitT:[],
  parts:[], skid:null, shake:0, sq:0, sqv:0,
  wrong:0, stuck:0, finT:0, finTimer:0, paused:null
};
function newCar(p){ return {x:p.x,y:p.y,a:p.a,vx:0,vy:0,w:0,z:0,vz:0,steer:0,vf:0,vl:0,slip:0,i:0,s:p.s,lat:0,surf:p.surf,roll:0,wheelL:null,wheelR:null}; }
// tyre marks live in a ring buffer: x0,y0,x1,y1,strength per segment
const SKIDN=3000;
function newSkids(){ return {d:new Float32Array(SKIDN*5),n:0,head:0}; }
function addSkid(x0,y0,x1,y1,a){ const k=S.skid, o=k.head*5; k.d[o]=x0; k.d[o+1]=y0; k.d[o+2]=x1; k.d[o+3]=y1; k.d[o+4]=a; k.head=(k.head+1)%SKIDN; k.n=Math.min(SKIDN,k.n+1); }

/* ============================================================
   SCENERY
   ============================================================ */
const sceneCache={}, stageCache={};
function stageFor(def){ return stageCache[def.id]||(stageCache[def.id]=buildStage(def)); }
function sceneFor(st){ return sceneCache[st.def.id]||(sceneCache[st.def.id]=buildScenery(st)); }
function clearOfRoad(st,x,y,gap){ let ok=true; near(st.grid,x,y,k=>{ const q=st.pts[k]; if(ok&&Math.hypot(q.x-x,q.y-y)<q.w/2+gap) ok=false; }); return ok; }
function buildScenery(st){
  const def=st.def, r=seeded(def.seed), P=st.pts, trees=[], crowd=[], signs=[], tapes=[];
  const at=s=>P[clamp(Math.round(s/STEP),0,P.length-1)];
  // crowds stand on the outside of the hairpins and the tight caution bends, and at every jump
  const spots=st.notes.filter(n=>n.g<=2||n.caution).map(n=>({s:(n.s+n.end)/2,side:n.dir==='R'?-1:1}))
    .concat(st.marks.filter(m=>m.k==='jump').map(m=>({s:m.s+10,side:r()<.5?-1:1})));
  spots.forEach(sp=>{
    const p=at(sp.s), d0=p.w/2+7;
    const tp=[]; for(let s=sp.s-16;s<=sp.s+16;s+=4){ const q=at(s); tp.push([q.x+q.nx*sp.side*d0,q.y+q.ny*sp.side*d0]); } tapes.push(tp);
    for(let i=0;i<9;i++){ const q=at(sp.s-13+r()*26), d=d0+2+r()*4.5;
      const x=q.x+q.nx*sp.side*d, y=q.y+q.ny*sp.side*d; if(clearOfRoad(st,x,y,6)) crowd.push({x,y,ph:r()*TAU,face:Math.atan2(-q.ny*sp.side,-q.nx*sp.side),hop:0}); }
  });
  // chevron boards on the outside of the tight bends, pointing the way the road goes
  st.notes.filter(n=>n.g<=2).forEach(n=>{ const side=n.dir==='R'?-1:1;
    [.3,.6].forEach(u=>{ const p=at(n.s+(n.end-n.s)*u), d=p.w/2+2.4; signs.push({x:p.x+p.nx*side*d,y:p.y+p.ny*side*d,a:p.a,dir:n.dir,z:0,vx:0,vy:0,vz:0,spin:0,hit:false}); }); });
  // trees: a close row along the road and a looser wood behind it
  const dens=def.trees==='pine'?.5:.3;
  for(let i=0;i<P.length;i+=2){ const p=P[i];
    for(const side of [-1,1]){
      const bands=[[4,22,dens],[24,70,dens*.7]];
      for(const [a,b,pr] of bands){ if(r()>pr) continue;
        const tr=2.2+r()*2.8, d=p.w/2+a+r()*(b-a), x=p.x+p.nx*side*d+(r()-.5)*4, y=p.y+p.ny*side*d+(r()-.5)*4;
        if(!clearOfRoad(st,x,y,2.5+tr*.6)) continue;
        if(crowd.some(c=>Math.hypot(c.x-x,c.y-y)<tr+3)) continue;
        trees.push({x,y,r:tr,ph:r()*TAU}); } } }
  signs.forEach(s=>s.home={x:s.x,y:s.y,a:s.a,z:0,vx:0,vy:0,vz:0,spin:0});
  const sc={trees,crowd,signs,tapes,tgrid:gridOf(trees,20)};
  return sc;
}
