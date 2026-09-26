/* Ink Rally: Main loop, camera and startup. Loaded last. */
"use strict";
/* ============================================================
   LOOP
   ============================================================ */
let lastT=performance.now(), acc=0;
function camStep(dt){
  const c=S.car, sp=Math.hypot(c.vx,c.vy);
  // look along where the car is going, not where its nose points, so slides don't spin the world
  const dir=sp>4?Math.atan2(c.vy,c.vx):c.a, rotT=-Math.PI/2-dir;
  cam.rot+=angDiff(cam.rot,rotT)*(1-Math.exp(-dt*(S.st==='count'?8:3.2)));
  const scale=clamp(Math.min(W,Hh*.6)/390,.8,1.6), zT=(7.6-Math.min(52,sp)*.065)*scale;
  cam.z+=(zT-cam.z)*(1-Math.exp(-dt*1.6));
  const lead=.12, tx=c.x+c.vx*lead, ty=c.y+c.vy*lead, k=1-Math.exp(-dt*9);
  cam.x+=(tx-cam.x)*k; cam.y+=(ty-cam.y)*k;
  S.shake*=Math.exp(-dt*8); const sk=S.shake*(RM?.15:1); shakeOff.x=(Math.random()-.5)*sk; shakeOff.y=(Math.random()-.5)*sk;
}
function tick(now){
  const dt=Math.max(0,Math.min(.05,(now-lastT)/1000)); lastT=now; S.t+=dt;
  if(S.stage&&S.st!=='home'&&S.st!=='pause'){
    inputUpdate();
    acc+=dt; while(acc>=DT){ carStep(DT); acc-=DT; }
    partsStep(dt); flowStep(dt); camStep(dt);
    // squash spring (follow-through after landings and knocks)
    S.sqv+=(-170*S.sq-10*S.sqv)*dt; S.sq+=S.sqv*dt;
    const c=S.car; engineSet(c.vf,c.gas||(S.st==='count'&&IN.down),c.slip,SURF[c.surf].loose,true);
    updHUD();
  } else acc=0;
  draw(S.t);
}
// an unexpected error must never freeze the game: the next frame is always scheduled
let badFrames=0;
function frame(now){
  requestAnimationFrame(frame);
  try{ tick(now); badFrames=0; }
  catch(e){ badFrames++; console.error(e); if(badFrames>=3&&S.car){ badFrames=0; try{ rescue(); }catch(_){} } }
}

/* boot */
addEventListener('resize',resize);
resize();
showHome();
requestAnimationFrame(frame);
