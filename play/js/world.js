/* Ink Rally: Game state S, and the scenery along each stage (coins, trees, hay bales, crowds, chevron boards). */
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
/* Coins trace the fun way through each stage: a line through the inside of every bend (the racing line),
   a weaving line down the straights, a row up to each jump and an arc through the air over it with a big coin at the top. */
function placeCoins(st,r,at){
  const coins=[], put=(s,lat,z,big)=>{ const p=at(s); coins.push({x:p.x+p.nx*lat,y:p.y+p.ny*lat,z:z||0,big:!!big,ph:r()*TAU,got:false,gotT:0}); };
  const items=st.notes.map(n=>({s:n.s,end:n.end,n})).concat(st.marks.map(m=>({s:m.s-20,end:m.k==='jump'?m.s+48:m.s+10,m}))).sort((a,b)=>a.s-b.s);
  st.notes.forEach(n=>{ if(n.g>4) return; const side=n.dir==='R'?1:-1, len=n.end-n.s, cnt=clamp(Math.round(len/7),4,9);
    for(let i=0;i<cnt;i++){ const u=i/(cnt-1), s=n.s+len*u, w=at(s).w; put(s,side*(w/2-1.8)*Math.sin(u*Math.PI)); } });
  st.marks.forEach(m=>{
    for(const d of [-18,-12,-6]) put(m.s+d,0);
    if(m.k==='jump') for(let i=0;i<7;i++){ const u=(i+1)/8; put(m.s+2+u*44,0,.8+4*2.4*u*(1-u),i===3); }
    else for(const d of [6,12]) put(m.s+d,0); });
  let prev=st.start+20;
  items.forEach(it=>{ const gap=it.s-prev;
    if(gap>=60){ const n=6, s0=prev+gap/2-15, ph=r()*TAU, sw=r()<.5?-1:1; for(let i=0;i<n;i++){ const s=s0+i*6; put(s,sw*Math.sin(ph+i*.6)*at(s).w*.28); } }
    prev=Math.max(prev,it.end); });
  return coins;
}
function buildScenery(st){
  const def=st.def, r=seeded(def.seed), P=st.pts, trees=[], crowd=[], signs=[], tapes=[], bales=[];
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
  // hay bales line the outside of every bend that isn't nearly flat, to bounce you back onto the road
  st.notes.filter(n=>n.g<=4).forEach(n=>{ const side=n.dir==='R'?-1:1;
    for(let s=n.s-8;s<=n.end+12;s+=3.2){ const p=at(s), d=p.w/2+2.3, x=p.x+p.nx*side*d, y=p.y+p.ny*side*d;
      if(clearOfRoad(st,x,y,1.4)&&!bales.some(b=>Math.hypot(b.x-x,b.y-y)<2.2)) bales.push({x,y,r:.85,a:r()*TAU,hit:0}); } });
  // chevron boards stand behind the bales on the tight bends, pointing the way the road goes
  st.notes.filter(n=>n.g<=2).forEach(n=>{ const side=n.dir==='R'?-1:1;
    [.3,.6].forEach(u=>{ const p=at(n.s+(n.end-n.s)*u), d=p.w/2+4.6; signs.push({x:p.x+p.nx*side*d,y:p.y+p.ny*side*d,a:p.a,dir:n.dir,z:0,vx:0,vy:0,vz:0,spin:0,hit:false}); }); });
  // trees: a close row along the road and a looser wood behind it
  const dens=def.trees==='pine'?.5:.3;
  for(let i=0;i<P.length;i+=2){ const p=P[i];
    for(const side of [-1,1]){
      const bands=[[8,26,dens],[28,70,dens*.7]];
      for(const [a,b,pr] of bands){ if(r()>pr) continue;
        const tr=2.2+r()*2.8, d=p.w/2+a+r()*(b-a), x=p.x+p.nx*side*d+(r()-.5)*4, y=p.y+p.ny*side*d+(r()-.5)*4;
        if(!clearOfRoad(st,x,y,7+tr*.5)) continue;
        if(bales.some(b=>Math.hypot(b.x-x,b.y-y)<tr+2)) continue;
        if(crowd.some(c=>Math.hypot(c.x-x,c.y-y)<tr+3)) continue;
        trees.push({x,y,r:tr,ph:r()*TAU}); } } }
  signs.forEach(s=>s.home={x:s.x,y:s.y,a:s.a,z:0,vx:0,vy:0,vz:0,spin:0});
  const coins=placeCoins(st,r,at);
  const sc={trees,crowd,signs,tapes,bales,coins,tgrid:gridOf(trees,20),bgrid:gridOf(bales,20),cgrid:gridOf(coins,20)};
  return sc;
}
