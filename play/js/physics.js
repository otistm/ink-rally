/* Ink Rally: Car physics: engine, brakes, grip and sliding, jumps, trees and chevron boards.
   The nose can turn a little faster than the tyres can hold, so pushing hard (or braking into a bend)
   makes the tail step out into a slide. Steer the other way to catch it. */
"use strict";
/* ============================================================
   PHYSICS
   ============================================================ */
function surfaceUnder(c,st){
  const R=roadAt(st,c.x,c.y,c.i); c.i=R.i; c.s=R.s; c.lat=R.lat;
  const hw=R.p.w/2, off=Math.abs(R.lat);
  if(off<hw) return R.p.surf;
  if(off<hw+1.8) return R.p.surf==='snow'?'snow':'verge';
  return 'grass';
}
function carStep(dt){
  const c=S.car, st=S.stage, driving=S.st==='drive', held=S.st==='count';
  c.surf=surfaceUnder(c,st);
  const sf=SURF[c.surf], air=c.z>.02;
  const gas=driving&&IN.gas, brk=driving?IN.brake:S.st==='finish'?.55:0;
  c.steer+=((driving||S.st==='finish'?IN.steer:0)-c.steer)*Math.min(1,dt*9);
  let f0=Math.cos(c.a),f1=Math.sin(c.a), vf=c.vx*f0+c.vy*f1;
  const sp=Math.abs(vf), delta=c.steer*.6/(1+sp*.06);
  if(!air){
    let wT=vf*Math.tan(delta)/CAR.wheelbase; const wMax=sf.grip*sf.rot/Math.max(3,sp); wT=clamp(wT,-wMax,wMax);
    c.w+=(wT-c.w)*Math.min(1,dt*7);
  }
  c.a+=c.w*dt;
  f0=Math.cos(c.a); f1=Math.sin(c.a); const r0=-f1, r1=f0;
  vf=c.vx*f0+c.vy*f1; let vl=c.vx*r0+c.vy*r1;
  if(held){ vf=0; vl=0; c.w=0; }
  else if(!air){
    const top=CAR.vmax*sf.top;
    if(gas){ if(vf>=-.5) vf+=CAR.accel*sf.trac*Math.max(0,1-vf/top)*dt; else vf=Math.min(0,vf+CAR.brake*sf.trac*dt); }
    if(brk>0){ if(vf>.3) vf=Math.max(0,vf-CAR.brake*sf.trac*brk*dt); else if(driving&&!gas) vf=Math.max(-CAR.reverse,vf-4*brk*dt); }
    const drag=((.5+sf.drag)*dt+.00035*vf*vf*dt)*Math.sign(vf); vf=Math.abs(drag)>=Math.abs(vf)?(gas?vf:0):vf-drag;
    // the rear lets go more easily under braking, and a little when you floor it on loose ground
    const rear=sf.grip*(brk>.3?.72:1)*(gas&&sf.loose?.92:1), dl=rear*dt;
    c.slip=Math.abs(vl);
    vl=Math.abs(vl)<=dl?0:vl-Math.sign(vl)*dl;
  } else { vf-=.00035*vf*Math.abs(vf)*dt; c.slip=0; }
  c.vx=f0*vf+r0*vl; c.vy=f1*vf+r1*vl; c.vf=vf; c.vl=vl;
  c.gas=gas; c.brk=brk;
  const px=c.x, py=c.y; c.x+=c.vx*dt; c.y+=c.vy*dt;
  // body roll follows the sideways load, for the drawing
  c.roll+=(clamp(-c.w*vf*.02,-.35,.35)-c.roll)*Math.min(1,dt*6);
  // flying and landing
  if(air||c.vz>0){ c.vz-=GRAV*dt; c.z+=c.vz*dt;
    if(c.z<=0){ const hit=-c.vz; c.z=0; c.vz=0;
      if(hit>1.5){ S.sq=Math.min(.4,hit*.06); S.sqv=0; S.shake+=Math.min(14,hit*1.6); sfx('land',Math.min(1,hit/6)); for(let k=0;k<10;k++) puff(c,true); } } }
  // crests and jumps
  while(S.markI<st.marks.length&&st.marks[S.markI].s<=c.s){ const m=st.marks[S.markI++]; if(c.z>0) continue;
    if(m.k==='jump'&&vf>8){ c.vz=vf*.15; c.z=.03; S.sq=-.25; }
    else if(m.k==='crest'&&vf>22){ c.vz=(vf-22)*.2; c.z=.03; } }
  if(S.markI>0&&st.marks[S.markI-1].s>c.s+5) S.markI--;
  collide(c,px,py);
  trails(c,dt);
}
function collide(c){
  const sc=S.scene, f0=Math.cos(c.a), f1=Math.sin(c.a);
  if(c.z>2) return;
  for(const u of [1.35,-1.35]){ const qx=c.x+f0*u, qy=c.y+f1*u;
    near(sc.tgrid,qx,qy,k=>{ const t=sc.trees[k], dx=qx-t.x, dy=qy-t.y, d=Math.hypot(dx,dy), min=t.r*.42+1.05;
      if(d>=min||d<1e-4) return; const nx=dx/d, ny=dy/d; c.x+=nx*(min-d); c.y+=ny*(min-d);
      const vn=c.vx*nx+c.vy*ny; if(vn>=0) return;
      c.vx-=1.3*vn*nx; c.vy-=1.3*vn*ny; c.vx*=.55; c.vy*=.55; c.w=c.w*.3+(Math.random()-.5)*Math.min(3,-vn*.2);
      const hit=-vn; S.shake+=Math.min(18,hit*1.4); S.sq=Math.min(.3,hit*.03); sfx('crash',Math.min(1,hit/15));
      t.hit=.5; for(let i=0;i<Math.min(14,4+hit);i++) bit(t.x+nx*t.r*.4,t.y+ny*t.r*.4,c.vx*.3,c.vy*.3,'leaf'); });
  }
  sc.signs.forEach(s=>{ if(s.hit) return; if(Math.hypot(s.x-c.x,s.y-c.y)>2.6) return;
    s.hit=true; s.vx=c.vx*.9+(Math.random()-.5)*4; s.vy=c.vy*.9+(Math.random()-.5)*4; s.vz=4+Math.abs(c.vf)*.15; s.spin=(Math.random()<.5?-1:1)*(6+Math.random()*6);
    c.vx*=.94; c.vy*=.94; S.shake+=3; sfx('crash',.35); for(let i=0;i<5;i++) bit(s.x,s.y,c.vx*.4,c.vy*.4,'chip'); });
}
// tyre marks and dust
function trails(c,dt){
  const f0=Math.cos(c.a), f1=Math.sin(c.a), r0=-f1, r1=f0, bx=c.x-f0*1.3, by=c.y-f1*1.3;
  const L=[bx-r0*.8,by-r1*.8], R=[bx+r0*.8,by+r1*.8], sf=SURF[c.surf], sp=Math.abs(c.vf);
  const mark=c.z<.05&&(c.slip>1.6||(c.brk>.4&&sp>6)||(c.gas&&sp<9&&sf.loose&&sp>1)||(sf.loose&&c.surf!=='gravel'&&c.surf!=='snow'&&sp>3));
  if(mark&&c.wheelL){ const a=clamp(.15+c.slip*.05+(c.brk>.4?.2:0),.1,.6); addSkid(c.wheelL[0],c.wheelL[1],L[0],L[1],a); addSkid(c.wheelR[0],c.wheelR[1],R[0],R[1],a); }
  c.wheelL=mark?L:null; c.wheelR=mark?R:null;
  const rate=c.z>.05?0:sf.loose?(sp*.9+c.slip*6)*(c.surf==='grass'?.4:1):(c.slip>2.5?c.slip*5:0);
  c.dustAcc=(c.dustAcc||0)+rate*dt*(RM?.4:1);
  while(c.dustAcc>1){ c.dustAcc-=1; puff(c,false); }
  if(c.surf==='grass'&&sp>4&&Math.random()<dt*sp*.8) bit(bx,by,-c.vx*.2,-c.vy*.2,'tuft');
}
function puff(c,burst){
  const f0=Math.cos(c.a), f1=Math.sin(c.a), side=Math.random()<.5?-1:1, u=burst?(Math.random()-.5)*3:-2;
  const x=c.x+f0*u-f1*side*.8, y=c.y+f1*u+f0*side*.8, k=burst?5:1.5;
  if(S.parts.length>260) return;
  S.parts.push({k:'dust',x,y,vx:-c.vx*.12+(Math.random()-.5)*k-f1*side*c.slip*.3,vy:-c.vy*.12+(Math.random()-.5)*k+f0*side*c.slip*.3,r:.5+Math.random()*.6,g:1.4+Math.random()*1.6,t:0,life:.6+Math.random()*.6});
}
function bit(x,y,vx,vy,kind){
  if(S.parts.length>300) return;
  S.parts.push({k:kind,x,y,z:.5+Math.random(),vx:vx+(Math.random()-.5)*8,vy:vy+(Math.random()-.5)*8,vz:3+Math.random()*4,rot:Math.random()*TAU,t:0,life:.8+Math.random()*.6});
}
function partsStep(dt){
  for(let i=S.parts.length-1;i>=0;i--){ const p=S.parts[i]; p.t+=dt; if(p.t>p.life){ S.parts.splice(i,1); continue; }
    p.x+=p.vx*dt; p.y+=p.vy*dt;
    if(p.k==='dust'){ p.vx*=Math.exp(-dt*2.5); p.vy*=Math.exp(-dt*2.5); }
    else { p.vz-=GRAV*dt; p.z=Math.max(0,p.z+p.vz*dt); if(p.z===0){ p.vx*=.7; p.vy*=.7; } p.rot+=dt*8; } }
  S.scene.signs.forEach(s=>{ if(!s.hit) return; s.vz-=GRAV*dt; s.z=Math.max(0,s.z+s.vz*dt); s.x+=s.vx*dt; s.y+=s.vy*dt; s.a+=s.spin*dt;
    if(s.z===0){ s.vx*=Math.exp(-dt*5); s.vy*=Math.exp(-dt*5); s.spin*=Math.exp(-dt*5); s.vz=s.vz<-2?-s.vz*.3:0; } });
  S.scene.trees.forEach(t=>{ if(t.hit) t.hit=Math.max(0,t.hit-dt); });
}
