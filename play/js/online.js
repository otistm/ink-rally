/* Ink Rally: Online play, like Ink Nine's. Players sign in anonymously to Supabase with a name and an optional group code.
   Each player's best run on each stage is saved with a recording of the drive, which comes back as a ghost car for
   friends in the same group, and all the best times make the stage leaderboard.
   Table rally_runs: one row per player per stage (see supabase/01-rally-runs.sql). */
"use strict";
/* ============================================================
   CONNECTING
   ============================================================ */
const NET={sb:null,uid:null,ready:null,err:'',save:'',load:''};
const ONLINE=!!(SUPABASE_URL&&SUPABASE_ANON_KEY);
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
NET.ready=(async()=>{ if(!ONLINE) return; try{
  const { createClient }=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  const sb=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'inkrally-auth'}});
  let { data:{ session } }=await sb.auth.getSession();
  if(!session){ const r=await sb.auth.signInAnonymously(); session=r.data&&r.data.session;
    if(r.error) NET.err=/anonymous/i.test(r.error.message||'')?'Anonymous sign-ins are turned off in Supabase (Authentication settings).':'Could not sign in: '+(r.error.message||'unknown error'); }
  if(session){
    const t=await sb.from('rally_runs').select('player_id').limit(1); // a real read: a head-only count says "fine" even when the table is missing
    if(t.error) NET.err=/does not exist|PGRST205|42P01|schema cache/i.test((t.error.message||'')+(t.error.code||''))?'The rally_runs table is missing. Run supabase/01-rally-runs.sql in the Supabase SQL Editor.':'Database error: '+(t.error.message||t.error.code);
    else { NET.sb=sb; NET.uid=session.user.id; }
  }
}catch(e){ NET.err='Could not reach the online service: '+(e&&e.message||e); console.warn('Online play unavailable',e); } })();
// never let a stalled network call leave the game "connecting" forever
NET.ready=Promise.race([NET.ready,new Promise(r=>setTimeout(()=>{ if(!NET.sb&&!NET.err&&ONLINE) NET.err='Timed out going online. Check your connection and reload.'; r(); },15000))]);
NET.ready.then(()=>syncName());
async function syncName(){
  await NET.ready; if(!NET.sb||!NET.uid||!meta.name) return;
  try{ await NET.sb.from('rally_runs').update({name:meta.name,grp:meta.grp||''}).eq('player_id',NET.uid); }catch(e){}
}

/* ============================================================
   RECORDING — where the car is every tenth of a second: x, y, heading, height
   ============================================================ */
const REC_DT=.1, REC_MAX=6000;
function recReset(){ S.rec=[]; S.recT=0; }
function recStep(){
  const c=S.car; if(!S.rec) return;
  while(S.recT<=S.race&&S.rec.length<REC_MAX*4){ S.rec.push(+c.x.toFixed(1),+c.y.toFixed(1),+c.a.toFixed(2),+Math.max(0,c.z).toFixed(1)); S.recT+=REC_DT; }
}

/* ============================================================
   GHOSTS AND THE LEADERBOARD
   S.board: the best time of everyone in your group on this stage (you included), fastest first.
   S.ghosts: the five fastest other drivers, raced alongside you.
   ============================================================ */
async function loadBoard(def){
  S.board=null; S.ghosts=[]; NET.load=''; await NET.ready; if(!NET.sb) return;
  try{
    const {data,error}=await NET.sb.from('rally_runs').select('player_id,name,car,livery,num,t,path')
      .eq('stage',def.id).eq('rev',def.rev||1).eq('grp',meta.grp||'').order('t',{ascending:true}).limit(12);
    if(error) throw error;
    if(S.def!==def) return; // they've moved on to another stage
    const rows=(data||[]).map(r=>({id:r.player_id,name:String(r.name||'Driver').slice(0,16),car:CARS.some(c=>c.id===r.car)?r.car:'scribble',
      livery:LIVERIES.some(l=>l.id===r.livery)?r.livery:'stripes',num:r.num|0||9,t:+r.t,path:Array.isArray(r.path)?r.path:[],me:r.player_id===NET.uid}));
    S.board=rows;
    S.ghosts=rows.filter(r=>!r.me&&r.path.length>=8).slice(0,5);
    NET.load=`${rows.filter(r=>!r.me).length} other driver${rows.filter(r=>!r.me).length===1?'':'s'} on this stage in ${meta.grp?'group '+meta.grp:'the open group'}.`;
  }catch(e){ NET.load='Could not load the leaderboard: '+(e.message||e.code||e); }
}
// after a finish: save the run if it beats your saved best (or you have none), then refresh the board
async function saveRun(){
  const def=S.def, t=S.finT, path=S.rec?S.rec.slice():[]; NET.save='';
  await NET.ready;
  if(!NET.sb||!NET.uid){ if(ONLINE) NET.save='Not saved online: '+(NET.err||'not connected'); return; }
  try{
    const {data:cur}=await NET.sb.from('rally_runs').select('t,rev,grp').eq('player_id',NET.uid).eq('stage',def.id).maybeSingle();
    const same=cur&&(cur.rev||1)===(def.rev||1)&&(cur.grp||'')===(meta.grp||'');
    if(same&&cur.t<=t){ NET.save=`Your best of ${fmt(cur.t)} stays on the leaderboard.`; }
    else {
      const cs=GARAGE.cars[S.run.car];
      const {error}=await NET.sb.from('rally_runs').upsert({player_id:NET.uid,stage:def.id,rev:def.rev||1,grp:meta.grp||'',name:meta.name||'',
        car:S.run.car,livery:cs.livery,num:cs.number,t:+t.toFixed(2),splits:S.splitT.map(x=>+x.toFixed(2)),path,updated_at:new Date().toISOString()},{onConflict:'player_id,stage'});
      NET.save=error?'Online save failed: '+(error.message||error.code):same||cur?'New best saved to the leaderboard.':'Saved to the leaderboard.';
    }
  }catch(e){ NET.save='Online save failed: '+(e.message||e); }
  if(S.def===def){ await loadBoard(def); refreshBoard(); }
}
function refreshBoard(){ const el=$('lboard'); if(el) el.outerHTML=leaderboardHTML(); }
function leaderboardHTML(){
  if(!ONLINE) return '';
  const where=meta.grp?`group ${esc(meta.grp)}`:'the open group';
  if(!S.board) return `<div id="lboard"><h3>Leaderboard</h3><p class="netline${NET.err?' bad':''}">${NET.err?'Online play problem: '+esc(NET.err):'Loading…'}</p></div>`;
  const rows=S.board.slice(0,10), mine=S.board.find(r=>r.me);
  const body=rows.length?rows.map((r,i)=>`<div class="row${r.me?' me':' fr'}" style="animation-delay:${.05+i*.05}s"><span class="pos">${i+1}</span><span class="nm">${esc(r.name)}${r.me?' (you)':''}<small>${carDef(r.car).name}</small></span><i></i><b>${fmt(r.t)}</b></div>`).join('')
    :`<div class="row"><span class="pos"></span><span class="nm">Nobody yet. Be the first.</span><i></i><b></b></div>`;
  return `<div id="lboard"><h3>Leaderboard · ${where}</h3><div class="board">${body}</div>
    ${mine&&!rows.includes(mine)?`<p class="netline">You're ${S.board.indexOf(mine)+1}th with ${fmt(mine.t)}.</p>`:''}
    <p class="netline" id="netnote">${esc(NET.save||'')}</p></div>`;
}

/* ============================================================
   DRAWING GHOSTS — see-through cars in their owners' paint, with a name tag
   ============================================================ */
function ghostAt(g,t){
  const P=g.path, n=P.length/4|0; if(!n) return null;
  const f=clamp(t/REC_DT,0,n-1), i=Math.floor(f), j=Math.min(n-1,i+1), u=f-i;
  return {x:lerp(P[i*4],P[j*4],u),y:lerp(P[i*4+1],P[j*4+1],u),a:P[i*4+2]+angDiff(P[i*4+2],P[j*4+2])*u,z:lerp(P[i*4+3],P[j*4+3],u),done:t>g.t+1.2};
}
function drawGhosts(R){
  const G_=S.ghosts; if(!G_||!G_.length||!S.stage) return; const t=S.st==='count'?0:S.st==='finish'?S.finT+S.finTimer:S.race;
  G_.forEach(g=>{ const p=ghostAt(g,t); if(!p||p.done) return; if(Math.abs(p.x-cam.x)>R||Math.abs(p.y-cam.y)>R) return;
    const def=carDef(g.car), lift=CARDRAW*(1+p.z*.06);
    ctx.save(); ctx.globalAlpha=.42; ctx.translate(p.x,p.y); ctx.rotate(p.a); ctx.scale(lift,lift);
    drawCarShape(ctx,def,g.livery,g.num,{px:PX/lift,steer:0,roll:0}); ctx.restore();
    // the name tag floats above the ghost, upright on screen
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(-cam.rot); ctx.scale(PX,PX); ctx.translate(0,-38-p.z*3);
    ctx.font='800 11.5px Figtree, system-ui, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    const w=ctx.measureText(g.name).width+14; ctx.globalAlpha=.9; ctx.fillStyle='#fff'; ctx.strokeStyle='#000'; ctx.lineWidth=1.5; ctx.setLineDash([3,2]);
    ctx.beginPath(); ctx.roundRect?ctx.roundRect(-w/2,-9,w,18,9):ctx.rect(-w/2,-9,w,18); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle='#000'; ctx.fillText(g.name,0,.5); ctx.restore(); });
}
