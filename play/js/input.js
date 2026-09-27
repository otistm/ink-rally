/* Ink Rally: The steering wheel. The car goes by itself; you steer by turning the wheel at the bottom of the screen,
   like the click wheel on an old iPod: put your thumb down anywhere and circle it left or right. The wheel turns
   from where you touched (no jump), a quarter turn is full lock, and it springs back to the centre when you let go.
   Arrow keys turn it too. */
"use strict";
/* ============================================================
   INPUT
   ============================================================ */
const LOCK=95*Math.PI/180;   // how far the wheel turns for full lock
const IN={down:false,gas:false,brake:0,steer:0,ptr:null,keys:{},
  reset(){ this.ptr=null; this.keys={}; this.down=false; this.gas=false; this.brake=0; this.steer=0; WH.ang=0; WH.vel=0; }};
// the wheel: its angle in radians (right is positive) and the spring that brings it home
const WH={ang:0,vel:0,cx:0,cy:0};
function wheelCentre(){ const r=$('wheel').getBoundingClientRect(); WH.cx=r.left+r.width/2; WH.cy=r.top+r.height*230/250; }
function thumbAngle(x,y){ return Math.atan2(y-WH.cy,x-WH.cx); }
function inputUpdate(dt){
  const k=IN.keys, p=IN.ptr;
  if(p){ // the wheel follows the thumb round from where it first touched
    if(Math.hypot(p.x-WH.cx,p.y-WH.cy)>24){ const a=thumbAngle(p.x,p.y); p.turn+=angDiff(p.last,a); p.last=a; }
    WH.ang=clamp(p.start+p.turn,-LOCK*1.05,LOCK*1.05); WH.vel=0; IN.down=true; }
  else if(k.ArrowLeft||k.ArrowRight||k.a||k.d){
    const want=(((k.ArrowRight||k.d)?1:0)-((k.ArrowLeft||k.a)?1:0))*LOCK; WH.ang+=(want-WH.ang)*Math.min(1,dt*10); WH.vel=0; IN.down=true; }
  else { // let go: it springs back to the middle with a little wobble
    WH.vel+=(-140*WH.ang-14*WH.vel)*dt; WH.ang+=WH.vel*dt; IN.down=false; }
  const u=clamp(WH.ang/LOCK,-1,1);
  IN.steer=IN.down?Math.sign(u)*Math.pow(Math.abs(u),1.2):0;
  IN.gas=true; IN.brake=0;
  const g=$('wrot'); if(g) g.style.transform=`rotate(${(WH.ang*180/Math.PI).toFixed(2)}deg)`;
}
function wheelShow(on){ const w=$('wheelWrap'); w.hidden=!on; if(on){ w.classList.remove('in'); void w.offsetWidth; w.classList.add('in'); } }
cv.addEventListener('pointerdown',e=>{
  if(S.st!=='drive'&&S.st!=='count') return;
  audioInit(); try{ cv.setPointerCapture(e.pointerId); }catch(_){} wheelCentre();
  const a=thumbAngle(e.clientX,e.clientY);
  IN.ptr={id:e.pointerId,x:e.clientX,y:e.clientY,last:a,start:WH.ang,turn:0};
  const w=$('wheel'); w.classList.remove('grab'); void w.getBoundingClientRect(); w.classList.add('grab');
});
cv.addEventListener('pointermove',e=>{ const p=IN.ptr; if(!p||p.id!==e.pointerId) return; p.x=e.clientX; p.y=e.clientY; });
const lift=e=>{ if(IN.ptr&&IN.ptr.id===e.pointerId){ IN.ptr=null; $('wheel').classList.remove('grab'); } };
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
