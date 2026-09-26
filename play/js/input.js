/* Ink Rally: One-thumb driving. Hold anywhere to go, slide sideways to steer, pull down to brake.
   Where your thumb lands becomes the middle of the wheel, and it follows you if you slide far. Arrow keys work too. */
"use strict";
/* ============================================================
   INPUT
   ============================================================ */
const STEER_PX=64, BRAKE_PX=22, BRAKE_RANGE=50;
const IN={down:false,gas:false,brake:0,steer:0,ptr:null,keys:{},
  reset(){ this.ptr=null; this.keys={}; this.down=false; this.gas=false; this.brake=0; this.steer=0; }};
function inputUpdate(){
  const k=IN.keys, p=IN.ptr;
  if(p){ const dx=p.x-p.x0, dy=p.y-p.y0;
    IN.steer=clamp((Math.abs(dx)<5?0:dx-Math.sign(dx)*5)/STEER_PX,-1,1);
    IN.brake=clamp((dy-BRAKE_PX)/BRAKE_RANGE,0,1);
    IN.gas=IN.brake<.08; IN.down=true; }
  else if(k.ArrowUp||k.ArrowDown||k.ArrowLeft||k.ArrowRight||k.w||k.s||k.a||k.d){
    IN.steer=((k.ArrowRight||k.d)?1:0)-((k.ArrowLeft||k.a)?1:0); IN.brake=(k.ArrowDown||k.s)?1:0; IN.gas=!!(k.ArrowUp||k.w)&&!IN.brake; IN.down=IN.gas||IN.brake>0; }
  else { IN.steer=0; IN.brake=0; IN.gas=false; IN.down=false; }
}
cv.addEventListener('pointerdown',e=>{
  if(S.st!=='drive'&&S.st!=='count') return;
  audioInit(); cv.setPointerCapture&&cv.setPointerCapture(e.pointerId);
  IN.ptr={id:e.pointerId,x0:e.clientX,y0:e.clientY,x:e.clientX,y:e.clientY};
});
cv.addEventListener('pointermove',e=>{
  const p=IN.ptr; if(!p||p.id!==e.pointerId) return; p.x=e.clientX; p.y=e.clientY;
  // the wheel's middle drifts along with a thumb that slides past full lock
  const dx=p.x-p.x0, lim=STEER_PX+5+26; if(Math.abs(dx)>lim) p.x0=p.x-Math.sign(dx)*lim;
  const dy=p.y-p.y0; if(dy<-30) p.y0=p.y+30; if(dy>BRAKE_PX+BRAKE_RANGE+30) p.y0=p.y-(BRAKE_PX+BRAKE_RANGE+30);
});
const lift=e=>{ if(IN.ptr&&IN.ptr.id===e.pointerId) IN.ptr=null; };
cv.addEventListener('pointerup',lift); cv.addEventListener('pointercancel',lift);
addEventListener('keydown',e=>{
  if(e.key==='Escape'||e.key==='p'){ if(S.st==='pause') $('pResume')&&$('pResume').click(); else showPause(); return; }
  if(/^Arrow/.test(e.key)||'wasd'.includes(e.key)){ if(S.st==='drive'||S.st==='count'){ audioInit(); e.preventDefault(); } IN.keys[e.key]=true; }
});
addEventListener('keyup',e=>{ delete IN.keys[e.key]; });
$('pause').addEventListener('click',showPause);
$('rescue').addEventListener('click',()=>{ if(S.st==='drive') rescue(); });
document.addEventListener('visibilitychange',()=>{ if(document.hidden) showPause(); });
addEventListener('blur',()=>{ IN.keys={}; });
