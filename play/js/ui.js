/* Ink Rally: HUD, pacenote card, callouts and hints. */
"use strict";
/* ============================================================
   UI
   ============================================================ */
const $=id=>document.getElementById(id);
function fmt(t){ if(!isFinite(t)) return '–'; const m=Math.floor(t/60), s=t-m*60; return m+':'+(s<10?'0':'')+s.toFixed(1); }
function fmtDiff(d){ return (d<0?'−':'+')+Math.abs(d).toFixed(1)+'s'; }
function hudShow(on){ ['top','pause'].forEach(id=>$(id).hidden=!on); wheelShow(on); if(!on){ $('note').hidden=true; $('rescue').hidden=true; $('hint').hidden=true; } }
function hudStage(){ const st=S.stage, b=bestFor(st.def.id);
  $('hn').textContent=st.def.name; $('hsub').textContent=st.def.place;
  $('best').textContent=b?'Best '+fmt(b.t):'No best yet';
  $('tk1').style.left=(100/3)+'%'; $('tk2').style.left=(200/3)+'%'; }
let lastClock='';
function updHUD(){
  const c=S.car, st=S.stage, txt=fmt(S.st==='finish'?S.finT:S.race);
  if(txt!==lastClock){ $('clock').textContent=txt; lastClock=txt; }
  $('wkmh').textContent=Math.round(Math.abs(c.vf)*3.6);
  $('pdot').style.left=(clamp((c.s-st.start)/st.length,0,1)*100)+'%';
}
let calloutTO=0;
function callout(big,small){
  const el=$('callout'); el.innerHTML=`<b>${big}</b>`+(small?`<span>${small}</span>`:'');
  el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
}
// the pacenote card: an ink arrow bent as sharply as the corner, and the words the co-driver says
function arrowPath(n){
  if(!n||n.k==='crest') return 'M8 30 Q22 8 36 30';
  if(n.k==='jump') return 'M6 34 L22 20 M22 20 L16 20 M22 20 L22 26 M28 14 L38 8';
  const sg=n.dir==='R'?1:-1, bend=[0,150,110,80,55,35,20][n.g]*Math.PI/180, L=26, steps=8;
  let x=22-sg*6*(1-n.g/7), y=38, a=-Math.PI/2, d=`M${x.toFixed(1)} ${y.toFixed(1)}`;
  for(let i=0;i<steps;i++){ a+=sg*bend/steps; x+=Math.cos(a)*L/steps; y+=Math.sin(a)*L/steps; d+=` L${x.toFixed(1)} ${y.toFixed(1)}`; }
  const h=6, a1=a+Math.PI*.8, a2=a-Math.PI*.8;
  d+=` M${(x+Math.cos(a1)*h).toFixed(1)} ${(y+Math.sin(a1)*h).toFixed(1)} L${x.toFixed(1)} ${y.toFixed(1)} L${(x+Math.cos(a2)*h).toFixed(1)} ${(y+Math.sin(a2)*h).toFixed(1)}`;
  return d;
}
function showNote(call){
  const el=$('note'); $('noteArrowPath').setAttribute('d',arrowPath(call.items[0]));
  $('noteT').textContent=call.head; $('noteN').textContent=call.tail;
  el.classList.toggle('warn',call.caution);
  el.hidden=false; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
}
function coinHUD(){ const el=$('ccount'); el.textContent=S.runCoins||0; const w=$('hcoins'); w.classList.remove('bump'); void w.offsetWidth; w.classList.add('bump'); }
let toastQ=[], toastOn=false;
function toast(title,sub){ toastQ.push([title,sub]); if(!toastOn) nextToast(); }
function nextToast(){ const q=toastQ.shift(), el=$('toast'); if(!q){ toastOn=false; el.hidden=true; return; } toastOn=true;
  $('toastT').textContent=q[0]; $('toastS').textContent=q[1]; el.hidden=false; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
  setTimeout(nextToast,2600); }
function hint(text){ if(text){ $('hintT').textContent=text; $('hint').hidden=false; } else $('hint').hidden=true; }
