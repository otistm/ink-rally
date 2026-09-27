/* Ink Rally: Drawing the stage, scenery, dust, tyre marks, boosts and the car. */
"use strict";
/* ============================================================
   DRAW
   ============================================================ */
let PX=1/7; // one screen pixel in metres, set each frame
const CARDRAW=1.7; // the car is drawn larger than life so it reads well at speed
function roadPath(pts,a,b,off){ ctx.beginPath(); for(let i=a;i<=b;i++){ const p=pts[i], x=p.x+p.nx*off, y=p.y+p.ny*off; i===a?ctx.moveTo(x,y):ctx.lineTo(x,y); } }
// which stretches of road are on screen, split wherever the surface changes
function visibleRuns(st,R){
  const P=st.pts, runs=[]; let a=-1, sf=null;
  for(let i=0;i<P.length;i++){ const p=P[i], vis=Math.abs(p.x-cam.x)<R+8&&Math.abs(p.y-cam.y)<R+8;
    if(vis&&a<0){ a=Math.max(0,i-1); sf=p.surf; }
    else if(a>=0&&(!vis||p.surf!==sf)){ runs.push([a,i,sf]); if(vis){ a=i-1; sf=p.surf; } else a=-1; } }
  if(a>=0) runs.push([a,P.length-1,sf]);
  return runs;
}
function drawRoad(st,R){
  const P=st.pts, runs=visibleRuns(st,R);
  ctx.lineCap='round'; ctx.lineJoin='round';
  runs.forEach(([a,b,sf])=>{ const w=WIDTH[sf]; roadPath(P,a,b,0); ctx.strokeStyle='#000'; ctx.lineWidth=w+3.6+INK*2*PX; ctx.stroke(); });
  runs.forEach(([a,b,sf])=>{ const w=WIDTH[sf]; roadPath(P,a,b,0); ctx.strokeStyle='#fff'; ctx.lineWidth=w+3.6; ctx.stroke(); ctx.strokeStyle=sf==='snow'?PAT.bank:sf==='tarmac'?PAT.gravel:PAT.verge; ctx.stroke(); });
  runs.forEach(([a,b,sf])=>{ const w=WIDTH[sf]; roadPath(P,a,b,0); ctx.strokeStyle='#000'; ctx.lineWidth=w+INK*2*PX; ctx.stroke(); });
  runs.forEach(([a,b,sf])=>{ const w=WIDTH[sf]; roadPath(P,a,b,0); ctx.strokeStyle='#fff'; ctx.lineWidth=w; ctx.stroke(); ctx.strokeStyle=PAT[sf]; ctx.stroke(); });
  // markings: a dashed centre line on tarmac, worn ruts on gravel and snow
  ctx.save(); ctx.strokeStyle='#000';
  runs.forEach(([a,b,sf])=>{
    if(sf==='tarmac'){ ctx.globalAlpha=.8; ctx.lineWidth=.22; ctx.setLineDash([3,5]); roadPath(P,a,b,0); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha=.35; ctx.lineWidth=1.2*PX; roadPath(P,a,b,WIDTH[sf]/2-.5); ctx.stroke(); roadPath(P,a,b,-WIDTH[sf]/2+.5); ctx.stroke(); }
    else { ctx.globalAlpha=sf==='snow'?.12:.08; ctx.lineWidth=1; [-1.6,1.6].forEach(o=>{ roadPath(P,a,b,o); ctx.stroke(); }); } });
  ctx.restore();
}
function across(st,s,f){ const p=st.pts[clamp(Math.round(s/STEP),0,st.pts.length-1)]; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.a); f(p.w/2,p); ctx.restore(); }
function drawLines(st){
  const check=hw=>{ ctx.fillStyle='#000'; for(let r=0;r<2;r++) for(let y=-hw,k=0;y<hw-.01;y+=1,k++) if((k+r)%2===0) ctx.fillRect(r-1,y,1,Math.min(1,hw-y)); ctx.lineWidth=1.5*PX; ctx.strokeStyle='#000'; ctx.strokeRect(-1,-hw,2,hw*2); };
  across(st,st.start,check); across(st,st.finish,check);
  st.splits.forEach(s=>across(st,s,hw=>{ ctx.strokeStyle='#000'; ctx.lineWidth=.3; ctx.setLineDash([.7,.7]); ctx.beginPath(); ctx.moveTo(0,-hw); ctx.lineTo(0,hw); ctx.stroke(); ctx.setLineDash([]); }));
  st.marks.forEach(m=>across(st,m.s,hw=>{
    if(m.k==='jump'){ ctx.beginPath(); ctx.rect(-3,-hw,3,hw*2); ctx.fillStyle='#fff'; ctx.fill(); ctx.fillStyle=PAT.bank; ctx.fill(); ctx.lineWidth=INK*PX; ctx.strokeStyle='#000'; ctx.stroke();
      ctx.lineWidth=2.6*PX; ctx.beginPath(); ctx.moveTo(0,-hw); ctx.lineTo(0,hw); ctx.stroke(); }
    else { ctx.strokeStyle='#000'; ctx.lineWidth=1.2*PX; ctx.globalAlpha=.4; for(let k=0;k<3;k++){ const x=-2.4+k*1.2; ctx.beginPath(); ctx.moveTo(x-.5,-hw); ctx.quadraticCurveTo(x+.6,0,x-.5,hw); ctx.stroke(); } ctx.globalAlpha=1; } }));
}
// banners over the start and finish, drawn above the car
function drawBanners(st){
  [[st.start,'Start'],[st.finish,'Finish']].forEach(([s,txt])=>{ const p=st.pts[Math.round(s/STEP)]; if(Math.hypot(p.x-cam.x,p.y-cam.y)>viewR()+10) return;
    across(st,s,hw=>{ const e=hw+1.4;
      ctx.fillStyle='rgba(0,0,0,.12)'; ctx.fillRect(-.45+.5,-e+.5,.9,e*2);
      ctx.beginPath(); ctx.rect(-.45,-e,.9,e*2); ctx.fillStyle='#fff'; ctx.fill(); ctx.lineWidth=INK*PX; ctx.strokeStyle='#000'; ctx.stroke();
      [-e,e].forEach(y=>{ ctx.beginPath(); ctx.arc(0,y,.55,0,TAU); ctx.fillStyle='#000'; ctx.fill(); });
      ctx.save(); ctx.rotate(Math.PI/2); ctx.scale(PX,PX); ctx.fillStyle='#000'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.font=`italic 900 ${Math.max(9,Math.round(.72/PX))}px Fraunces, Georgia, serif`; ctx.fillText(txt,0,.05/PX); ctx.restore(); }); });
}
function drawSkids(R){
  const k=S.skid; if(!k||!k.n) return; const d=k.d;
  ctx.save(); ctx.strokeStyle='#000'; ctx.lineCap='round'; ctx.lineWidth=.3;
  [[.1,.2],[.2,.35],[.35,1]].forEach(([lo,hi])=>{ ctx.globalAlpha=(lo+Math.min(hi,.5))/2+.05; ctx.beginPath(); let any=false;
    for(let i=0;i<k.n;i++){ const o=i*5, a=d[o+4]; if(a<lo||a>=hi) continue; if(Math.abs(d[o]-cam.x)>R||Math.abs(d[o+1]-cam.y)>R) continue;
      ctx.moveTo(d[o],d[o+1]); ctx.lineTo(d[o+2],d[o+3]); any=true; }
    if(any) ctx.stroke(); });
  ctx.restore();
}
// dust clouds are merged like the course in Ink Nine: all the outlines first, then all the fills
function drawDust(){
  const D=S.parts.filter(p=>p.k==='dust'); if(!D.length) return;
  const rad=p=>{ const u=p.t/p.life; return (p.r+p.g*Math.sqrt(u))*(u>.65?Math.max(0,1-(u-.65)/.35):1); };
  ctx.fillStyle='#000'; ctx.beginPath(); D.forEach(p=>{ const r=rad(p)+INK*PX; ctx.moveTo(p.x+r,p.y); ctx.arc(p.x,p.y,r,0,TAU); }); ctx.fill();
  ctx.fillStyle='#fff'; ctx.beginPath(); D.forEach(p=>{ const r=rad(p); ctx.moveTo(p.x+r,p.y); ctx.arc(p.x,p.y,r,0,TAU); }); ctx.fill();
  ctx.save(); ctx.globalAlpha=.35; ctx.strokeStyle='#000'; ctx.lineWidth=1.1*PX; ctx.beginPath();
  D.forEach(p=>{ const r=rad(p)*.6; if(r*cam.z<5) return; ctx.moveTo(p.x-r*.7+r,p.y+r*.1); ctx.arc(p.x-r*.7,p.y+r*.1,r,0,.9); }); ctx.stroke(); ctx.restore();
}
function drawBits(){
  ctx.save(); ctx.strokeStyle='#000'; ctx.lineCap='round';
  S.parts.forEach(p=>{ if(p.k==='dust'||p.k==='label') return; const u=p.t/p.life; ctx.globalAlpha=1-u*u; const s=1+p.z*.12;
    ctx.save(); ctx.translate(p.x,p.y-p.z*.3); ctx.rotate(p.rot); ctx.scale(s,s);
    if(p.k==='leaf'){ ctx.beginPath(); ctx.ellipse(0,0,.35,.18,0,0,TAU); ctx.fillStyle='#fff'; ctx.fill(); ctx.lineWidth=1.2*PX; ctx.stroke(); }
    else if(p.k==='chip'){ ctx.fillStyle='#000'; ctx.fillRect(-.25,-.12,.5,.24); }
    else if(p.k==='spark'){ ctx.lineWidth=1.8*PX; ctx.beginPath(); ctx.moveTo(-.35,0); ctx.lineTo(.35,0); ctx.stroke(); }
    else if(p.k==='star'){ const r=.45; ctx.beginPath(); for(let k=0;k<8;k++){ const a=k/8*TAU, rr=k%2?r*.4:r; k?ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):ctx.moveTo(rr,0); } ctx.closePath();
      ctx.fillStyle='#fff'; ctx.fill(); ctx.lineWidth=1.4*PX; ctx.stroke(); }
    else if(p.k==='straw'){ ctx.lineWidth=1.2*PX; ctx.beginPath(); ctx.moveTo(-.3,-.1); ctx.lineTo(.3,.1); ctx.stroke(); }
    else { ctx.lineWidth=1.3*PX; ctx.beginPath(); ctx.moveTo(-.25,.15); ctx.lineTo(0,-.2); ctx.lineTo(.25,.15); ctx.stroke(); }
    ctx.restore(); });
  ctx.restore();
}
function shadowVec(){ const a=-cam.rot; return [Math.cos(a)*.35-Math.sin(a)*.32, Math.sin(a)*.35+Math.cos(a)*.32]; }
function drawTrees(R,t){
  const sc=S.scene, pine=S.def.trees==='pine', rock=S.def.trees==='rock', [sx,sy]=shadowVec();
  const vis=sc.trees.filter(tr=>Math.abs(tr.x-cam.x)<R+tr.r&&Math.abs(tr.y-cam.y)<R+tr.r);
  ctx.fillStyle='rgba(0,0,0,.09)'; ctx.beginPath(); vis.forEach(tr=>{ const r=tr.r; ctx.moveTo(tr.x+sx*r+r,tr.y+sy*r); ctx.ellipse(tr.x+sx*r,tr.y+sy*r,r,r*.92,0,0,TAU); }); ctx.fill();
  vis.forEach(tr=>{ const wob=tr.hit?1+Math.sin(tr.hit*40)*tr.hit*.12:1, r=tr.r*wob, x=tr.x, y=tr.y;
    if(rock){ drawRock(tr,r); return; }
    ctx.beginPath();
    if(pine){ const n=14; for(let k=0;k<=n*2;k++){ const a=k/(n*2)*TAU+tr.ph, rr=r*(k%2?.74:1); const px=x+Math.cos(a)*rr, py=y+Math.sin(a)*rr; k?ctx.lineTo(px,py):ctx.moveTo(px,py); } }
    else { for(let k=0;k<=40;k++){ const a=k/40*TAU, rr=r*(1+.075*Math.sin(a*7+tr.ph)); const px=x+Math.cos(a)*rr, py=y+Math.sin(a)*rr; k?ctx.lineTo(px,py):ctx.moveTo(px,py); } }
    ctx.closePath(); ctx.fillStyle='#fff'; ctx.fill(); ctx.lineWidth=INK*PX; ctx.strokeStyle='#000'; ctx.stroke();
    ctx.lineWidth=1.3*PX; ctx.beginPath();
    if(pine){ for(let k=0;k<7;k++){ const a=k/7*TAU+tr.ph*1.3; ctx.moveTo(x+Math.cos(a)*r*.15,y+Math.sin(a)*r*.15); ctx.lineTo(x+Math.cos(a)*r*.55,y+Math.sin(a)*r*.55); } }
    else { const [lx,ly]=[x-r*.12,y-r*.12]; const a0=-cam.rot+.15*Math.PI; ctx.arc(lx,ly,r*.62,a0,a0+.47*Math.PI); }
    ctx.stroke(); });
}
// a moorland boulder: a lumpy ink outline with hatching on the side away from the light
function drawRock(tr,r){
  const n=9, pts=[]; for(let k=0;k<n;k++){ const a=k/n*TAU+tr.ph, rr=r*(.78+.22*Math.abs(Math.sin(tr.ph*7+k*2.3))); pts.push([tr.x+Math.cos(a)*rr,tr.y+Math.sin(a)*rr*.85]); }
  const path=()=>{ ctx.beginPath(); pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.closePath(); };
  path(); ctx.fillStyle='#fff'; ctx.fill();
  ctx.save(); path(); ctx.clip(); const up=-cam.rot, lx=Math.cos(up+Math.PI/4), ly=Math.sin(up+Math.PI/4);
  ctx.strokeStyle='#000'; ctx.lineWidth=1.1*PX; ctx.globalAlpha=.55; ctx.beginPath();
  for(let k=-4;k<=4;k++){ const o=k*r*.2, cx=tr.x+lx*r*.45-ly*o, cy=tr.y+ly*r*.45+lx*o; ctx.moveTo(cx-lx*r*.5,cy-ly*r*.5); ctx.lineTo(cx+lx*r*.6,cy+ly*r*.6); }
  ctx.stroke(); ctx.restore();
  path(); ctx.lineWidth=INK*PX; ctx.strokeStyle='#000'; ctx.stroke();
  ctx.lineWidth=1.2*PX; ctx.beginPath(); ctx.moveTo(pts[1][0]*.7+tr.x*.3,pts[1][1]*.7+tr.y*.3); ctx.lineTo(pts[3][0]*.5+tr.x*.5,pts[3][1]*.5+tr.y*.5); ctx.stroke();
}
function drawTapes(){
  ctx.save(); ctx.strokeStyle='#000'; ctx.lineWidth=1.4*PX; ctx.setLineDash([.9,.6]);
  S.scene.tapes.forEach(tp=>{ if(Math.hypot(tp[0][0]-cam.x,tp[0][1]-cam.y)>viewR()+40) return; ctx.beginPath(); tp.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])); ctx.stroke(); });
  ctx.setLineDash([]); ctx.fillStyle='#000';
  S.scene.tapes.forEach(tp=>{ if(Math.hypot(tp[0][0]-cam.x,tp[0][1]-cam.y)>viewR()+40) return; tp.forEach(q=>{ ctx.beginPath(); ctx.arc(q[0],q[1],.18,0,TAU); ctx.fill(); }); });
  ctx.restore();
}
// spectators seen from above: shoulders and a head, waving and hopping as the car goes by
function drawCrowd(R,t){
  const c=S.car;
  S.scene.crowd.forEach(p=>{ if(Math.abs(p.x-cam.x)>R||Math.abs(p.y-cam.y)>R) return;
    const d=Math.hypot(p.x-c.x,p.y-c.y), ex=clamp(1-(d-8)/30,0,1), hop=ex*Math.abs(Math.sin(t*9+p.ph))*.18;
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.face+Math.PI/2); ctx.scale(1+hop,1+hop);
    ctx.fillStyle='rgba(0,0,0,.12)'; ctx.beginPath(); ctx.ellipse(.15+hop,.15+hop,.55,.3,0,0,TAU); ctx.fill();
    ctx.strokeStyle='#000'; ctx.lineWidth=1.4*PX; ctx.lineCap='round';
    if(ex>0){ const w=Math.sin(t*12+p.ph)*.5*ex; ctx.beginPath(); ctx.moveTo(-.45,0); ctx.lineTo(-.75-w*.3,-.55-ex*.2); ctx.moveTo(.45,0); ctx.lineTo(.75+w*.3,-.55-ex*.2); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(0,0,.52,.26,0,0,TAU); ctx.fillStyle='#fff'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0,0,.22,0,TAU); ctx.fillStyle='#000'; ctx.fill();
    ctx.restore(); });
}
function drawSigns(R){
  S.scene.signs.forEach(s=>{ if(Math.abs(s.x-cam.x)>R||Math.abs(s.y-cam.y)>R) return; const sc=1+s.z*.08, sg=s.dir==='R'?1:-1;
    ctx.save(); ctx.translate(s.x,s.y); ctx.fillStyle='rgba(0,0,0,.12)'; const [sx,sy]=shadowVec(); ctx.beginPath(); ctx.ellipse(sx*(1+s.z),sy*(1+s.z),1.3,.5,s.a+Math.PI/2,0,TAU); ctx.fill();
    ctx.rotate(s.a); ctx.scale(sc,sc);
    ctx.beginPath(); ctx.rect(-.4,-1.2,.8,2.4); ctx.fillStyle='#fff'; ctx.fill(); ctx.lineWidth=INK*PX; ctx.strokeStyle='#000'; ctx.stroke();
    ctx.lineWidth=.16; ctx.beginPath(); for(let k=-1;k<=1;k++){ const y=k*.7; ctx.moveTo(-.25,y-sg*.25); ctx.lineTo(.25*0,y+sg*.2); ctx.lineTo(.25,y-sg*.25); } ctx.stroke();
    ctx.restore(); });
}
function drawCar(){
  const c=S.car, [sx,sy]=shadowVec(), h=c.z, big=CARDRAW, lift=(1+h*.06)*big, def=carDef(GARAGE.car), sh=def.shape, cs=GARAGE.cars[GARAGE.car];
  // shadow stays on the ground; it slides further away the higher the car flies
  ctx.save(); ctx.translate(c.rx+sx*(1.2+h*2.2),c.ry+sy*(1.2+h*2.2)); ctx.rotate(c.ra); ctx.scale(big,big); ctx.fillStyle=`rgba(0,0,0,${Math.max(.08,.2-h*.03)})`;
  ctx.beginPath(); ctx.roundRect?ctx.roundRect(-sh.len/2,-sh.wid/2-.1,sh.len,sh.wid+.2,.55):ctx.rect(-sh.len/2,-sh.wid/2,sh.len,sh.wid); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(c.rx,c.ry); ctx.rotate(c.ra); const kx=lift*(1-S.sq*.22), ky=lift*(1+S.sq*.4); ctx.scale(kx,ky);
  drawCarShape(ctx,def,cs.livery,cs.number,{px:PX/Math.min(kx,ky),steer:c.steer*.5,roll:c.roll*.35});
  ctx.restore();
}
/* Every car, in the game and in the garage, is drawn here: top-down, nose along +x, in metres.
   o.px is one screen pixel in these units, so ink lines stay the same weight at any size. */
function rr(g,x,y,w,h,r){ g.beginPath(); if(g.roundRect) g.roundRect(x,y,w,h,r); else g.rect(x,y,w,h); }
function drawCarShape(g,def,livery,number,o){
  const sh=def.shape, L=sh.len/2, Wd=sh.wid/2, px=o.px, ink=INK*px, wk=sh.wheel||1, night=livery==='night';
  const body=()=>{ const r=sh.corner; rr(g,-L,-Wd,sh.len,sh.wid,[r*.7,r,r,r*.7]); };
  g.save(); g.lineJoin='round'; g.lineCap='round';
  // wheels, the front two turned with the steering; a buggy's sit out beside the body
  const wy=sh.wheelsOut?Wd+.3:Wd-.02, wx=L*.64;
  g.fillStyle='#000';
  [[wx,-wy],[wx,wy],[-wx,-wy],[-wx,wy]].forEach(([x,y],i)=>{ g.save(); g.translate(x,y); if(i<2) g.rotate(o.steer||0); rr(g,-.42*wk,-.21*wk,.84*wk,.42*wk,.1); g.fill(); g.restore(); });
  if(sh.wheelsOut){ g.lineWidth=.14; g.strokeStyle='#000'; g.beginPath(); g.moveTo(wx,-wy); g.lineTo(wx,wy); g.moveTo(-wx,-wy); g.lineTo(-wx,wy); g.stroke(); }
  if(sh.spare){ g.beginPath(); g.arc(-L-.28,0,.5,0,TAU); g.fillStyle='#000'; g.fill(); g.beginPath(); g.arc(-L-.28,0,.2,0,TAU); g.fillStyle='#fff'; g.fill(); }
  // body and its paint
  body(); g.fillStyle=night?'#000':'#fff'; g.fill();
  g.save(); body(); g.clip(); paintLivery(g,livery,sh,px); g.restore();
  body(); g.lineWidth=ink; g.strokeStyle='#000'; g.stroke();
  if(sh.scoop){ g.fillStyle=night?'#fff':'#000'; rr(g,sh.screen+.55,-.22,.6,.44,.1); g.fill(); }
  // rear wing
  if(sh.wing==='lip'){ g.fillStyle='#000'; g.fillRect(-L-.15,-Wd,.26,sh.wid); }
  if(sh.wing==='big'){ g.fillStyle='#000'; g.fillRect(-L-.35,-Wd-.18,.34,sh.wid+.36); g.fillRect(-L-.35,-Wd-.18,.8,.14); g.fillRect(-L-.35,Wd+.04,.8,.14); }
  // headlights
  g.lineWidth=1.2*px; g.strokeStyle='#000'; [-Wd*.66,Wd*.66].forEach(y=>{ g.beginPath(); g.arc(L-.25,y,.16,0,TAU); g.fillStyle='#fff'; g.fill(); g.stroke(); });
  // cabin leans with the body roll
  g.save(); g.translate(0,o.roll||0);
  const [c0,c1]=sh.cabin, cw=Wd-.2;
  if(sh.cage){
    g.fillStyle='#000'; [-.38,.38].forEach(y=>{ rr(g,c0+.15,y-.26,.7,.52,.12); g.fill(); });
    g.strokeStyle=night?'#fff':'#000'; g.lineWidth=.13; g.beginPath(); g.rect(c0,-cw,c1-c0,cw*2); g.moveTo(c0,-cw); g.lineTo(c1,cw); g.moveTo(c0,cw); g.lineTo(c1,-cw); g.stroke();
  } else {
    g.fillStyle='#000'; g.beginPath(); g.moveTo(c1,-cw); g.lineTo(sh.screen,-cw+.08); g.quadraticCurveTo(sh.screen+.07,0,sh.screen,cw-.08); g.lineTo(c1,cw); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(c0,-cw+.02); g.lineTo(sh.rear,-cw+.1); g.quadraticCurveTo(sh.rear-.06,0,sh.rear,cw-.1); g.lineTo(c0,cw-.02); g.closePath(); g.fill();
    rr(g,c0,-cw,c1-c0,cw*2,.2); g.fillStyle=night?'#000':'#fff'; g.fill(); g.lineWidth=ink*.8; g.strokeStyle=night?'#fff':'#000'; g.stroke();
    if(sh.rack){ g.lineWidth=1.3*px; g.beginPath(); for(let x=c0+.25;x<c1-.1;x+=.32){ g.moveTo(x,-cw+.12); g.lineTo(x,cw-.12); } g.stroke(); }
  }
  // race number on the roof (on a buggy, on the nose)
  const nx=sh.cage?L-.95:(sh.rack?c0+.05:(c0+c1)/2), nr=sh.cage?.34:sh.rack?.3:.42;
  g.beginPath(); g.arc(nx,0,nr,0,TAU); g.fillStyle='#fff'; g.fill(); g.lineWidth=1.3*px; g.strokeStyle='#000'; g.stroke();
  g.save(); g.translate(nx,0); g.rotate(Math.PI/2); g.scale(px,px); g.fillStyle='#000'; g.textAlign='center'; g.textBaseline='middle';
  g.font=`900 ${Math.max(5,Math.round((number>9?.46:.6)*(nr/.42)/px))}px Fraunces, Georgia, serif`; g.fillText(String(number),0,.04/px); g.restore();
  g.restore();
  g.restore();
}
// ink liveries, clipped to the body; in the car's own metres
function paintLivery(g,id,sh,px){
  const L=sh.len/2, Wd=sh.wid/2; g.fillStyle='#000'; g.strokeStyle='#000';
  if(id==='stripes'){ g.lineWidth=.13; g.beginPath(); [-.18,.18].forEach(y=>{ g.moveTo(-L,y); g.lineTo(L,y); }); g.stroke(); }
  else if(id==='band'){ g.fillRect(-L,-.05,sh.len,.42); g.fillStyle='#fff'; g.fillRect(-L,.42,sh.len,.08); }
  else if(id==='checks'){ const q=.32; for(let x=L-q*4;x<L;x+=q) for(let y=-Wd,k=0;y<Wd;y+=q,k++) if((Math.round((x-L)/q)+k)%2===0) g.fillRect(x,y,q,q); }
  else if(id==='hatch'){ g.lineWidth=1.2*px; g.globalAlpha=.8; g.beginPath(); for(let x=-L-Wd*2;x<L;x+=.24){ g.moveTo(x,Wd); g.lineTo(x+Wd*2,-Wd); } g.stroke(); g.globalAlpha=1; }
  else if(id==='dots'){ for(let x=-L+.2,i=0;x<L;x+=.42,i++) for(let y=-Wd+.1+(i%2)*.21;y<Wd;y+=.42){ g.beginPath(); g.arc(x,y,.1,0,TAU); g.fill(); } }
  else if(id==='flames'){ [-1,1].forEach(s=>{ g.beginPath(); g.moveTo(L,s*Wd*.2); for(let k=0;k<3;k++){ const tip=L-1.3-k*.55; g.quadraticCurveTo(tip+.5,s*(Wd*.3+k*.2),tip,s*(Wd*.5+k*.18)); g.quadraticCurveTo(tip+.6,s*(Wd*.55+k*.18),tip+.35,s*(Wd*.7+k*.12)); }
    g.lineTo(L,s*Wd); g.closePath(); g.fill(); }); }
  else if(id==='doodle'){ g.lineWidth=1.3*px; const r=seeded(3); for(let k=0;k<9;k++){ const x=-L+.3+r()*(sh.len-.6), y=-Wd+.2+r()*(sh.wid-.4), s=.12+r()*.1; g.beginPath();
      if(k%3===0){ for(let a=0;a<TAU*1.6;a+=.4){ const rr=s*a/TAU; a?g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr):g.moveTo(x,y); } }
      else if(k%3===1){ for(let a=0;a<5;a++){ const t=a/5*TAU; g.moveTo(x,y); g.lineTo(x+Math.cos(t)*s,y+Math.sin(t)*s); } }
      else { g.moveTo(x-s,y); g.quadraticCurveTo(x,y-s*1.5,x+s,y); } g.stroke(); } }
  else if(id==='pin'){ g.lineWidth=1*px; g.beginPath(); [-1,1].forEach(s=>{ const y=s*(Wd-.22); g.moveTo(L-.3,y); g.lineTo(-L+.7,y); g.bezierCurveTo(-L+.3,y,-L+.35,y-s*.3,-L+.6,y-s*.3); g.moveTo(L-.3,y-s*.1); g.lineTo(-L+.8,y-s*.1); }); g.stroke(); }
  else if(id==='camo'){ const r=seeded(8); for(let k=0;k<11;k++){ const x=-L+r()*sh.len, y=-Wd+r()*sh.wid, s=.18+r()*.22; g.beginPath(); for(let a=0;a<=12;a++){ const t=a/12*TAU, q=s*(1+.35*Math.sin(t*3+k)); a?g.lineTo(x+Math.cos(t)*q*1.4,y+Math.sin(t)*q):g.moveTo(x+q*1.4,y); } g.closePath(); g.fill(); } }
  else if(id==='feather'){ g.lineWidth=1.1*px; [-1,1].forEach(s=>{ const y0=s*Wd*.55; g.beginPath(); g.moveTo(L-.4,y0); g.quadraticCurveTo(0,y0+s*.25,-L+.3,y0); g.stroke();
      g.beginPath(); for(let x=-L+.5;x<L-.5;x+=.18){ const u=(x+L)/sh.len, y=y0+s*.25*4*u*(1-u); g.moveTo(x,y); g.lineTo(x-.25,y-s*.3); g.moveTo(x,y); g.lineTo(x-.25,y+s*.22); } g.globalAlpha=.7; g.stroke(); g.globalAlpha=1; }); }
}
// "Boost!" pops up by the car with a squash-and-stretch bounce, always upright on screen
function drawLabels(){
  S.parts.forEach(p=>{ if(p.k!=='label') return; const u=p.t/p.life, c=S.car;
    const sc=u<.1?u/.1*1.3:u<.2?1.3-(u-.1)/.1*.4:u<.3?.9+(u-.2)/.1*.1:1, sy=sc>1?sc*(2-sc):sc;
    ctx.save(); ctx.translate(c.rx,c.ry); ctx.rotate(-cam.rot); ctx.scale(PX,PX); ctx.translate(0,-46-u*26); ctx.scale(sc,sy);
    ctx.globalAlpha=u>.75?(1-u)/.25:1; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font=`italic 900 ${p.big?21:18}px Fraunces, Georgia, serif`; const w=ctx.measureText(p.text).width+22, h=p.big?32:28;
    ctx.beginPath(); ctx.roundRect?ctx.roundRect(-w/2,-h/2,w,h,h/2):ctx.rect(-w/2,-h/2,w,h);
    if(p.big){ ctx.fillStyle='#000'; ctx.fill(); ctx.fillStyle='#fff'; } else { ctx.fillStyle='#fff'; ctx.fill(); ctx.lineWidth=2.2; ctx.strokeStyle='#000'; ctx.stroke(); ctx.fillStyle='#000'; }
    ctx.fillText(p.text,0,1); ctx.restore(); });
}
// round hay bales seen from above: a rolled spiral of straw, wobbling when knocked
function drawBales(R){
  const B=S.scene.bales.filter(b=>Math.abs(b.x-cam.x)<R&&Math.abs(b.y-cam.y)<R); if(!B.length) return; const [sx,sy]=shadowVec();
  ctx.fillStyle='rgba(0,0,0,.1)'; ctx.beginPath(); B.forEach(b=>{ ctx.moveTo(b.x+sx+b.r,b.y+sy); ctx.arc(b.x+sx,b.y+sy,b.r,0,TAU); }); ctx.fill();
  B.forEach(b=>{ const r=b.r*(b.hit?1+Math.sin(b.hit*50)*b.hit*.25:1);
    ctx.beginPath(); ctx.arc(b.x,b.y,r,0,TAU); ctx.fillStyle='#fff'; ctx.fill(); ctx.lineWidth=INK*PX; ctx.strokeStyle='#000'; ctx.stroke();
    ctx.lineWidth=1.1*PX; ctx.beginPath(); for(let k=0;k<=24;k++){ const a=b.a+k/24*TAU*1.6, rr=r*.72*k/24; k?ctx.lineTo(b.x+Math.cos(a)*rr,b.y+Math.sin(a)*rr):ctx.moveTo(b.x,b.y); } ctx.stroke(); });
}
// a boost shoots ink flames out of the exhaust
function drawFlame(t){
  const c=S.car; if(!(c.boost>0)) return; const k=Math.min(1,c.boost/.3);
  ctx.save(); ctx.translate(c.rx,c.ry); ctx.rotate(c.ra); ctx.scale(CARDRAW,CARDRAW); ctx.lineCap="round"; ctx.lineJoin="round";
  const B=-carDef(GARAGE.car).shape.len/2-.1;
  for(const y of [-.45,.45]){ const L=(1.4+Math.sin(t*50+y*9)*.4)*k;
    ctx.beginPath(); ctx.moveTo(B,y-.28); ctx.quadraticCurveTo(B-L*.6,y-.3,B-L,y); ctx.quadraticCurveTo(B-L*.6,y+.3,B,y+.28); ctx.closePath();
    ctx.fillStyle='#fff'; ctx.fill(); ctx.lineWidth=1.6*PX; ctx.strokeStyle='#000'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(B-.05,y); ctx.lineTo(B-L*.55,y); ctx.stroke(); }
  ctx.restore();
}
// speed lines at the screen edges when you're flying
function drawSpeed(t){
  const v=Math.abs(S.car.vf)+(S.car.boost>0?14:0); if(v<30||RM) return; const k=Math.min(1.3,(v-30)/14);
  ctx.save(); ctx.strokeStyle='#000'; ctx.lineCap='round'; ctx.lineWidth=1.5;
  for(let i=0;i<10;i++){ const side=i%2?1:-1, x=side<0?8+((i*37)%40):W-8-((i*29)%40), y=((i*173+t*900)%(Hh+200))-100, l=40+k*50;
    ctx.globalAlpha=.25*k; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y+l); ctx.stroke(); }
  ctx.restore();
}
function draw(t){
  const st=S.stage;
  screenTransform(); ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,Hh);
  if(!st) return;
  PX=1/cam.z; const R=viewR();
  worldTransform();
  ctx.fillStyle=S.def.surface==='snow'?PAT.field:PAT.grass; ctx.fillRect(cam.x-R,cam.y-R,R*2,R*2);
  drawRoad(st,R); drawLines(st); drawSkids(R); drawTapes();
  drawBales(R); drawDust(); drawBits(); drawSigns(R); drawGhosts(R); drawFlame(t); drawCar(); drawCrowd(R,t); drawTrees(R,t); drawBanners(st); drawLabels();
  screenTransform(); drawSpeed(t);
}
