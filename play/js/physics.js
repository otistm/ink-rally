/* Ink Rally: Car physics: arcade handling, drift boost, jumps, hay bales, trees and chevron boards.
   The nose turns as soon as you steer, whatever your speed. The car's travel swings round to follow it,
   so a hard turn at speed becomes a power slide that rubs off speed but never spins you round.
   Hold a slide through a bend, then straighten up, for a burst of speed. */
"use strict";
/* ============================================================
   PHYSICS
   ============================================================ */
const MAXSLIDE=.95;   // the most the nose can point away from where the car is going (about 55°)
function surfaceUnder(c,st){
  const R=roadAt(st,c.x,c.y,c.i); c.i=R.i; c.s=R.s; c.lat=R.lat;
  const hw=R.p.w/2, off=Math.abs(R.lat);
  if(off<hw) return R.p.surf;
  if(off<hw+1.8) return R.p.surf==='snow'?'snow':'verge';
  return 'grass';
}
function carStep(dt){
  const c=S.car, st=S.stage, driving=S.st==='drive';
  c.surf=surfaceUnder(c,st);
  const sf=SURF[c.surf], air=c.z>.02;
  // the car drives itself forward; pulling your thumb down brakes
  const brk=driving?IN.brake:S.st==='finish'?.6:0, gas=driving&&brk<.08;
  c.steer+=((driving||S.st==='finish'?IN.steer:0)-c.steer)*Math.min(1,dt*12);
  c.gas=gas; c.brk=brk;
  if(S.st==='count'){ c.vx=c.vy=c.w=c.vf=c.vl=c.slip=0; c.drift=0; return; }
  const f0=Math.cos(c.a), f1=Math.sin(c.a), sp=Math.hypot(c.vx,c.vy);
  let spd=(c.vx*f0+c.vy*f1)<-.3?-sp:sp;
  let vdir=sp>.5?Math.atan2(c.vy,c.vx):c.a; if(spd<0) vdir+=Math.PI;
  // steering turns the nose at a steady rate: gentle when crawling, full from about 30 km/h
  const turn=CAR.turn*clamp(Math.abs(spd)/9,.15,1)*(1-Math.min(.2,Math.abs(spd)/240))*(air?.5:1);
  c.w+=(c.steer*turn*(spd<0?-1:1)-c.w)*Math.min(1,dt*10);
  c.a+=c.w*dt;
  if(!air){
    const boost=c.boost>0, top=CAR.vmax*sf.top*(boost?1.15:1);
    if(gas){ if(spd>=-.5) spd+=(CAR.accel*sf.trac*Math.max(0,1-spd/top)+(boost?9:0))*dt; else spd=Math.min(0,spd+CAR.brake*dt); }
    if(brk>0){ if(spd>.3) spd=Math.max(0,spd-CAR.brake*sf.trac*brk*dt); else if(driving) spd=Math.max(-CAR.reverse,spd-5*brk*dt); }
    if(spd>top) spd-=(spd-top)*dt*1.5;
    const drag=((.4+sf.drag)*dt+.0003*spd*spd*dt)*Math.sign(spd); spd=Math.abs(drag)>=Math.abs(spd)?0:spd-drag;
    if(spd<1.5){ vdir=c.a+(spd<0?Math.PI:0); c.drift=0; }
    else {
      // the travel swings round toward the nose, as hard as the surface allows; the rest is a slide
      let b=angDiff(vdir,c.a); const most=sf.lat/spd;
      vdir+=clamp(b*sf.k,-most,most)*dt;
      b=angDiff(vdir,c.a); if(Math.abs(b)>MAXSLIDE){ vdir=c.a-Math.sign(b)*MAXSLIDE; b=Math.sign(b)*MAXSLIDE; }
      spd-=sf.scrub*Math.abs(Math.sin(b))*spd*dt;
      c.drift=b;
    }
    c.vx=Math.cos(vdir)*Math.abs(spd); c.vy=Math.sin(vdir)*Math.abs(spd);
  } else { const k=1-.0003*sp*dt; c.vx*=k; c.vy*=k; }
  c.vf=c.vx*Math.cos(c.a)+c.vy*Math.sin(c.a); c.vl=-c.vx*Math.sin(c.a)+c.vy*Math.cos(c.a); c.slip=air?0:Math.abs(c.vl);
  driftBoost(c,dt,air);
  c.x+=c.vx*dt; c.y+=c.vy*dt;
  // body roll leans out of the turn, for the drawing
  c.roll+=(clamp(-c.w*c.vf*.02,-.35,.35)-c.roll)*Math.min(1,dt*6);
  // flying and landing
  if(c.z>0||c.vz>0){ c.vz-=GRAV*dt; c.z+=c.vz*dt;
    if(c.z<=0){ const hit=-c.vz; c.z=0; c.vz=0;
      if(hit>1.5){ S.sq=Math.min(.4,hit*.06); S.sqv=0; S.shake+=Math.min(14,hit*1.6); sfx('land',Math.min(1,hit/6)); for(let k=0;k<10;k++) puff(c,true); } } }
  // crests and jumps
  while(S.markI<st.marks.length&&st.marks[S.markI].s<=c.s){ const m=st.marks[S.markI++]; if(c.z>0) continue;
    if(m.k==='jump'&&c.vf>8){ c.vz=Math.min(9,c.vf*.19); c.z=.03; S.sq=-.25; }
    else if(m.k==='crest'&&c.vf>20){ c.vz=(c.vf-20)*.22; c.z=.03; } }
  if(S.markI>0&&st.marks[S.markI-1].s>c.s+5) S.markI--;
  collide(c);
  trails(c,dt);
}
/* Drift boost: slide for a moment and the charge builds (sparks fly from the back wheels);
   straighten up and it fires. A longer slide gives a bigger boost. */
function driftBoost(c,dt,air){
  if(c.boost>0) c.boost-=dt;
  const d=Math.abs(c.drift||0), sp=Math.abs(c.vf);
  if(!air&&sp>8&&d>.26&&c.surf!=='grass'&&S.st==='drive'){ const was=c.charge||0; c.charge=Math.min(2,was+dt);
    if(was<.5&&c.charge>=.5) sfx('charge',1); if(was<1.2&&c.charge>=1.2) sfx('charge',2); }
  else if(d<.16||sp<8){
    if(c.charge>=.5&&S.st==='drive'){ const big=c.charge>=1.2; c.boost=big?1.3:.8; S.shake+=big?5:3; sfx('boost',big?1:.7);
      label(c,big?'Super boost!':'Boost!',big); for(let k=0;k<(big?8:5);k++) puff(c,true); }
    c.charge=0; }
}
function label(c,text,big){ S.parts.push({k:'label',x:c.x,y:c.y,text,big,t:0,life:1.1}); }
function hitStop(c){ c.charge=0; }
function collide(c){
  const sc=S.scene, f0=Math.cos(c.a), f1=Math.sin(c.a);
  if(c.z>2) return;
  for(const u of [1.35,-1.35]){ const qx=c.x+f0*u, qy=c.y+f1*u;
    // hay bales give a soft bounce back toward the road and keep most of your speed
    near(sc.bgrid,qx,qy,k=>{ const b=sc.bales[k], dx=qx-b.x, dy=qy-b.y, d=Math.hypot(dx,dy), min=b.r+1;
      if(d>=min||d<1e-4) return; const nx=dx/d, ny=dy/d; c.x+=nx*(min-d); c.y+=ny*(min-d);
      const vn=c.vx*nx+c.vy*ny; if(vn>=0) return;
      c.vx-=1.35*vn*nx; c.vy-=1.35*vn*ny; c.vx*=.97; c.vy*=.97; if(-vn>7) hitStop(c);
      const hit=-vn; b.hit=.4; if(hit>2){ S.shake+=Math.min(8,hit*.6); sfx('bump',Math.min(1,hit/12)); for(let i=0;i<Math.min(6,hit*.5);i++) bit(b.x,b.y,c.vx*.3,c.vy*.3,'straw'); } });
    near(sc.tgrid,qx,qy,k=>{ const t=sc.trees[k], dx=qx-t.x, dy=qy-t.y, d=Math.hypot(dx,dy), min=t.r*.42+1.05;
      if(d>=min||d<1e-4) return; const nx=dx/d, ny=dy/d; c.x+=nx*(min-d); c.y+=ny*(min-d);
      const vn=c.vx*nx+c.vy*ny; if(vn>=0) return;
      c.vx-=1.3*vn*nx; c.vy-=1.3*vn*ny; c.vx*=.6; c.vy*=.6; c.w=c.w*.3+(Math.random()-.5)*Math.min(3,-vn*.2); hitStop(c);
      const hit=-vn; S.shake+=Math.min(18,hit*1.4); S.sq=Math.min(.3,hit*.03); sfx('crash',Math.min(1,hit/15));
      t.hit=.5; for(let i=0;i<Math.min(14,4+hit);i++) bit(t.x+nx*t.r*.4,t.y+ny*t.r*.4,c.vx*.3,c.vy*.3,'leaf'); });
  }
  sc.signs.forEach(s=>{ if(s.hit) return; if(Math.hypot(s.x-c.x,s.y-c.y)>2.6) return;
    s.hit=true; s.vx=c.vx*.9+(Math.random()-.5)*4; s.vy=c.vy*.9+(Math.random()-.5)*4; s.vz=4+Math.abs(c.vf)*.15; s.spin=(Math.random()<.5?-1:1)*(6+Math.random()*6);
    c.vx*=.97; c.vy*=.97; S.shake+=3; sfx('crash',.35); for(let i=0;i<5;i++) bit(s.x,s.y,c.vx*.4,c.vy*.4,'chip'); });
}
// tyre marks and dust
function trails(c,dt){
  const f0=Math.cos(c.a), f1=Math.sin(c.a), r0=-f1, r1=f0, bx=c.x-f0*1.3, by=c.y-f1*1.3;
  const L=[bx-r0*.8,by-r1*.8], R=[bx+r0*.8,by+r1*.8], sf=SURF[c.surf], sp=Math.abs(c.vf);
  const mark=c.z<.05&&(c.slip>1.6||(c.brk>.4&&sp>6)||(c.gas&&sp<9&&sf.loose&&sp>1)||(sf.loose&&c.surf!=='gravel'&&c.surf!=='snow'&&sp>3));
  if(mark&&c.wheelL){ const a=clamp(.15+c.slip*.05+(c.brk>.4?.2:0),.1,.6); addSkid(c.wheelL[0],c.wheelL[1],L[0],L[1],a); addSkid(c.wheelR[0],c.wheelR[1],R[0],R[1],a); }
  c.wheelL=mark?L:null; c.wheelR=mark?R:null;
  const sl=Math.min(6,c.slip), rate=c.z>.05?0:sf.loose?(sp*.9+sl*6)*(c.surf==='grass'?.4:1):(sl>2.5?sl*5:0);
  c.dustAcc=(c.dustAcc||0)+rate*dt*(RM?.4:1);
  while(c.dustAcc>1){ c.dustAcc-=1; puff(c,false); }
  if(c.surf==='grass'&&sp>4&&Math.random()<dt*sp*.8) bit(bx,by,-c.vx*.2,-c.vy*.2,'tuft');
  // a charged drift throws ink sparks off the back wheels; more of them once it's a super boost
  if(c.charge>=.5&&Math.random()<dt*(c.charge>=1.2?40:18)){ const w=Math.random()<.5?L:R; bit(w[0],w[1],-c.vx*.15,-c.vy*.15,c.charge>=1.4?'star':'spark'); }
}
function puff(c,burst){
  const f0=Math.cos(c.a), f1=Math.sin(c.a), side=Math.random()<.5?-1:1, u=burst?(Math.random()-.5)*3:-2;
  const x=c.x+f0*u-f1*side*.8, y=c.y+f1*u+f0*side*.8, k=burst?5:1.5;
  if(S.parts.length>260) return;
  S.parts.push({k:'dust',x,y,vx:-c.vx*.12+(Math.random()-.5)*k-f1*side*Math.min(6,c.slip)*.3,vy:-c.vy*.12+(Math.random()-.5)*k+f0*side*Math.min(6,c.slip)*.3,r:.5+Math.random()*.6,g:1.4+Math.random()*1.6,t:0,life:.6+Math.random()*.6});
}
function bit(x,y,vx,vy,kind){
  if(S.parts.length>300) return;
  S.parts.push({k:kind,x,y,z:.5+Math.random(),vx:vx+(Math.random()-.5)*8,vy:vy+(Math.random()-.5)*8,vz:3+Math.random()*4,rot:Math.random()*TAU,t:0,life:.8+Math.random()*.6});
}
function partsStep(dt){
  for(let i=S.parts.length-1;i>=0;i--){ const p=S.parts[i]; p.t+=dt; if(p.t>p.life){ S.parts.splice(i,1); continue; }
    if(p.k==='label') continue;
    p.x+=p.vx*dt; p.y+=p.vy*dt;
    if(p.k==='dust'){ p.vx*=Math.exp(-dt*2.5); p.vy*=Math.exp(-dt*2.5); }
    else { p.vz-=GRAV*dt; p.z=Math.max(0,p.z+p.vz*dt); if(p.z===0){ p.vx*=.7; p.vy*=.7; } p.rot+=dt*8; } }
  S.scene.signs.forEach(s=>{ if(!s.hit) return; s.vz-=GRAV*dt; s.z=Math.max(0,s.z+s.vz*dt); s.x+=s.vx*dt; s.y+=s.vy*dt; s.a+=s.spin*dt;
    if(s.z===0){ s.vx*=Math.exp(-dt*5); s.vy*=Math.exp(-dt*5); s.spin*=Math.exp(-dt*5); s.vz=s.vz<-2?-s.vz*.3:0; } });
  S.scene.trees.forEach(t=>{ if(t.hit) t.hit=Math.max(0,t.hit-dt); });
  S.scene.bales.forEach(b=>{ if(b.hit) b.hit=Math.max(0,b.hit-dt); });
}
