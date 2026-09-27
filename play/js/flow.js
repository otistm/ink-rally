/* Ink Rally: Stage flow: countdown, co-driver calls, splits, coins and achievements, finish, wrong way and rescue. */
"use strict";
/* ============================================================
   FLOW
   ============================================================ */
function startStage(id){
  const def=STAGES.find(d=>d.id===id); S.def=def; S.stage=stageFor(def); S.scene=sceneFor(S.stage);
  const st=S.stage, p=st.pts[(st.start-6)/STEP];
  S.car=newCar(p); S.car.i=(st.start-6)/STEP;
  S.scene.signs.forEach(s=>{ if(s.hit){ Object.assign(s,s.home); s.hit=false; } });
  S.race=0; S.count=3.2; S.lastCount=4; S.st='count';
  S.calls=buildCalls(st); S.callI=0; S.note=null; S.splitI=0; S.splitT=[];
  S.parts=[]; S.skid=newSkids(); S.wrong=0; S.stuck=0; S.off=0; S.finTimer=0; S.sq=0; S.sqv=0; S.shake=0;
  S.markI=0; lastClock='';
  PERF=perfFor(GARAGE.car); S.scene.coins.forEach(o=>{ o.got=false; o.gotT=0; });
  S.run=newRun(def.id); S.runCoins=0; S.coinChain=0; S.coinT=9; S.achT=0; S.newAch=[]; S.banked=null; S.finHTML=null; coinHUD();
  cam.x=p.x+Math.cos(p.a)*20; cam.y=p.y+Math.sin(p.a)*20; cam.z=5; cam.rot=-Math.PI/2-p.a;
  closeCard(); hudShow(true); hudStage(); IN.reset(); hush();
  $('note').hidden=true; hint('Slide your thumb to steer');
  say(`${def.name}. Stage start.`,true);
}

/* Each corner, crest and jump becomes a call. Calls that come close together are read as one,
   the way a co-driver would: "Left 3 into right 4, over crest". A long straight after is read as a distance. */
function noteWords(n){
  if(n.k==='jump') return 'jump';
  if(n.k==='crest') return 'over crest';
  const side=n.dir==='L'?'left':'right';
  let t=n.g===1?`hairpin ${side}`:`${side} ${n.g}`;
  if(n.g>=3&&n.ang>=110) t+=' long';
  return t;
}
const cap=t=>t.charAt(0).toUpperCase()+t.slice(1);
function buildCalls(st){
  const items=st.notes.concat(st.marks).sort((a,b)=>a.s-b.s), calls=[];
  for(let i=0;i<items.length;){
    const grp=[items[i]]; let end=items[i].end||items[i].s; i++;
    while(i<items.length&&items[i].s-end<35&&grp.length<3){ grp.push(items[i]); end=Math.max(end,items[i].end||items[i].s); i++; }
    const caution=grp.some(n=>n.caution), words=grp.map(noteWords);
    let tail=''; for(let k=1;k<words.length;k++) tail+=(grp[k].k?', ':' into ')+words[k];
    const gap=i<items.length?items[i].s-end:0;
    if(gap>=90) tail+=`, ${Math.round(gap/50)*50}`;
    calls.push({s:grp[0].s,end,items:grp,caution,head:(caution?'Caution, ':'')+cap(words[0]),tail:tail.replace(/^,\s*/,'').trim(),say:(caution?'caution, ':'')+words[0]+tail});
  }
  return calls;
}
function flowStep(dt){
  const c=S.car, st=S.stage;
  if(S.st==='count'){
    S.count-=dt; const n=Math.ceil(S.count);
    if(n!==S.lastCount&&n<=3&&n>=1){ S.lastCount=n; callout(String(n)); sfx('beep'); }
    if(S.count<=0){ S.st='drive'; callout('Go!'); sfx('go'); hint(IN.down?null:'Slide your thumb to steer'); }
    return;
  }
  if(S.st==='drive') S.race+=dt;
  S.coinT+=dt;
  if(S.st==='drive'&&(S.achT+=dt)>.25){ S.achT=0; checkAch(); }
  // co-driver: call the next bend a couple of seconds before you reach it
  const callD=45+Math.max(0,c.vf)*1.8;
  if(S.callI<S.calls.length&&c.s+callD>=S.calls[S.callI].s){ const k=S.calls[S.callI++]; S.note=k; showNote(k); say(k.say,false); }
  if(S.note&&c.s>S.note.end+8&&!$('note').hidden&&(S.callI>=S.calls.length||c.s+callD<S.calls[S.callI].s)){ $('note').hidden=true; }
  // splits
  if(S.splitI<2&&c.s>=st.splits[S.splitI]){ const t=S.race, b=bestFor(st.def.id), k=S.splitI++; S.splitT.push(t);
    const bt=b&&b.splits&&b.splits[k]; callout(`Split ${k+1}`,bt?fmtDiff(t-bt):fmt(t)); sfx('split'); }
  // finish
  if(S.st==='drive'&&c.s>=st.finish){ S.st='finish'; S.finT=S.race; bankRun(); S.finTimer=0; callout('Finish!',fmt(S.finT)); sfx('finish'); say('Stage end. '+Math.floor(S.finT)+' seconds',true); $('note').hidden=true; $('rescue').hidden=true; hint(null); }
  if(S.st==='finish'){ S.finTimer+=dt; if(S.finTimer>2.2&&$('card').hidden) showFinish(); return; }
  // wrong way and rescue
  const p=c.i<st.pts.length?st.pts[c.i]:st.pts[st.pts.length-1], fwd=(c.vx*Math.cos(p.a)+c.vy*Math.sin(p.a));
  S.wrong=fwd<-3?S.wrong+dt:0;
  const off=Math.abs(c.lat)>p.w/2+3; S.off=off?S.off+dt:0;
  S.stuck=(Math.abs(c.vf)<1.5&&S.race>2)?S.stuck+dt:0;
  if(Math.abs(c.lat)>60) rescue();
  $('rescue').hidden=!(S.off>1.4||S.stuck>1.6||S.wrong>1.5);
  if(S.wrong>1) hint('Wrong way! Turn around');
  else if(IN.down||$('hintT').textContent.startsWith('Wrong')) hint(null);
}
/* What a run did, for achievements. */
function newRun(stage){ return {stage,car:GARAGE.car,coins:0,touches:0,boosts:0,supers:0,maxKmh:0,longJump:0,landings:0,longSlide:0,finished:false,medal:null}; }
// achievements are earned the moment they happen, for the car you're driving, and pay out straight away
function checkAch(){
  const R=S.run; if(!R) return;
  ACHIEVEMENTS.forEach(a=>{ if(a.car!==R.car||GARAGE.ach[a.id]||!a.test(R)) return;
    GARAGE.ach[a.id]=true; GARAGE.coins+=a.reward; S.newAch.push(a); saveGarage();
    toast('Achievement: '+a.name,`${a.desc} +${a.reward} coins`); sfx('achieve');
    if(carDone(R.car)){ const L=LIVERIES.find(l=>l.sig===R.car); setTimeout(()=>toast('New livery: '+L.name,`Every ${carDef(R.car).name} achievement done. Paint it on in the garage.`),2600); } });
}
// coins you pick up are yours once you cross the finish line, plus a bonus for a trophy
function bankRun(){
  const R=S.run, st=S.stage; R.finished=true; R.medal=medalFor(st,S.finT); checkAch();
  const bonus=R.medal?MEDAL_COINS[R.medal]:0;
  GARAGE.coins+=S.runCoins+bonus; GARAGE.total+=S.runCoins; saveGarage();
  S.banked={coins:S.runCoins,bonus,of:st&&S.scene.coins.reduce((a,o)=>a+(o.big?5:1),0)};
}
// put the car back in the middle of the road, facing the right way; the clock keeps running
function rescue(){
  const c=S.car, st=S.stage, i=clamp(c.i,0,st.pts.length-1), p=st.pts[i];
  Object.assign(c,{x:p.x,y:p.y,a:p.a,vx:0,vy:0,w:0,z:0,vz:0,vf:0,vl:0,drift:0,charge:0,boost:0,wheelL:null,wheelR:null});
  S.sq=.35; S.sqv=0; S.off=0; S.stuck=0; S.wrong=0; $('rescue').hidden=true; hint(null); sfx('land',.6);
}
