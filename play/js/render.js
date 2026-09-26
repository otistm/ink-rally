/* Ink Rally: Canvas setup, ink patterns and the camera, which turns with the car so the road ahead is always up. */
"use strict";
/* ============================================================
   RENDER SETUP
   ============================================================ */
const cv=document.getElementById('c'), ctx=cv.getContext('2d');
let W=0,Hh=0,DPR=1;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
// x,y: world point at the anchor; z: pixels per metre; rot: screen turn; the car sits mid-screen, clear of the thumb
const cam={x:0,y:0,z:7,rot:0,ax:0,ay:0};
let PAT={};
const INK=2.2, PZ=7; // patterns are drawn at PZ pixels per metre and stay stuck to the ground

function tile(w,h,draw){
  const c=document.createElement('canvas'); c.width=Math.round(w*DPR); c.height=Math.round(h*DPR);
  const g=c.getContext('2d'); g.scale(DPR,DPR); g.fillStyle='#fff'; g.fillRect(0,0,w,h);
  g.strokeStyle='#000'; g.fillStyle='#000'; g.lineCap='round'; g.lineJoin='round'; draw(g);
  const p=ctx.createPattern(c,'repeat'); if(p.setTransform) p.setTransform(new DOMMatrix([1/(DPR*PZ),0,0,1/(DPR*PZ),0,0])); return p;
}
function makePatterns(){
  // grass: little ink tufts
  PAT.grass=tile(120,120,g=>{ const r=seeded(11); g.lineWidth=1.1; g.globalAlpha=.4;
    for(let i=0;i<9;i++){ const x=8+r()*104,y=8+r()*104,s=2+r()*1.2; g.beginPath(); g.moveTo(x-s,y+s*.7); g.lineTo(x-s*.2,y-s); g.moveTo(x+s*.2,y-s*.9); g.lineTo(x+s,y+s*.7); g.stroke(); } });
  // snowfield: almost bare paper with a few soft dots
  PAT.field=tile(90,90,g=>{ const r=seeded(3); g.globalAlpha=.25; for(let i=0;i<5;i++){ g.beginPath(); g.arc(4+r()*82,4+r()*82,.9,0,TAU); g.fill(); } });
  PAT.gravel=tile(22,22,g=>{ const r=seeded(5); g.globalAlpha=.45; for(let i=0;i<5;i++){ g.beginPath(); g.arc(2+r()*18,2+r()*18,.8,0,TAU); g.fill(); } });
  PAT.verge=tile(16,16,g=>{ const r=seeded(9); g.globalAlpha=.7; for(let i=0;i<5;i++){ g.beginPath(); g.arc(2+r()*12,2+r()*12,.9,0,TAU); g.fill(); } });
  PAT.snow=tile(40,40,g=>{ const r=seeded(13); g.globalAlpha=.18; for(let i=0;i<4;i++){ g.beginPath(); g.arc(3+r()*34,3+r()*34,1,0,TAU); g.fill(); } });
  PAT.bank=tile(10,10,g=>{ g.lineWidth=1; g.globalAlpha=.3; g.beginPath(); g.moveTo(-2,12); g.lineTo(12,-2); g.moveTo(-2,2); g.lineTo(2,-2); g.moveTo(8,12); g.lineTo(12,8); g.stroke(); });
  PAT.tarmac='#fff';
  PAT.ice=tile(60,24,g=>{ g.lineWidth=1.2; g.globalAlpha=.35; g.beginPath(); g.moveTo(6,6); g.lineTo(26,6); g.moveTo(34,17); g.lineTo(52,17); g.stroke(); });
}
function resize(){
  DPR=Math.min(2,window.devicePixelRatio||1); W=innerWidth; Hh=innerHeight;
  cv.width=Math.round(W*DPR); cv.height=Math.round(Hh*DPR);
  cam.ax=W/2; cam.ay=Hh*.5; makePatterns();
}
const shakeOff={x:0,y:0};
// draw in world metres from here on; line widths must be divided by cam.z to stay the same on screen
function worldTransform(){
  const s=cam.z*DPR, c=Math.cos(cam.rot)*s, n=Math.sin(cam.rot)*s;
  ctx.setTransform(c,n,-n,c, DPR*(cam.ax+shakeOff.x)-(c*cam.x-n*cam.y), DPR*(cam.ay+shakeOff.y)-(n*cam.x+c*cam.y));
}
function screenTransform(){ ctx.setTransform(DPR,0,0,DPR,0,0); }
// how far from the camera point anything visible can be, in metres
function viewR(){ return Math.hypot(Math.max(cam.ax,W-cam.ax),Math.max(cam.ay,Hh-cam.ay))/cam.z+6; }
