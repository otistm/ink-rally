/* Ink Rally: Physics constants, surfaces, and the stage builder. Units are metres and seconds. */
"use strict";
/* ============================================================
   ENGINE — pure maths, units are metres and seconds
   ============================================================ */
const TAU=Math.PI*2, DT=1/120, GRAV=9.8;
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,u)=>a+(b-a)*u;
function seeded(s){ return ()=>{ s=(s*16807)%2147483647; return (s-1)/2147483646; }; }
function angDiff(a,b){ let d=(b-a)%TAU; if(d>Math.PI) d-=TAU; if(d<-Math.PI) d+=TAU; return d; }

// The car. Speeds in m/s (48 m/s is about 173 km/h). turn: fastest the nose swings, in radians a second.
const CAR={len:4.2,wid:1.9,accel:14,vmax:48,brake:20,reverse:7,turn:2.8};

/* Arcade handling: the nose turns as soon as you steer, and the car's travel swings round to follow it.
   k: how quickly the travel catches up with the nose (low = long slides)
   lat: the hardest the travel can bend, in m/s² (faster than this and you slide wide)
   scrub: how much speed a slide rubs off; trac: engine and brakes; top: share of top speed; drag: rolling drag */
const SURF={
  tarmac:{k:7,  lat:26,scrub:.45,trac:1,  top:1,  drag:0,  loose:false,name:'Tarmac'},
  gravel:{k:4.5,lat:20,scrub:.4, trac:.9, top:.95,drag:.2, loose:true, name:'Gravel'},
  snow:  {k:3.2,lat:15,scrub:.35,trac:.8, top:.9, drag:.3, loose:true, name:'Snow'},
  verge: {k:4,  lat:17,scrub:.6, trac:.85,top:.85,drag:.6, loose:true, name:'Verge'},
  grass: {k:3,  lat:13,scrub:1,  trac:.7, top:.6, drag:2,  loose:true, name:'Grass'}
};
// Pacenote grades: 1 is a hairpin-tight bend, 6 is nearly flat out. Radius of each grade in metres.
const RAD={1:14,2:22,3:34,4:50,5:75,6:110};
const WIDTH={tarmac:12,gravel:11,snow:11};
const STEP=2; // metres between road samples

/* A stage is written as pacenotes:
   ['S',80] straight for 80 m, ['L',3,90] left grade 3 for 90 degrees, ['R',1,170] a right hairpin,
   ['crest'] a crest (light cars lift over it), ['jump'] a jump, ['surf','tarmac'] the surface changes. */
function buildStage(def){
  const k=[], surf=[], marks=[], notes=[]; let cur=def.surface, s=0;
  const straight=n=>{ for(let i=0;i<n;i++){ k.push(0); surf.push(cur); } s+=n; };
  straight(60); // run-up to the start line
  def.notes.forEach(n=>{
    if(n[0]==='S') straight(n[1]);
    else if(n[0]==='L'||n[0]==='R'){ const r=RAD[n[1]], len=Math.round(r*n[2]*Math.PI/180), sg=n[0]==='R'?1:-1;
      notes.push({s,end:s+len,dir:n[0],g:n[1],ang:n[2],caution:!!n[3]});
      for(let i=0;i<len;i++){ k.push(sg/r); surf.push(cur); } s+=len; }
    else if(n[0]==='crest'||n[0]==='jump') marks.push({s,k:n[0]});
    else if(n[0]==='surf') cur=n[1];
  });
  const finish=s+10; straight(90); // run-out past the finish
  // ease every bend in and out, so the road curves like a real one instead of kinking
  let kk=k.slice(); for(let pass=0;pass<3;pass++){ const o=kk.slice(); for(let i=0;i<o.length;i++){ let a=0,c=0; for(let j=-5;j<=5;j++){ const q=o[i+j]; if(q!==undefined){ a+=q; c++; } } kk[i]=a/c; } }
  // walk the road one metre at a time, keeping a sample every STEP metres
  const pts=[]; let x=0,y=0,a=-Math.PI/2;
  for(let i=0;i<=kk.length;i++){
    if(i%STEP===0){ const sf=surf[Math.min(i,surf.length-1)]; pts.push({x,y,a,s:i,k:kk[Math.min(i,kk.length-1)],surf:sf,w:WIDTH[sf],nx:-Math.sin(a),ny:Math.cos(a)}); }
    if(i<kk.length){ a+=kk[i]; x+=Math.cos(a); y+=Math.sin(a); }
  }
  const st={def,pts,notes,marks,finish,start:60,length:finish-60,splits:[Math.round(60+(finish-60)/3),Math.round(60+(finish-60)*2/3)]};
  st.grid=gridOf(pts,20);
  st.ideal=idealTime(st);
  st.medals={gold:st.ideal*1.12,silver:st.ideal*1.3,bronze:st.ideal*1.55};
  return st;
}
function gridOf(items,cell){ const g=new Map(); g.cell=cell;
  items.forEach((p,i)=>{ const key=Math.floor(p.x/cell)+','+Math.floor(p.y/cell); let b=g.get(key); if(!b){ b=[]; g.set(key,b); } b.push(i); }); return g; }
function near(g,x,y,f){ const c=g.cell, cx=Math.floor(x/c), cy=Math.floor(y/c);
  for(let i=-1;i<=1;i++) for(let j=-1;j<=1;j++){ const b=g.get((cx+i)+','+(cy+j)); if(b) for(const k of b) f(k); } }
// closest road sample to a point, searching near a hint index so crossing roads never confuse it
function roadAt(st,x,y,hint){
  const P=st.pts; let best=hint, bd=1e9;
  const lo=Math.max(0,hint-30), hi=Math.min(P.length-1,hint+30);
  for(let i=lo;i<=hi;i++){ const d=(P[i].x-x)**2+(P[i].y-y)**2; if(d<bd){ bd=d; best=i; } }
  const p=P[best], lat=(x-p.x)*p.nx+(y-p.y)*p.ny, along=(x-p.x)*Math.cos(p.a)+(y-p.y)*Math.sin(p.a);
  return {i:best,lat,s:p.s+along,p};
}
// The fastest a perfect driver could go: corner speed from the grip limit, then braking and acceleration limits.
function idealTime(st){
  const P=st.pts, v=P.map(p=>{ const g=SURF[p.surf].lat*.95, kv=Math.abs(p.k); return Math.min(CAR.vmax*SURF[p.surf].top, kv>1e-4?Math.sqrt(g/kv):1e9); });
  v[st.start/STEP]=0; // standing start on the line
  for(let i=1;i<P.length;i++){ const sf=SURF[P[i].surf], a=CAR.accel*sf.trac*Math.max(.05,1-v[i-1]/(CAR.vmax*sf.top)); v[i]=Math.min(v[i],Math.sqrt(v[i-1]**2+2*a*STEP)); }
  for(let i=P.length-2;i>=0;i--){ const b=CAR.brake*SURF[P[i].surf].trac; v[i]=Math.min(v[i],Math.sqrt(v[i+1]**2+2*b*STEP)); }
  let t=0; for(let i=1;i<P.length;i++){ if(P[i].s<=st.start||P[i].s>st.finish) continue; t+=STEP/Math.max(1,(v[i]+v[i-1])/2); }
  return t;
}
