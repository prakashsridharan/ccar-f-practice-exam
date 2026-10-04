// Shared exam engine. Each page loads /exams/<exam>.js first, which defines
// the globals EXAM (config), BQ (questions), BS (scenarios) and REFS (links).
// Keep this file free of exam-specific literals: copy belongs in EXAM.copy.
const SUPABASE_URL='https://vuzdypmlfpeslsfezapd.supabase.co';
const SUPABASE_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1emR5cG1sZnBlc2xzZmV6YXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNjYyNDcsImV4cCI6MjEwMzk0MjI0N30.UGbcFwFLeKnTITJLQm8QO4YPn1hDhWe8ptz1-QJ19ik';

const IC={plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',reset:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>',upload:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',play:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',book:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',flag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'};

// ---- Exam configuration -------------------------------------------------
// Everything exam-specific lives here so a second certification is data, not
// code. DM and WEIGHTS below are derived from it and keep their old
// shape, so existing call sites are untouched.
const PALETTE=[['#0097A7','#E8F6F8'],['#2E86C1','#D6EAF8'],['#5B38B6','#F0EBF9'],['#C0522A','#FDF0EB'],['#1B4F8A','#EEF5FB'],['#0E7C66','#E6F4F1'],['#8E44AD','#F3EAF7'],['#B7791F','#FBF3E2'],['#2C7A7B','#E6F4F4'],['#9B2C2C','#FBEAEA']];
const EX=EXAM;
const EXAM_ID=EX.id;
// Largest-remainder apportionment so the picks always total questionCount
// exactly, whatever the weights are. An explicit `pick` wins over the weight.
function weightsFor(ex){
 const keys=Object.keys(ex.domains),N=ex.blueprint.questionCount,out={};
 if(keys.every(k=>typeof ex.domains[k].pick==='number')){
  keys.forEach(k=>out[k]=ex.domains[k].pick);
  const sum=keys.reduce((a,k)=>a+out[k],0);
  if(sum!==N)console.warn('EXAM_CONFIG: picks total '+sum+' but questionCount is '+N);
  return out;
 }
 let used=0;
 const rem=keys.map(k=>{const v=ex.domains[k].weightPct/100*N;out[k]=Math.floor(v);used+=out[k];return{k,r:v-Math.floor(v)};});
 rem.sort((a,b)=>b.r-a.r).slice(0,N-used).forEach(x=>out[x.k]++);
 return out;
}
function domainIdx(n){return Object.keys(EX.domains).indexOf(String(n));}
function domainColor(n,i){const d=EX.domains[n];if(!d)return 'var(--text-m)';return d.color||PALETTE[(i===undefined?domainIdx(n):i)%PALETTE.length][0];}
function domainTint(n,i){const d=EX.domains[n];if(!d)return 'var(--bg)';return d.tint||PALETTE[(i===undefined?domainIdx(n):i)%PALETTE.length][1];}
// Publish every domain colour as a CSS variable so --d<n> works for any count.
function applyDomainTheme(){const r=document.documentElement;Object.keys(EX.domains).forEach((k,i)=>{r.style.setProperty('--d'+k,domainColor(k,i));r.style.setProperty('--d'+k+'b',domainTint(k,i));});}
const DM={};
Object.keys(EX.domains).forEach(k=>{DM[k]={n:EX.domains[k].n};});
const WEIGHTS=weightsFor(EX);

// Numeric id order, so Q2 sorts before Q10.
function byDomainThenId(a,b){return a.domain-b.domain||a.id.localeCompare(b.id,undefined,{numeric:true});}
const BUILTIN=BQ.map(q=>({id:q.id,scenario:q.s,domain:q.d,type:q.ty,select:q.se,question:q.q,options:q.o,answer:q.a,rationale:q.r,whynot:q.w,difficulty:q.df||'',objective:q.ob||'',ref:REFS[q.id]||''})).sort(byDomainThenId);
let CQ=[],CS={};let view='home';const homeOpen=new Set();
let st={as:0,rev:{},sel:{},sub:{},modal:null,pq:[],pi:0,psec:EX.blueprint.durationSec,pflag:{},pdone:false,adminKey:(localStorage.getItem('ccar-admin-key')||localStorage.getItem('ccar-f-admin-key')||'')};

function hasSupa(){return SUPABASE_URL&&SUPABASE_ANON;}
async function supaFetch(path,opts={}){const key=opts.admin?st.adminKey:SUPABASE_ANON;const r=await fetch(SUPABASE_URL+'/rest/v1/'+path,{headers:{'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json','Prefer':opts.prefer||''},method:opts.method||'GET',body:opts.body?JSON.stringify(opts.body):undefined});if(!r.ok)throw new Error(await r.text());const text=await r.text();return text?JSON.parse(text):null;}
let dbLoaded=false;
async function loadData(){if(hasSupa()&&EX.useDb!==false){try{const aq=await supaFetch('questions?select=*&order=question_id');const ss=await supaFetch('scenarios?select=*');if(aq&&aq.length>0){BUILTIN.length=0;aq.forEach(r=>{const q={id:r.question_id,scenario:r.scenario_num,domain:r.domain,type:r.question_type,select:r.select_count,question:r.question_text,options:r.options,answer:r.correct_answers,rationale:r.rationale||'',whynot:r.why_not||'',ref:r.ref_url||REFS[r.question_id]||'',custom:!r.is_builtin};if(r.is_builtin)BUILTIN.push(q);else CQ.push(q);});BUILTIN.sort(byDomainThenId);dbLoaded=true;console.log('Loaded '+aq.length+' questions from Supabase');}if(ss)ss.forEach(r=>{if(!r.is_builtin)CS[r.scenario_num]={t:r.title,d:r.description};});return;}catch(e){console.warn('Supabase unavailable, using built-in:',e.message);}}try{CQ=JSON.parse(localStorage.getItem(EX.storagePrefix+'-cq')||'[]');}catch(e){CQ=[];}try{CS=JSON.parse(localStorage.getItem(EX.storagePrefix+'-cs')||'{}');}catch(e){CS={};}}
async function saveData(){localStorage.setItem(EX.storagePrefix+'-cq',JSON.stringify(CQ));localStorage.setItem(EX.storagePrefix+'-cs',JSON.stringify(CS));}

// Visit tracking
async function trackVisit(){if(!hasSupa())return;try{const r=await fetch(SUPABASE_URL+'/rest/v1/visits',{method:'POST',headers:{'apikey':SUPABASE_ANON,'Authorization':'Bearer '+SUPABASE_ANON,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({page:EX.visitPage||'home',ua:navigator.userAgent.substring(0,200)})});if(!r.ok)console.warn('Visit tracking:',r.status,await r.text());}catch(e){console.warn('Visit tracking error:',e);}}
async function getVisitCount(){if(!hasSupa())return{total:0,today:0,unique:0};try{const r=await fetch(SUPABASE_URL+'/rest/v1/rpc/visit_stats',{method:'POST',headers:{'apikey':SUPABASE_ANON,'Authorization':'Bearer '+SUPABASE_ANON,'Content-Type':'application/json'}});if(r.ok){const d=await r.json();return d;}else{console.warn('Visit stats:',r.status,await r.text());}return{total:0,today:0,unique:0};}catch(e){console.warn('Visit stats error:',e);return{total:0,today:0,unique:0};}}
function allQ(){return[...BUILTIN,...CQ];}
async function seedDB(){if(EX.useDb===false){alert('The '+EX.code+' question bank ships with the page and is not stored in Supabase yet.');return;}if(!hasSupa()||!st.adminKey){alert('Set your Supabase service role key first.');return;}
  const total=BQ.length;let done=0;let errors=0;
  const status=document.getElementById('seed-status');
  if(status)status.textContent='Seeding 0/'+total+'...';
  // Seed scenarios first
  const scenarios=Object.entries(BS);
  for(const[num,s]of scenarios){
    try{await fetch(SUPABASE_URL+'/rest/v1/scenarios',{method:'POST',headers:{'apikey':st.adminKey,'Authorization':'Bearer '+st.adminKey,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({scenario_num:Number(num),title:s.t||s.title,description:s.d||s.desc||'',is_builtin:true})});}catch(e){}}
  // Seed questions
  for(const q of BQ){
    try{const body={question_id:q.id,scenario_num:q.s,domain:q.d,question_type:q.ty||'single',select_count:q.se||1,question_text:q.q,options:q.o,correct_answers:q.a,rationale:q.r||'',why_not:q.w||'',ref_url:REFS[q.id]||'',is_builtin:true};
      const r=await fetch(SUPABASE_URL+'/rest/v1/questions',{method:'POST',headers:{'apikey':st.adminKey,'Authorization':'Bearer '+st.adminKey,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(body)});
      if(!r.ok){const t=await r.text();console.warn('Seed '+q.id+':',t);errors++;}
      done++;if(status)status.textContent='Seeding '+done+'/'+total+(errors?' ('+errors+' errors)':'')+'...';}catch(e){errors++;done++;}}
  if(status)status.textContent=done+' questions seeded'+(errors?' ('+errors+' errors)':' successfully')+'!';
  console.log('Seed complete:',done,'done,',errors,'errors');
  setTimeout(()=>{location.reload();},1500);}function allS(){return{...BS,...CS};}
function nextId(sn){const p='C'+sn+'.';const ex=CQ.filter(q=>q.id.startsWith(p)).map(q=>parseInt(q.id.split('.')[1])||0);return p+((ex.length?Math.max(...ex):0)+1);}

function selectPracticeQuestions(){const pool=allQ();const selected=[];const byD={};pool.forEach(q=>{if(!byD[q.domain])byD[q.domain]=[];byD[q.domain].push(q);});Object.entries(WEIGHTS).forEach(([d,count])=>{const avail=byD[d]||[];const sh=[...avail].sort(()=>Math.random()-.5);selected.push(...sh.slice(0,count));});return selected.sort(()=>Math.random()-.5);}
function startPractice(){st.pq=selectPracticeQuestions();st.pi=0;st.psec=EX.blueprint.durationSec;st.pflag={};st.pdone=false;st.sel={};st.sub={};st.rev={};view='practice';startTimer();render();}
let timerInt=null;
function startTimer(){clearInterval(timerInt);timerInt=setInterval(()=>{if(st.psec>0){st.psec--;const el=document.getElementById('timer');if(el){const m=Math.floor(st.psec/60),s=st.psec%60;el.textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');el.className=st.psec<=600?'timer warn':'timer';}}else{clearInterval(timerInt);submitPractice();}},1000);}
function submitPractice(){clearInterval(timerInt);st.pdone=true;st.pq.forEach(q=>{st.sub[q.id]=true;});view='report';render();}
function calcScore(questions){let c=0,at=0;const ds={};Object.keys(DM).forEach(d=>ds[d]={c:0,t:0,a:0});questions.forEach(q=>{if(ds[q.domain])ds[q.domain].t++;if(st.sub[q.id]){at++;if(ds[q.domain])ds[q.domain].a++;const s=(st.sel[q.id]||[]).slice().sort().join(',');if(s===q.answer.slice().sort().join(',')){c++;if(ds[q.domain])ds[q.domain].c++;}}});return{c,at,tot:questions.length,ds};}
function E(tag,a,...ch){const e=document.createElement(tag);if(a)Object.entries(a).forEach(([k,v])=>{if(k==='className')e.className=v;else if(k==='innerHTML')e.innerHTML=v;else if(k.startsWith('on'))e.addEventListener(k.slice(2).toLowerCase(),v);else if(k==='style'&&typeof v==='object')Object.assign(e.style,v);else e.setAttribute(k,v);});ch.flat().forEach(c=>{if(typeof c==='string')e.appendChild(document.createTextNode(c));else if(c)e.appendChild(c);});return e;}

// CSV helpers
function parseCSV(text){const rows=[];let row=[];let cell='';let inQ=false;for(let i=0;i<text.length;i++){const c=text[i];if(inQ){if(c==='"'){if(i+1<text.length&&text[i+1]==='"'){cell+='"';i++;}else inQ=false;}else cell+=c;}else{if(c==='"')inQ=true;else if(c===','){row.push(cell.trim());cell='';}else if(c==='\n'||c==='\r'){if(c==='\r'&&i+1<text.length&&text[i+1]==='\n')i++;row.push(cell.trim());if(row.some(c=>c))rows.push(row);row=[];cell='';}else cell+=c;}}row.push(cell.trim());if(row.some(c=>c))rows.push(row);return rows;}
function generateTemplate(){const h=['scenario_number','scenario_title','scenario_description','domain','type','select_count','question','option_a','option_b','option_c','option_d','option_e','correct_answers','rationale','why_not'];const e1=['1','','','1','single','','What signal drives the agentic loop?','Parsing NL text','Checking stop_reason','Counting iterations','Token threshold','','B','stop_reason is the designed signal.','A is unreliable.'];const q=v=>v.includes(',')||v.includes('"')||v.includes('\n')?'"'+v.replace(/"/g,'""')+'"':v;return[h,e1].map(r=>r.map(q).join(',')).join('\n');}
function downloadTemplate(){const b=new Blob([generateTemplate()],{type:'text/csv'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=EX.exportNames.template;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u);}
function parseUploadRows(rows){if(rows.length<2)return{questions:[],errors:['No data rows.']};const hdr=rows[0].map(h=>h.toLowerCase().replace(/\s+/g,'_'));const col=n=>hdr.indexOf(n);const iSN=col('scenario_number'),iST=col('scenario_title'),iSD=col('scenario_description'),iDM=col('domain'),iTY=col('type'),iSE=col('select_count'),iQ=col('question'),iA=col('option_a'),iB=col('option_b'),iC=col('option_c'),iD=col('option_d'),iE=col('option_e'),iCA=col('correct_answers'),iR=col('rationale'),iWN=col('why_not');if(iQ<0||iCA<0||iSN<0||iDM<0)return{questions:[],errors:['Missing required columns.']};const questions=[];const errors=[];for(let i=1;i<rows.length;i++){const r=rows[i];if(!r[iQ])continue;const rn=i+1;const sn=parseInt(r[iSN]);if(!sn){errors.push('Row '+rn+': bad scenario_number');continue;}const dm=parseInt(r[iDM]);if(!dm||!EX.domains[dm]){errors.push('Row '+rn+': domain must be 1-'+Object.keys(EX.domains).length);continue;}const ty=(r[iTY]||'single').toLowerCase();const se=parseInt(r[iSE])||2;const labs='ABCDE';const optCols=[iA,iB,iC,iD,iE];const opts=[];optCols.forEach((ci,j)=>{if(ci>=0&&r[ci])opts.push({l:labs[j],t:r[ci]});});if(opts.length<2){errors.push('Row '+rn+': need 2+ options');continue;}const ans=(r[iCA]||'').split(',').map(a=>a.trim().toUpperCase()).filter(a=>a);if(!ans.length){errors.push('Row '+rn+': no answers');continue;}questions.push({sn,st:r[iST]||'',sd:r[iSD]||'',dm,ty,se,q:r[iQ],opts,ans,rat:r[iR]||'',wn:r[iWN]||''});}return{questions,errors};}

// Shared question card renderer
function renderQCard(q,opts){
  var showAns=opts.showAnswer===true;var allowSel=opts.allowSelect!==false;var showAdmin=opts.showAdmin;
  var card=E('div',{className:'qc'+(q.custom?' cust':'')});var d=DM[q.domain];var tl=q.type==='multi'?'Select '+(q.select||2):'Select one';
  var qh=E('div',{className:'qh'},E('span',{className:'qn'},q.id),E('span',{className:'badge',style:{background:domainTint(q.domain),color:domainColor(q.domain)}},'D'+q.domain),E('span',{className:'badge b-type'},tl));
  if(q.difficulty)qh.appendChild(E('span',{className:'badge b-type'},q.difficulty.charAt(0).toUpperCase()+q.difficulty.slice(1)));
  if(q.custom&&showAdmin){qh.appendChild(E('span',{className:'badge b-custom'},'Custom'));var rt=E('div',{className:'qhr'});rt.appendChild(E('button',{className:'btn btn-g btn-sm',innerHTML:IC.edit,onClick:()=>{st.modal={t:'eq',q};render();}}));rt.appendChild(E('button',{className:'btn btn-g btn-sm',innerHTML:IC.trash,style:{color:'var(--danger)'},onClick:()=>{if(confirm('Delete?')){CQ=CQ.filter(c=>c.id!==q.id);saveData();render();}}}));qh.appendChild(rt);}
  if(opts.flaggable){var isFl=st.pflag[q.id];qh.appendChild(E('button',{className:'btn btn-g btn-sm',innerHTML:IC.flag,style:isFl?{color:'#C0522A'}:{},onClick:()=>{st.pflag[q.id]=!st.pflag[q.id];render();}}));}
  card.appendChild(qh);

  // Two independent states, deliberately kept apart:
  //   graded (st.sub)  - set ONLY by Submit. Permanent: it is the user's
  //                      result, counts in calcScore, and survives Hide.
  //   revealed (st.rev)- set by Show Answer. A peek, not an attempt. It is
  //                      fully undone by Hide and never reaches calcScore.
  // Keyed strictly by this card's own q.id, so one card can never affect
  // another. Merging these two was what made Hide leave the correct answer
  // highlighted and made peeking silently score a question as wrong.
  var graded=st.sub[q.id]===true;
  var revealed=showAns||(!!q.id&&st.rev[q.id]===true);
  var locked=graded||revealed;

  var body=E('div',{className:'qb'},E('p',null,q.question));
  var ol=E('ul',{className:'opts'});
  q.options.forEach(function(opt){var sel=st.sel[q.id]||[];var isSel=sel.includes(opt.l);var isCor=q.answer.includes(opt.l);
    var cls='';
    if(graded&&isCor)cls=' ok';else if(graded&&isSel&&!isCor)cls=' wrong';
    else if(revealed&&isCor)cls=' ok'+(isSel?' sel':'');
    else if(isSel)cls=' sel';
    if(!allowSel||locked)cls+=' disabled';
    ol.appendChild(E('li',{className:cls,onClick:function(){if(!allowSel||st.sub[q.id]||(!!q.id&&st.rev[q.id]===true))return;if(q.type==='multi'){var s=st.sel[q.id]||[];if(s.includes(opt.l))s=s.filter(function(x){return x!==opt.l;});else if(s.length<(q.select||2))s=s.concat([opt.l]);st.sel[q.id]=s;}else st.sel[q.id]=[opt.l];render();}},E('span',{className:'ol'},opt.l+'.'),' '+opt.t));
  });body.appendChild(ol);card.appendChild(body);

  var ab=E('div',{className:'ans-b',style:{display:revealed?'block':'none'}});
  ab.appendChild(E('div',{className:'al'},'Correct Answer'));
  ab.appendChild(E('div',{className:'av'},q.answer.join(', ')));
  ab.appendChild(E('div',{className:'rat'},q.rationale));
  if(q.objective)ab.appendChild(E('div',{className:'wn'},'Exam objective: '+q.objective));
  if(q.whynot)ab.appendChild(E('div',{className:'wn'},'Why not the others: '+q.whynot));
  if(q.ref){var parts=q.ref.split('|');ab.appendChild(E('div',{style:{marginTop:'.6rem',paddingTop:'.6rem',borderTop:'1px solid rgba(6,95,70,.12)'}},E('a',{href:parts[0],target:'_blank',style:{fontSize:'.78rem',color:'#2E86C1',textDecoration:'none',fontWeight:'600'}},'📖 '+parts[1]+' →')));}
  card.appendChild(ab);

  // Actions - use DOM toggling, NOT re-render
  if(!showAns&&!opts.hideActions){
    var actions=E('div',{className:'qa'});
    var submitBtn=E('button',{className:'btn btn-p',style:{display:'none'},onClick:function(){
      st.sub[q.id]=true;
      // Highlight correct/wrong options
      var lis=ol.querySelectorAll('li');
      lis.forEach(function(li){
        var label=li.querySelector('.ol').textContent.replace('.','').trim();
        var isCorrect=q.answer.includes(label);
        var isSelected=(st.sel[q.id]||[]).includes(label);
        li.classList.remove('sel');li.classList.add('disabled');
        if(isCorrect)li.classList.add('ok');
        else if(isSelected)li.classList.add('wrong');
      });
      submitBtn.style.display='none';
      skipBtn.style.display='none';
      showAnsBtn.style.display='inline-flex';
    }},'Submit');

    // Peeking marks the correct option and locks the list, but never sets
    // st.sub, so it is not an attempt and never reaches calcScore.
    function applyPeek(){
      ol.querySelectorAll('li').forEach(function(li){
        var label=li.querySelector('.ol').textContent.replace('.','').trim();
        if(q.answer.includes(label))li.classList.add('ok');
        li.classList.add('disabled');
      });
    }
    // Undo of applyPeek. Only ever called for an ungraded question, so it
    // cannot wipe real Submit feedback: the user's own 'sel' is left intact.
    function clearPeek(){
      ol.querySelectorAll('li').forEach(function(li){
        li.classList.remove('ok');li.classList.remove('disabled');
      });
    }
    function reveal(){
      ab.style.display='block';
      if(q.id)st.rev[q.id]=true;
      submitBtn.style.display='none';showAnsBtn.style.display='none';skipBtn.style.display='none';
      hideBtn.style.display='inline-flex';
      if(!st.sub[q.id])applyPeek();
    }

    var showAnsBtn=E('button',{className:'btn btn-p',style:{display:'none'},onClick:reveal},'Show Answer');
    var skipBtn=E('button',{className:'btn btn-g',style:{display:'none'},onClick:reveal},'Show Answer');

    var hideBtn=E('button',{className:'btn btn-g',style:{display:'none'},onClick:function(){
      ab.style.display='none';
      if(q.id)delete st.rev[q.id];
      hideBtn.style.display='none';
      if(st.sub[q.id]){
        // Graded: Submit's ok/wrong marking is the user's result, so it stays.
        showAnsBtn.style.display='inline-flex';
      }else{
        // Only peeked: undo the reveal completely, back to the user's own
        // selection, and let them still answer the question properly.
        clearPeek();
        if((st.sel[q.id]||[]).length>0)submitBtn.style.display='inline-flex';
        skipBtn.style.display='inline-flex';
      }
    }},'Hide');

    // Initial button visibility. Selection state is read directly here rather
    // than via a click listener: clicking an option calls render(), which
    // rebuilds the card, so a listener on the old node could never show
    // Submit. That is why Submit was previously unreachable.
    if(revealed){
      hideBtn.style.display='inline-flex';
    }else if(st.sub[q.id]){
      showAnsBtn.style.display='inline-flex';
    }else{
      if((st.sel[q.id]||[]).length>0)submitBtn.style.display='inline-flex';
      skipBtn.style.display='inline-flex';
    }
    actions.appendChild(submitBtn);actions.appendChild(showAnsBtn);actions.appendChild(skipBtn);actions.appendChild(hideBtn);
    card.appendChild(actions);
  }
  return card;}
function renderDomainScores(sc){const sm=E('div',{className:'score-s'},E('h3',null,'Score by Domain'));const rs=E('div',{className:'ds'});Object.entries(DM).forEach(([d,info])=>{const dd=sc.ds[d];const dp=dd.a?Math.round(dd.c/dd.a*100):0;rs.appendChild(E('div',{className:'dsr'},E('span',{className:'dn'},'D'+d+': '+info.n),E('div',{className:'db'},E('div',{className:'dbf',style:'width:'+dp+'%;background:'+domainColor(d)})),E('span',{className:'dp',style:'color:'+domainColor(d)},dd.a?dp+'%':'-')));});sm.appendChild(rs);return sm;}

// Views
function renderHome(){const app=document.getElementById('app');app.innerHTML='';const aq=allQ();
 app.appendChild(E('div',{className:'hdr'},E('div',{className:'hub-nav'},E('a',{className:'hub-link',href:'/'},'← All practice exams')),E('h1',null,EX.code+' Practice Exam'),E('div',{className:'sub'},EX.name)));
 const ct=E('div',{className:'container'});

 // Mode selection comes first so a returning user can start without scrolling;
 // the exam reference material follows for anyone who wants it.
 const modeHdr=E('div',{style:{margin:'1rem 0 .6rem'}});
 modeHdr.appendChild(E('h2',{style:{fontSize:'1rem',fontWeight:'700',marginBottom:'.3rem'}},'Choose How to Practice'));
 modeHdr.appendChild(E('p',{style:{fontSize:'.82rem',color:'var(--text-2)',lineHeight:'1.65'}},EX.copy.modeIntro));
 ct.appendChild(modeHdr);
 const sel=E('div',{className:'mode-sel'});
 const pc=E('div',{className:'mode-card',onClick:startPractice});pc.innerHTML=IC.play;pc.appendChild(E('h2',null,'Practice'));pc.appendChild(E('p',null,EX.copy.practiceCard));pc.appendChild(E('span',{className:'tag'},Math.round(EX.blueprint.durationSec/60)+' min · '+EX.blueprint.questionCount+' Qs · Timed'));sel.appendChild(pc);
 const sc2=E('div',{className:'mode-card',onClick:()=>{view='study';st.sel={};st.sub={};st.rev={};render();}});sc2.innerHTML=IC.book;sc2.appendChild(E('h2',null,'Study'));sc2.appendChild(E('p',null,'Browse all '+aq.length+EX.copy.studyCard));sc2.appendChild(E('span',{className:'tag'},'All Qs · Self-paced'));sel.appendChild(sc2);
 ct.appendChild(sel);

 // Exam overview card
 const info=E('div',{style:{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--rl)',padding:'1.25rem',margin:'1rem 0',boxShadow:'var(--sh)'}});
 info.appendChild(E('h2',{style:{fontSize:'1rem',fontWeight:'700',marginBottom:'.5rem'}},'About the '+EX.code+' Exam'));
 info.appendChild(E('p',{style:{fontSize:'.82rem',color:'var(--text-2)',lineHeight:'1.65',marginBottom:'.6rem'}},EX.copy.aboutExam));
 // Columns live in app.css (.exam-facts) so they can drop to one on phones.
 const details=E('div',{className:'exam-facts'});
 const dt=(label,value)=>{const d=E('div',{className:'exam-fact'});d.appendChild(E('span',{style:{color:'var(--text-2)'}},label));d.appendChild(E('span',{style:{fontWeight:'600'}},value));return d;};
 details.appendChild(dt('Format',EX.blueprint.format));details.appendChild(dt('Questions',String(EX.blueprint.questionCount)));details.appendChild(dt('Duration',Math.round(EX.blueprint.durationSec/60)+' minutes'));details.appendChild(dt('Passing Score',EX.blueprint.passScaled+' / '+EX.blueprint.scaledMax));details.appendChild(dt('Scoring',EX.blueprint.scoring));details.appendChild(dt('Delivery',EX.blueprint.delivery));
 info.appendChild(details);
 info.appendChild(E('p',{style:{fontSize:'.76rem',color:'var(--text-m)',lineHeight:'1.6'}},EX.copy.scoringNote));
 ct.appendChild(info);

 // Collapsible section: a button row that shows and hides `body` by direct DOM
 // toggling, never render(). homeOpen remembers what is open in case
 // something else re-renders the home page.
 const collapsible=(key,head,body,cls)=>{const row=E('button',{className:'dom-btn'+(cls?' '+cls:''),type:'button','aria-expanded':'false'});head.forEach(h=>row.appendChild(h));row.appendChild(E('span',{className:'dom-chev','aria-hidden':'true'},'›'));
  const t={row,isOpen:()=>homeOpen.has(key),set:open=>{if(open)homeOpen.add(key);else homeOpen.delete(key);body.style.display=open?'block':'none';row.setAttribute('aria-expanded',String(open));row.classList.toggle('open',open);}};
  t.set(t.isOpen());return t;};

 // Domain weights card. Descriptions start collapsed to keep the page short.
 const dw=E('div',{style:{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--rl)',padding:'1.25rem',margin:'0 0 1rem',boxShadow:'var(--sh)'}});
 const allBtn=E('button',{className:'dom-all',type:'button'});
 dw.appendChild(E('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:'.5rem',marginBottom:'.4rem'}},E('h2',{style:{fontSize:'1rem',fontWeight:'700'}},'Exam Domains'),allBtn));
 dw.appendChild(E('p',{style:{fontSize:'.82rem',color:'var(--text-2)',lineHeight:'1.65',marginBottom:'.85rem'}},EX.copy.domainsIntro));
 const dwData=Object.keys(EX.domains).map((k,i)=>({d:Number(k),n:EX.domains[k].n,w:EX.domains[k].weightPct+'%',c:domainColor(k,i),desc:EX.domains[k].blurb}));
 const toggles=[];
 const syncAll=()=>{allBtn.textContent=toggles.every(t=>t.isOpen())?'Hide all':'Show all';};
 allBtn.addEventListener('click',()=>{const open=!toggles.every(t=>t.isOpen());toggles.forEach(t=>t.set(open));syncAll();});
 dwData.forEach(d=>{const wrap=E('div',{style:{marginBottom:'.35rem'}});
 const bar=E('div',{style:{width:'80px',height:'6px',background:'var(--bg)',borderRadius:'3px',overflow:'hidden'}});
 bar.appendChild(E('div',{style:{width:d.w,height:'100%',background:d.c,borderRadius:'3px'}}));
 const desc=E('p',{style:{fontSize:'.76rem',color:'var(--text-2)',lineHeight:'1.6',margin:'.1rem 1.6rem .4rem 2rem'}},d.desc);
 const t=collapsible(d.d,[E('span',{style:{fontWeight:'700',color:d.c,width:'1.5rem',fontFamily:'"JetBrains Mono",monospace'}},'D'+d.d),E('span',{style:{flex:'1',color:'var(--text)',fontWeight:'600'}},d.n),bar,E('span',{style:{fontWeight:'600',width:'2.5rem',textAlign:'right',fontFamily:'"JetBrains Mono",monospace',fontSize:'.75rem'}},d.w)],desc);
 toggles.push(t);t.row.addEventListener('click',()=>{t.set(!t.isOpen());syncAll();});
 wrap.appendChild(t.row);wrap.appendChild(desc);
 dw.appendChild(wrap);});
 syncAll();
 ct.appendChild(dw);

 // About this app. The mode cards above already list the features.
 const about=E('div',{style:{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--rl)',padding:'1.25rem',margin:'0 0 1rem',boxShadow:'var(--sh)'}});
 about.appendChild(E('h2',{style:{fontSize:'1rem',fontWeight:'700',marginBottom:'.5rem'}},'What This App Offers'));
 about.appendChild(E('p',{style:{fontSize:'.82rem',color:'var(--text-2)',lineHeight:'1.65',marginBottom:'.5rem'}},aq.length+EX.copy.appOffers));
 about.appendChild(E('p',{style:{fontSize:'.76rem',color:'var(--text-m)',lineHeight:'1.6'}},EX.copy.disclaimer));
 ct.appendChild(about);

 // Tips, collapsed by default.
 const ft=(icon,text)=>{const f=E('div',{style:{display:'flex',gap:'.4rem',marginBottom:'.25rem'}});f.appendChild(E('span',null,icon));f.appendChild(E('span',null,text));return f;};
 const tips=E('div',{style:{background:'#EEF5FB',border:'1px solid #D6EAF8',borderRadius:'var(--rl)',padding:'.6rem 1.25rem',margin:'0 0 1rem'}});
 const tipBody=E('div',{style:{padding:'.2rem 0 .4rem'}});
 tipBody.appendChild(E('p',{style:{fontSize:'.78rem',color:'#1B4F8A',lineHeight:'1.65',marginBottom:'.5rem',opacity:'.9'}},EX.copy.tipsIntro));
 const tipList=E('div',{style:{fontSize:'.78rem',color:'#1B4F8A',lineHeight:'1.7'}});
 EX.copy.tips.forEach(t=>tipList.appendChild(ft(t[0],t[1])));
 tipBody.appendChild(tipList);
 const tt=collapsible('tips',[E('span',{style:{flex:'1',fontSize:'.88rem',fontWeight:'700',color:'#1A2E45'}},'Preparation Tips')],tipBody,'tips-btn');
 tt.row.addEventListener('click',()=>tt.set(!tt.isOpen()));
 tips.appendChild(tt.row);tips.appendChild(tipBody);ct.appendChild(tips);
 if(EX.crossLink){const xl=E('a',{href:EX.crossLink.href,style:{display:'block',textDecoration:'none',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--rl)',padding:'1rem 1.25rem',margin:'0 0 1rem',boxShadow:'var(--sh)'}});
  xl.appendChild(E('div',{style:{fontSize:'.72rem',color:'var(--text-m)',marginBottom:'.2rem'}},EX.crossLink.label));
  xl.appendChild(E('div',{style:{fontSize:'.95rem',fontWeight:'700',color:'var(--ac)',marginBottom:'.25rem'}},EX.crossLink.title+' \u2192'));
  xl.appendChild(E('div',{style:{fontSize:'.78rem',color:'var(--text-2)',lineHeight:'1.6'}},EX.crossLink.blurb));
  ct.appendChild(xl);}

 ct.appendChild(E('div',{className:'foot'},E('a',{href:'/',style:{color:'var(--ac)',textDecoration:'none'}},'All practice exams'),' · ',EX.copy.footer+' · ',E('a',{href:'https://docs.anthropic.com',target:'_blank',style:{color:'var(--ac)',textDecoration:'none'}},'Anthropic Documentation')));
 app.appendChild(ct);if(st.modal)renderModals();}

function renderPractice(){const app=document.getElementById('app');app.innerHTML='';const q=st.pq[st.pi];if(!q)return;const answered=st.pq.filter(q=>(st.sel[q.id]||[]).length>0).length;
 app.appendChild(E('div',{className:'hdr',style:{padding:'1rem 1.5rem'}},E('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center'}},E('button',{className:'btn-h',onClick:()=>{if(confirm('Exit practice exam?')){clearInterval(timerInt);view='home';render();}}},E('span',{innerHTML:IC.home}),'Exit'),E('h1',{style:{fontSize:'1.1rem'}},'Practice Exam'),E('button',{className:'btn-h',onClick:()=>{if(confirm('Submit your exam now?'))submitPractice();}},E('span',{innerHTML:IC.flag}),'Submit'))));
 const m=Math.floor(st.psec/60),s=st.psec%60;app.appendChild(E('div',{className:'timer-bar'},E('span',{className:'qi'},'Q '+(st.pi+1)+'/'+st.pq.length),E('span',{id:'timer',className:st.psec<=600?'timer warn':'timer'},String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')),E('span',{className:'qi'},answered+' answered')));
 const ct=E('div',{className:'container'});ct.appendChild(renderQCard(q,{flaggable:true,hideActions:true}));
 ct.appendChild(E('div',{style:{display:'flex',justifyContent:'space-between',padding:'.5rem 0',gap:'.5rem'}},E('button',{className:'btn btn-g',style:st.pi===0?{opacity:'.4',pointerEvents:'none'}:{},onClick:()=>{if(st.pi>0){st.pi--;render();}}},'< Previous'),E('button',{className:'btn btn-p',style:st.pi===st.pq.length-1?{opacity:'.4',pointerEvents:'none'}:{},onClick:()=>{if(st.pi<st.pq.length-1){st.pi++;render();}}},'Next >')));
 const grid=E('div',{style:{display:'flex',flexWrap:'wrap',gap:'3px',justifyContent:'center',padding:'.75rem 0'}});st.pq.forEach((pq,i)=>{const hasSel=(st.sel[pq.id]||[]).length>0;const isCur=i===st.pi;const isFl=st.pflag[pq.id];let cls='qnum-dot';if(isCur)cls+=' cur';else if(hasSel)cls+=' ans';if(isFl)cls+=' flagged';grid.appendChild(E('button',{className:cls,onClick:()=>{st.pi=i;render();}},String(i+1)));});
 ct.appendChild(grid);app.appendChild(ct);}

function renderReport(){const app=document.getElementById('app');app.innerHTML='';const sc=calcScore(st.pq);const pct=sc.at?Math.round(sc.c/sc.at*100):0;
 const T=EX.blueprint.tiers,DT=EX.blueprint.domainThreshold;const tier=pct>=T.pass?'pass':pct>=T.border?'border':'fail';const tierLabel=tier==='pass'?'STRONG PASS':tier==='border'?'BORDERLINE - STRENGTHEN WEAK DOMAINS':'NEEDS MORE STUDY';
 app.appendChild(E('div',{className:'hdr'},E('h1',null,'Exam Results'),E('div',{className:'sub'},'Practice Exam Complete')));
 const ct=E('div',{className:'container'});const rpt=E('div',{className:'report'});rpt.appendChild(E('div',{className:'big-score '+tier},pct+'%'));rpt.appendChild(E('div',null,E('span',{className:'verdict '+tier},tierLabel)));
 rpt.appendChild(E('p',{style:{fontSize:'.85rem',color:'var(--text-2)',margin:'.5rem 0'}},sc.c+' of '+sc.at+' correct'));
 rpt.appendChild(E('p',{style:{fontSize:'.78rem',color:'var(--text-m)',margin:'0 0 .75rem',lineHeight:'1.5'}},'The real exam uses scaled scoring where questions carry different weights. Target '+T.pass+'%+ overall and '+DT+'%+ in every domain for a confident pass.'));
 const weakD=[];Object.entries(sc.ds).forEach(([d,dd])=>{if(dd.a>0&&(dd.c/dd.a)<DT/100)weakD.push('D'+d+': '+DM[d].n+' ('+Math.round(dd.c/dd.a*100)+'%)');});
 if(weakD.length){const wd=E('div',{style:{textAlign:'left',padding:'.6rem .8rem',margin:'.5rem 0',borderRadius:'8px',background:'#FDF0EB',border:'1px solid #e8a88a',fontSize:'.78rem',color:'#C0522A',lineHeight:'1.5'}});wd.appendChild(E('strong',null,'Focus areas (below '+DT+'%): '));wd.appendChild(document.createTextNode(weakD.join(', ')));rpt.appendChild(wd);}
 rpt.appendChild(renderDomainScores(sc));ct.appendChild(rpt);
 ct.appendChild(E('div',{style:{display:'flex',justifyContent:'center',gap:'.75rem',margin:'1.5rem 0',flexWrap:'wrap'}},E('button',{className:'btn btn-p',onClick:()=>{view='review';render();}},E('span',{innerHTML:IC.book}),'Review Answers'),E('button',{className:'btn btn-p',onClick:startPractice},E('span',{innerHTML:IC.play}),'Try Again'),E('button',{className:'btn btn-g',onClick:()=>{view='home';render();}},E('span',{innerHTML:IC.home}),'Home')));app.appendChild(ct);}

function renderReview(){const app=document.getElementById('app');app.innerHTML='';app.appendChild(E('div',{className:'hdr',style:{padding:'1rem 1.5rem'}},E('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center'}},E('button',{className:'btn-h',onClick:()=>{view='report';render();}},E('span',{innerHTML:IC.home}),'Back'),E('h1',{style:{fontSize:'1.1rem'}},'Review Answers'),E('span',null,''))));const ct=E('div',{className:'container'});st.pq.forEach(q=>ct.appendChild(renderQCard(q,{showAnswer:true,allowSelect:false})));app.appendChild(ct);}

function renderStudy(){const app=document.getElementById('app');app.innerHTML='';const aq=allQ();const as=allS();const sc=calcScore(aq);
 app.appendChild(E('div',{className:'hdr'},E('h1',null,'Study Mode'),E('div',{className:'sub'},aq.length+' Questions - '+Object.keys(EX.domains).length+' Domains'),E('div',{className:'hdr-actions'},E('button',{className:'btn-h',onClick:()=>{view='home';render();}},E('span',{innerHTML:IC.home}),'Home'),E('button',{className:'btn-h',onClick:()=>{st.rev={};st.sel={};st.sub={};render();}},E('span',{innerHTML:IC.reset}),'Reset'))));
 const nav=E('div',{className:'nav'});nav.appendChild(E('button',{className:'nav-t'+(st.as===0?' on':''),onClick:()=>{st.as=0;render();}},'All',E('span',{className:'tc'},String(aq.length))));
 Object.entries(DM).forEach(([id,d])=>{const cnt=aq.filter(q=>q.domain===Number(id)).length;nav.appendChild(E('button',{className:'nav-t'+(st.as===Number(id)?' on':''),onClick:()=>{st.as=Number(id);render();}},'D'+id+': '+(EX.domains[id].short||d.n.split(' ')[0]),E('span',{className:'tc'},String(cnt))));});app.appendChild(nav);
 const fl=st.as===0?aq:aq.filter(q=>q.domain===st.as);const pct=Math.round(sc.at/Math.max(sc.tot,1)*100);
 app.appendChild(E('div',{className:'prog'},E('div',{className:'prog-bar'},E('div',{className:'prog-fill',style:'width:'+pct+'%'})),E('span',{className:'prog-lbl'},sc.at+'/'+sc.tot)));
 const ct=E('div',{className:'container'});if(sc.at>0)ct.appendChild(renderDomainScores(sc));
 if(st.as===0){let ld=0;fl.forEach(q=>{if(q.domain!==ld){ld=q.domain;const d=DM[q.domain];ct.appendChild(E('div',{className:'sc-hdr'},E('div',null,E('h2',null,'Domain '+q.domain+': '+d.n),E('p',null,(EX.domains[q.domain]||{}).keywords||''))));}ct.appendChild(renderQCard(q,{showAdmin:true}));});}else{fl.forEach(q=>ct.appendChild(renderQCard(q,{showAdmin:true})));}
 if(!fl.length)ct.appendChild(E('div',{className:'empty'},'No questions found.'));
 ct.appendChild(E('div',{className:'foot'},EX.copy.footer));app.appendChild(ct);}

// Admin modals
function renderModals(){if(st.modal==='admin')adminModal();else if(st.modal==='q')qModal(null);else if(st.modal==='s')sModal();else if(st.modal==='u')uModal();else if(st.modal&&st.modal.t==='eq')qModal(st.modal.q);}

function adminModal(){const ov=E('div',{className:'modal-ov',onClick:e=>{if(e.target===e.currentTarget){st.modal=null;window.location.hash='';render();}}});const m=E('div',{className:'modal'});m.appendChild(E('div',{className:'modal-hd'},E('h2',null,'Admin Panel'),E('button',{className:'modal-x',innerHTML:IC.x,onClick:()=>{st.modal=null;window.location.hash='';render();}})));const bd=E('div',{className:'modal-bd'});
 if(hasSupa())bd.appendChild(E('div',{className:'u-st ok'},'Supabase connected'));else bd.appendChild(E('div',{className:'u-st info'},'Supabase not configured - using localStorage. See README.'));
 bd.appendChild(E('div',{className:'fg',style:{marginTop:'1rem'}},E('label',null,'Supabase Service Role Key'),E('input',{type:'password',placeholder:'Enter key for write ops...',value:st.adminKey,onInput:e=>{st.adminKey=e.target.value;localStorage.setItem('ccar-f-admin-key',e.target.value);localStorage.setItem('ccar-admin-key',e.target.value);}}),E('div',{className:'hint'},'Stored in your browser only.')));
 const acts=E('div',{style:{display:'grid',gap:'.5rem',marginTop:'1rem'}});
 // Database sync
  const dbSection=E('div',{style:{marginTop:'1rem',padding:'.85rem',background:'var(--bg)',borderRadius:'8px',border:'1px solid var(--border)'}});
  dbSection.appendChild(E('div',{style:{fontWeight:'700',marginBottom:'.4rem',fontSize:'.88rem'}},'Database Sync'));
  dbSection.appendChild(E('div',{style:{fontSize:'.78rem',color:'var(--text-2)',marginBottom:'.5rem',lineHeight:'1.5'}},'Push all '+BQ.length+' '+EX.code+' built-in questions to Supabase so they load dynamically. After seeding, edit questions directly in the Supabase Dashboard.'));
  dbSection.appendChild(E('div',{style:{fontSize:'.78rem',color:dbLoaded?'#065f46':'var(--text-m)',marginBottom:'.5rem',fontWeight:'600'}},dbLoaded?'Loaded from Supabase ('+allQ().length+' questions)':'Using built-in questions from index.html'));
  const seedRow=E('div',{style:{display:'flex',alignItems:'center',gap:'.5rem',flexWrap:'wrap'}});
  seedRow.appendChild(E('button',{className:'btn btn-p',style:{padding:'.5rem 1.2rem',fontSize:'.82rem'},onClick:()=>{seedDB();}},dbLoaded?'Re-seed Database':'Seed All Questions to Database'));
  seedRow.appendChild(E('span',{id:'seed-status',style:{fontSize:'.78rem',color:'var(--text-2)'}},''));
  dbSection.appendChild(seedRow);bd.appendChild(dbSection);
  acts.appendChild(E('button',{className:'btn btn-p',onClick:()=>{st.modal='q';render();}},E('span',{innerHTML:IC.plus}),'Add Question'));
 acts.appendChild(E('button',{className:'btn btn-p',onClick:()=>{st.modal='s';render();}},E('span',{innerHTML:IC.plus}),'Add Scenario'));
 acts.appendChild(E('button',{className:'btn btn-p',onClick:()=>{st.modal='u';render();}},E('span',{innerHTML:IC.upload}),'Upload CSV'));
 acts.appendChild(E('button',{className:'btn btn-g',onClick:()=>{const d={customQuestions:CQ,customScenarios:CS};const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=EX.exportNames.backup;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u);}},E('span',{innerHTML:IC.download}),'Export JSON'));
 acts.appendChild(E('button',{className:'btn btn-g',onClick:()=>{const inp=document.createElement('input');inp.type='file';inp.accept='.json';inp.onchange=()=>{const reader=new FileReader();reader.onload=ev=>{try{const d=JSON.parse(ev.target.result);if(d.customQuestions)CQ.push(...d.customQuestions);if(d.customScenarios)Object.assign(CS,d.customScenarios);saveData();alert('Imported!');st.modal=null;render();}catch(e){alert('Invalid JSON.');}};reader.readAsText(inp.files[0]);};inp.click();}},E('span',{innerHTML:IC.upload}),'Import JSON'));
 bd.appendChild(acts);// Visit stats
 const vstats=E('div',{id:'vstats',style:{marginTop:'1rem',padding:'.75rem',background:'var(--bg)',borderRadius:'8px',fontSize:'.82rem'}});
 vstats.appendChild(E('div',{style:{fontWeight:'700',marginBottom:'.4rem',color:'var(--text)'}},'📊 Visitor Metrics'));
 vstats.appendChild(E('div',{style:{color:'var(--text-m)'}},'Loading...'));
 bd.appendChild(vstats);
 getVisitCount().then(v=>{const el=document.getElementById('vstats');if(!el)return;el.innerHTML='';
 el.appendChild(E('div',{style:{fontWeight:'700',marginBottom:'.5rem',color:'var(--text)'}},'📊 Visitor Metrics'));
 const grid=E('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'.5rem'}});
 const metric=(label,value)=>{const d=E('div',{style:{textAlign:'center',padding:'.5rem',background:'var(--surface)',borderRadius:'6px',border:'1px solid var(--border)'}});d.appendChild(E('div',{style:{fontSize:'1.2rem',fontWeight:'800',color:'var(--ac)'}},String(value)));d.appendChild(E('div',{style:{fontSize:'.7rem',color:'var(--text-m)',marginTop:'.15rem'}},label));return d;};
 grid.appendChild(metric('Total Visits',v.total||0));grid.appendChild(metric('Today',v.today||0));grid.appendChild(metric('Unique Visitors',v.unique||0));
 el.appendChild(grid);
 });
 bd.appendChild(E('div',{style:{marginTop:'.75rem',fontSize:'.8rem',color:'var(--text-2)'}},'Built-in: '+BUILTIN.length+' | Custom: '+CQ.length+' | Total: '+allQ().length));
 m.appendChild(bd);m.appendChild(E('div',{className:'modal-ft'},E('button',{className:'btn btn-g',onClick:()=>{st.modal=null;window.location.hash='';render();}},'Close')));ov.appendChild(m);document.getElementById('app').appendChild(ov);}

function qModal(eq){const scenarios=allS();const isEd=!!eq;const f=eq?{sc:String(eq.scenario),dm:String(eq.domain),ty:eq.type,se:eq.select||2,q:eq.question,opts:eq.options.map(o=>({...o,cor:eq.answer.includes(o.l)})),rat:eq.rationale,wn:eq.whynot||'',nst:'',nsd:'',shn:false}:{sc:'',dm:'1',ty:'single',se:2,q:'',opts:[{l:'A',t:'',cor:false},{l:'B',t:'',cor:false},{l:'C',t:'',cor:false},{l:'D',t:'',cor:false}],rat:'',wn:'',nst:'',nsd:'',shn:false};
 function rf(){const b=document.getElementById('mb');if(!b)return;b.innerHTML='';const fg1=E('div',{className:'fg'});fg1.appendChild(E('label',null,'Scenario'));const sel=E('select',{onChange:e=>{f.sc=e.target.value;f.shn=e.target.value==='__new__';rf();}});sel.appendChild(E('option',{value:''},'- Select -'));Object.entries(scenarios).forEach(([id,s])=>{const o=E('option',{value:id},'S'+id+': '+(s.t||s.title));if(f.sc===id)o.selected=true;sel.appendChild(o);});const no=E('option',{value:'__new__'},'+ New...');if(f.sc==='__new__')no.selected=true;sel.appendChild(no);fg1.appendChild(sel);if(f.shn||f.sc==='__new__'){const ns=E('div',{style:{marginTop:'.5rem'}});const ti=E('input',{type:'text',placeholder:'Title',onInput:e=>f.nst=e.target.value});ti.value=f.nst;ns.appendChild(ti);const ta=E('textarea',{placeholder:'Description',style:{marginTop:'.35rem',minHeight:'50px'},onInput:e=>f.nsd=e.target.value});ta.value=f.nsd;ns.appendChild(ta);fg1.appendChild(ns);}b.appendChild(fg1);
 const row=E('div',{className:'fr'});const fg2=E('div',{className:'fg'});fg2.appendChild(E('label',null,'Domain'));const ds=E('select',{onChange:e=>f.dm=e.target.value});Object.entries(DM).forEach(([id,d])=>{const o=E('option',{value:id},'D'+id);if(f.dm===id)o.selected=true;ds.appendChild(o);});fg2.appendChild(ds);row.appendChild(fg2);const fg3=E('div',{className:'fg'});fg3.appendChild(E('label',null,'Type'));const ts=E('select',{onChange:e=>{f.ty=e.target.value;rf();}});const o1=E('option',{value:'single'},'Single');const o2=E('option',{value:'multi'},'Multi');if(f.ty==='single')o1.selected=true;else o2.selected=true;ts.appendChild(o1);ts.appendChild(o2);fg3.appendChild(ts);if(f.ty==='multi')fg3.appendChild(E('input',{type:'number',value:String(f.se),min:'2',max:'5',style:{marginTop:'.3rem',width:'80px'},onInput:e=>f.se=parseInt(e.target.value)||2}));row.appendChild(fg3);b.appendChild(row);
 b.appendChild(E('div',{className:'fg'},E('label',null,'Question'),Object.assign(E('textarea',{placeholder:'Question text...',rows:'3',onInput:e=>f.q=e.target.value}),{value:f.q})));
 const fg5=E('div',{className:'fg'});fg5.appendChild(E('label',null,'Options (check correct)'));const labs='ABCDEFGH';f.opts.forEach((opt,i)=>{const r=E('div',{className:'oir'});r.appendChild(E('span',{className:'orl'},opt.l));const inp=E('input',{type:'text',placeholder:'Option '+opt.l,onInput:e=>f.opts[i].t=e.target.value});inp.value=opt.t;r.appendChild(inp);const cl=E('label',{className:'oc'});const ck=E('input',{type:'checkbox'});ck.checked=opt.cor;ck.addEventListener('change',()=>{if(f.ty==='single')f.opts.forEach((o,j)=>o.cor=j===i);else f.opts[i].cor=!f.opts[i].cor;rf();});cl.appendChild(ck);cl.appendChild(document.createTextNode(' \u2713'));r.appendChild(cl);if(f.opts.length>2)r.appendChild(E('button',{className:'rb',innerHTML:IC.x,onClick:()=>{f.opts.splice(i,1);f.opts.forEach((o,j)=>o.l=labs[j]);rf();}}));fg5.appendChild(r);});
 if(f.opts.length<8)fg5.appendChild(E('button',{className:'add-opt',onClick:()=>{f.opts.push({l:labs[f.opts.length],t:'',cor:false});rf();}},'+ Add'));b.appendChild(fg5);
 b.appendChild(E('div',{className:'fg'},E('label',null,'Rationale'),Object.assign(E('textarea',{placeholder:'Why correct?',rows:'3',onInput:e=>f.rat=e.target.value}),{value:f.rat})));
 b.appendChild(E('div',{className:'fg'},E('label',null,'Why not others (optional)'),Object.assign(E('textarea',{placeholder:'Why others wrong',rows:'2',onInput:e=>f.wn=e.target.value}),{value:f.wn})));}
 function save(){if(!f.sc&&!f.nst){alert('Select a scenario.');return;}if(f.sc==='__new__'&&!f.nst.trim()){alert('Enter title.');return;}if(!f.q.trim()){alert('Enter question.');return;}if(f.opts.filter(o=>o.t.trim()).length<2){alert('Need 2+ options.');return;}if(!f.opts.filter(o=>o.cor&&o.t.trim()).length){alert('Mark correct answer(s).');return;}if(!f.rat.trim()){alert('Enter rationale.');return;}let sn;if(f.sc==='__new__'){const nums=Object.keys(allS()).map(Number);sn=Math.max(...nums,0)+1;CS[sn]={t:f.nst.trim(),d:f.nsd.trim()||f.nst.trim()};}else sn=parseInt(f.sc);const opts=f.opts.filter(o=>o.t.trim()).map(o=>({l:o.l,t:o.t.trim()}));const ans=f.opts.filter(o=>o.cor&&o.t.trim()).map(o=>o.l);const qo={id:isEd?eq.id:nextId(sn),scenario:sn,domain:parseInt(f.dm),type:f.ty,...(f.ty==='multi'?{select:f.se}:{}),question:f.q.trim(),options:opts,answer:ans,rationale:f.rat.trim(),whynot:f.wn.trim(),custom:true};if(isEd){const idx=CQ.findIndex(q=>q.id===eq.id);if(idx>=0)CQ[idx]=qo;}else CQ.push(qo);saveData();st.modal=null;render();}
 const ov=E('div',{className:'modal-ov',onClick:e=>{if(e.target===e.currentTarget){st.modal=null;render();}}});const m=E('div',{className:'modal'});m.appendChild(E('div',{className:'modal-hd'},E('h2',null,isEd?'Edit Question':'Add Question'),E('button',{className:'modal-x',innerHTML:IC.x,onClick:()=>{st.modal=null;render();}})));m.appendChild(E('div',{className:'modal-bd',id:'mb'}));m.appendChild(E('div',{className:'modal-ft'},E('button',{className:'btn btn-g',onClick:()=>{st.modal=null;render();}},'Cancel'),E('button',{className:'btn btn-p',onClick:save},isEd?'Save':'Add')));ov.appendChild(m);document.getElementById('app').appendChild(ov);rf();}

function sModal(){let ti='',de='';const ov=E('div',{className:'modal-ov',onClick:e=>{if(e.target===e.currentTarget){st.modal=null;render();}}});const m=E('div',{className:'modal'});m.appendChild(E('div',{className:'modal-hd'},E('h2',null,'Add Scenario'),E('button',{className:'modal-x',innerHTML:IC.x,onClick:()=>{st.modal=null;render();}})));m.appendChild(E('div',{className:'modal-bd'},E('div',{className:'fg'},E('label',null,'Title'),E('input',{type:'text',placeholder:'Scenario title',onInput:e=>ti=e.target.value})),E('div',{className:'fg'},E('label',null,'Description'),E('textarea',{placeholder:'Context...',rows:'3',onInput:e=>de=e.target.value}))));m.appendChild(E('div',{className:'modal-ft'},E('button',{className:'btn btn-g',onClick:()=>{st.modal=null;render();}},'Cancel'),E('button',{className:'btn btn-p',onClick:()=>{if(!ti.trim()){alert('Enter title.');return;}const nums=Object.keys(allS()).map(Number);const n=Math.max(...nums,0)+1;CS[n]={t:ti.trim(),d:de.trim()||ti.trim()};saveData();st.modal=null;render();}},'Create')));ov.appendChild(m);document.getElementById('app').appendChild(ov);}

function uModal(){let parsed=null;let fileStatus=null;let importDone=false;
 function rf(){const b=document.getElementById('mb');if(!b)return;b.innerHTML='';b.appendChild(E('div',{className:'ta'},E('button',{className:'btn btn-p',onClick:downloadTemplate},E('span',{innerHTML:IC.download}),'Download Template'),E('span',{style:{fontSize:'.75rem',color:'var(--text-m)'}},'Fill and upload below')));
 const fi=E('input',{type:'file',accept:'.csv'});const dz=E('div',{className:'dz',onClick:()=>fi.click()});dz.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';dz.appendChild(E('p',null,'Click or drag and drop CSV'));dz.appendChild(fi);dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('dov');});dz.addEventListener('dragleave',()=>dz.classList.remove('dov'));dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('dov');if(e.dataTransfer.files.length)hf(e.dataTransfer.files[0]);});fi.addEventListener('change',()=>{if(fi.files.length)hf(fi.files[0]);});b.appendChild(dz);
 function hf(file){const reader=new FileReader();reader.onload=ev=>{const rows=parseCSV(ev.target.result);parsed=parseUploadRows(rows);fileStatus=parsed.questions.length?{t:'ok',m:parsed.questions.length+' questions parsed'}:{t:'err',m:'No valid questions. '+parsed.errors.slice(0,3).join('; ')};rf();};reader.readAsText(file);}
 if(fileStatus)b.appendChild(E('div',{className:'u-st '+fileStatus.t},fileStatus.m));if(importDone)b.appendChild(E('div',{className:'u-st ok'},'Imported!'));
 if(parsed&&parsed.questions.length){const pw=E('div',{className:'pw'});const tbl=E('table',{className:'ptbl'});tbl.appendChild(E('thead',null,E('tr',null,E('th',null,'S#'),E('th',null,'D'),E('th',null,'Question'),E('th',null,'Ans'))));const tb=E('tbody');parsed.questions.forEach(q=>tb.appendChild(E('tr',null,E('td',null,String(q.sn)),E('td',null,'D'+q.dm),E('td',{title:q.q},q.q.substring(0,50)+(q.q.length>50?'...':'')),E('td',null,q.ans.join(',')))));tbl.appendChild(tb);pw.appendChild(tbl);b.appendChild(pw);}}
 function doImport(){if(!parsed||!parsed.questions.length){alert('Upload a CSV first.');return;}const scenarios=allS();parsed.questions.forEach(pq=>{if(!scenarios[pq.sn]&&!CS[pq.sn]){CS[pq.sn]={t:pq.st||'Scenario '+pq.sn,d:pq.sd||''};scenarios[pq.sn]=CS[pq.sn];}CQ.push({id:nextId(pq.sn),scenario:pq.sn,domain:pq.dm,type:pq.ty,...(pq.ty==='multi'?{select:pq.se}:{}),question:pq.q,options:pq.opts,answer:pq.ans,rationale:pq.rat,whynot:pq.wn,custom:true});});saveData();importDone=true;parsed=null;fileStatus=null;rf();setTimeout(()=>{st.modal=null;render();},1200);}
 const ov=E('div',{className:'modal-ov',onClick:e=>{if(e.target===e.currentTarget){st.modal=null;render();}}});const m=E('div',{className:'modal'});m.appendChild(E('div',{className:'modal-hd'},E('h2',null,'Upload CSV'),E('button',{className:'modal-x',innerHTML:IC.x,onClick:()=>{st.modal=null;render();}})));m.appendChild(E('div',{className:'modal-bd',id:'mb'}));m.appendChild(E('div',{className:'modal-ft'},E('button',{className:'btn btn-g',onClick:()=>{st.modal=null;render();}},'Cancel'),E('button',{className:'btn btn-p',onClick:doImport},E('span',{innerHTML:IC.upload}),'Import')));ov.appendChild(m);document.getElementById('app').appendChild(ov);rf();}

function render(){if(view==='home')renderHome();else if(view==='practice')renderPractice();else if(view==='study')renderStudy();else if(view==='report')renderReport();else if(view==='review')renderReview();}
(async()=>{await loadData();applyDomainTheme();trackVisit();if(window.location.hash==='#admin'){st.modal='admin';}render();window.addEventListener('hashchange',()=>{if(window.location.hash==='#admin'){st.modal='admin';render();}});})();
