/* Ink Rally: Procedural sound (engine, tyres, knocks) and the co-driver's voice. */
"use strict";
/* ============================================================
   AUDIO — tiny procedural foley
   ============================================================ */
let AC=null, ENG=null;
function audioInit(){
  if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
  if(AC&&AC.state==='suspended') AC.resume();
  if(AC&&!ENG) engineInit();
}
function tone(f,d,type,v,f2){ if(!AC) return; const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();
  o.type=type||'sine'; o.frequency.setValueAtTime(f,t); if(f2) o.frequency.exponentialRampToValueAtTime(f2,t+d);
  g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+d); o.connect(g).connect(AC.destination); o.start(t); o.stop(t+d+.02); }
function noiseBuf(d){ const n=Math.floor(AC.sampleRate*d),buf=AC.createBuffer(1,n,AC.sampleRate),a=buf.getChannelData(0); for(let i=0;i<n;i++) a[i]=Math.random()*2-1; return buf; }
function noise(d,v,fc,q){ if(!AC) return; const t=AC.currentTime,s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();
  s.buffer=noiseBuf(d); f.type='bandpass'; f.frequency.value=fc; f.Q.value=q||1; g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+d);
  s.connect(f).connect(g).connect(AC.destination); s.start(t); }
// the engine is two buzzing oscillators through a soft filter; the tyres are filtered noise that swells when you slide
function engineInit(){
  const t=AC.currentTime, out=AC.createGain(); out.gain.value=0; out.connect(AC.destination);
  const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=600; lp.Q.value=3; lp.connect(out);
  const o1=AC.createOscillator(), o2=AC.createOscillator(); o1.type='sawtooth'; o2.type='square'; o2.detune.value=-1200;
  const g2=AC.createGain(); g2.gain.value=.5; o1.connect(lp); o2.connect(g2).connect(lp); o1.start(t); o2.start(t);
  const sk=AC.createBufferSource(); sk.buffer=noiseBuf(2); sk.loop=true; const bp=AC.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=900; bp.Q.value=.8;
  const sg=AC.createGain(); sg.gain.value=0; sk.connect(bp).connect(sg).connect(AC.destination); sk.start(t);
  ENG={out,lp,o1,o2,sg,bp};
}
// rpm climbs through five fake gears as the car speeds up
function engineSet(speed,gas,slip,loose,on){
  if(!ENG) return; const t=AC.currentTime, sp=Math.abs(speed);
  const gears=[0,9,17,25,33,99]; let g=0; while(sp>gears[g+1]) g++;
  const u=clamp((sp-gears[g])/(gears[g+1]-gears[g]),0,1), rpm=g===5?1:.25+.75*u, rev=on?Math.max(rpm,gas?.35:0):0;
  ENG.o1.frequency.setTargetAtTime(38+rev*120,t,.05); ENG.o2.frequency.setTargetAtTime(38+rev*120,t,.05);
  ENG.lp.frequency.setTargetAtTime(300+rev*900+(gas?500:0),t,.08);
  ENG.out.gain.setTargetAtTime(on?(.035+(gas?.05:.015)+rev*.03):0,t,.1);
  ENG.sg.gain.setTargetAtTime(on?clamp((slip-1.5)*.03,0,.12):0,t,.06); ENG.bp.frequency.setTargetAtTime(loose?700:1600,t,.1);
}
function sfx(k,p=1){
  if(k==='crash'){ noise(.3,.5*p,300,.7); tone(90,.25,'triangle',.35*p,40); }
  else if(k==='bump'){ tone(110,.12,'sine',.25*p,60); noise(.1,.2*p,900,.8); }
  else if(k==='charge'){ tone(p>1?1100:760,.09,'triangle',.12); }
  else if(k==='boost'){ noise(.5,.35*p,1800,.6); tone(220,.45,'sawtooth',.08*p,660); }
  else if(k==='achieve'){ [784,988,1175,1568].forEach((f,i)=>setTimeout(()=>tone(f,.22,'triangle',.13),i*90)); }
  else if(k==='buy'){ tone(660,.08,'square',.07); setTimeout(()=>tone(990,.16,'triangle',.12),70); }
  else if(k==='nope'){ tone(180,.15,'square',.06,120); }
  else if(k==='land'){ noise(.12,.3*p,500,.8); tone(70,.15,'sine',.3*p,40); }
  else if(k==='beep'){ tone(660,.18,'square',.08); }
  else if(k==='go'){ tone(990,.4,'square',.1); }
  else if(k==='split'){ tone(880,.08,'sine',.12); setTimeout(()=>tone(1320,.14,'sine',.1),70); }
  else if(k==='finish'){ [523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.3,'triangle',.18),i*110)); }
  else if(k==='tick'){ tone(900,.03,'sine',.08); }
}
/* The co-driver reads the pacenotes out loud, using the phone's own voice. */
let voiceOn=true, VOICE=null;
function pickVoice(){ if(!('speechSynthesis' in window)) return; const vs=speechSynthesis.getVoices(); VOICE=vs.find(v=>/en-GB/i.test(v.lang))||vs.find(v=>/^en/i.test(v.lang))||null; }
if('speechSynthesis' in window){ pickVoice(); speechSynthesis.onvoiceschanged=pickVoice; }
function say(text,urgent){
  if(!voiceOn||!('speechSynthesis' in window)) return;
  try{ if(urgent) speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); u.rate=1.35; u.pitch=1; u.volume=1; if(VOICE) u.voice=VOICE; speechSynthesis.speak(u); }catch(e){}
}
function hush(){ try{ if('speechSynthesis' in window) speechSynthesis.cancel(); }catch(e){} }
