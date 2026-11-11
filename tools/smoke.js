#!/usr/bin/env node
// Render smoke test. Stubs a minimal DOM, executes the page's scripts (inline and
// /src ones, resolved against the site root), and runs every view. Run it
// against every exam page before every deploy: node --check cannot catch a
// runtime error (a TDZ bug once blanked the live home page).
//
//   node tools/smoke.js <exam>/index.html [siteRoot] [--dump out.json]
//   siteRoot defaults to the repo root.
const fs=require('fs'),vm=require('vm'),path=require('path');
const page=process.argv[2],root=process.argv[3]&&!process.argv[3].startsWith('--')?process.argv[3]:path.resolve(__dirname,'..');
if(!page){console.error('usage: node tools/smoke.js <exam>/index.html [siteRoot]');process.exit(2);}
const dumpI=process.argv.indexOf('--dump');
const html=fs.readFileSync(page,'utf8');
const scripts=[...html.matchAll(/<script(?![^>]*application\/ld\+json)([^>]*)>([\s\S]*?)<\/script>/g)].map(m=>{
  const s=m[1].match(/src="([^"]+)"/);if(s){const p=s[1].split('?')[0].replace(/^\//,'');return{name:p,code:fs.readFileSync(path.join(root,p),'utf8')};}
  return{name:'inline',code:m[2]};}).filter(s=>s.code.trim());
function el(tag){const n={tagName:String(tag).toUpperCase(),children:[],style:{setProperty(){}},attrs:{},className:'',_t:'',
 classList:{add(){},remove(){},toggle(){},contains(){return false}},
 appendChild(c){this.children.push(c);c.parentNode=this;return c},insertBefore(c){this.children.unshift(c);return c},removeChild(c){this.children=this.children.filter(x=>x!==c);return c},remove(){},replaceWith(){},
 setAttribute(k,v){this.attrs[k]=String(v)},getAttribute(k){return this.attrs[k]},removeAttribute(k){delete this.attrs[k]},hasAttribute(k){return k in this.attrs},
 addEventListener(){},removeEventListener(){},querySelector(){return el('div')},querySelectorAll(){return []},
 focus(){},click(){},scrollIntoView(){},getBoundingClientRect(){return{top:0,left:0,width:0,height:0}},
 set innerHTML(v){this._h=v;this.children=[]},get innerHTML(){return this._h||''},
 set textContent(v){this._t=v},get textContent(){return this._t+this.children.map(c=>c.textContent||'').join('')}};return n}
const byId={};
const document={createElement:el,createTextNode:t=>({textContent:t}),getElementById:id=>byId[id]||(byId[id]=el('div')),
 querySelector:()=>el('div'),querySelectorAll:()=>[],addEventListener(){},body:el('body'),head:el('head'),documentElement:el('html')};
const store={},fetched=[];
const ctx={document,console:{log(){},warn(){},error:console.error},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},
 localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]},
 location:{hash:'',pathname:'/',href:'https://x/'},history:{replaceState(_s,_t,h){ctx.location.hash=h;},pushState(_s,_t,h){ctx.location.hash=h;}},
 navigator:{userAgent:'smoke'},fetch:u=>{fetched.push(String(u));return Promise.reject(new Error('offline'))},confirm:()=>true,alert(){},prompt:()=>null,
 scrollTo(){},scrollBy(){},addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){}}),URL,Blob:function(){},getComputedStyle:()=>({getPropertyValue:()=>''})};
ctx.window=ctx;vm.createContext(ctx);
let fail=0;const ok=(n,f)=>{try{f();console.log('PASS',n)}catch(e){fail++;console.log('FAIL',n,'-',e&&e.message||e)}};
const run=c=>vm.runInContext(c,ctx);
ok('load scripts ('+scripts.map(s=>s.name).join(', ')+')',()=>scripts.forEach(s=>vm.runInContext(s.code,ctx,{filename:s.name})));
const text=n=>!n?'':(n.textContent||'');
const find=(n,pred)=>{if(!n)return null;if(pred(n))return n;for(const c of n.children||[]){const r=find(c,pred);if(r)return r;}return null;};
ok('renderHome',()=>run('renderHome()'));
// Exam overview: stats derived from the data, a sample question from published
// Test 1 only, domain cards, what's included, and an FAQ that the shell mirrors.
ok('home overview: stats, try a question, domains, FAQ',()=>{run('renderHome()');const app=run("document.getElementById('app')"),t=text(app);
 ['Try a question','Exam Domains',"What's included, free"].forEach(s=>{if(!t.includes(s))throw new Error('missing '+s)});
 const st_=find(app,n=>n.className==='ov-stats');if(!st_)throw new Error('no stats strip');const sv=text(st_);
 [run('BQ.length'),run('FIXED.length'),run('EX.blueprint.questionCount'),run('EX.blueprint.passScaled')].forEach(v=>{if(!sv.includes(String(v)))throw new Error('stats lack '+v)});
 if(run('LESSONS.length')&&!sv.includes(String(run('LESSONS.length'))))throw new Error('stats lack lesson count');
 const t1=new Set(run('FIXED[0].ids'));if(!t1.has(run('tryId')))throw new Error('sample '+run('tryId')+' not in Test 1');
 if(run('tryPool().some(q=>!FIXED[0].ids.includes(q.id))'))throw new Error('sample pool outside Test 1');
 for(let i=0;i<20;i++){const id=run('tryId=pickTry(tryId)');if(!t1.has(id))throw new Error('picked '+id);}
 run("tryS.sel[tryId]=[allQ().find(q=>q.id===tryId).answer[0]];renderHome()");if(run('st.sel[tryId]'))throw new Error('sample answer leaked into st');run('tryS.sel={}');
 const faq=run('EX.copy.faq||[]');let nd=0;const cnt=n=>{if(n.tagName==='DETAILS')nd++;(n.children||[]).forEach(cnt);};cnt(app);
 if(nd!==faq.length)throw new Error('FAQ items '+nd+' != '+faq.length);
 if(faq.length){const m=html.match(/<script type="application\/ld\+json">\s*(\{[^<]*"FAQPage"[^<]*\})\s*<\/script>/);if(!m)throw new Error('shell has no FAQPage JSON-LD');
  const ld=JSON.parse(m[1]).mainEntity.map(x=>[x.name,x.acceptedAnswer.text]);
  if(JSON.stringify(ld)!==JSON.stringify(faq.map(f=>[f.q,f.a])))throw new Error('shell FAQPage JSON-LD differs from EX.copy.faq');
  faq.forEach(f=>{if(!html.includes(f.q))throw new Error('crawler block lacks FAQ question: '+f.q)});}
 run('renderHome()');});
// Navigation lives in the static site header and exam tabs above #app (tools/build-site.js).
ok('shell has site header and exam tabs',()=>{
 if(!/<header class="sh">[\s\S]*?href="\/"/.test(html))throw new Error('no site header with a link to /');
 if(!/<nav class="xt"[\s\S]*?class="xt-t hp on"/.test(html))throw new Error('no exam tab bar with Practice tests active');
 if(html.indexOf('<header class="sh">')>html.indexOf('<div id="app">'))throw new Error('site header must sit outside #app');});
ok('renderStudy',()=>run('renderStudy()'));
ok('renderPractice',()=>run('startPractice();renderPractice()'));
ok('practice draws questionCount',()=>{const n=run('st.pq.length'),N=run('EX.blueprint.questionCount');if(n!==N)throw new Error(n+' != '+N);if(new Set(run('st.pq.map(q=>q.id)')).size!==n)throw new Error('duplicate ids in draw');});
ok('timer starts at durationSec',()=>{if(run('st.psec')!==run('EX.blueprint.durationSec'))throw new Error('psec '+run('st.psec'))});
ok('calcScore',()=>run('calcScore(allQ())'));
ok('renderReport',()=>run('submitPractice();renderReport()'));
ok('renderReview',()=>run('renderReview()'));
ok('multi-select card renders and reveals',()=>{const id=run("(allQ().find(q=>q.type==='multi')||{}).id");if(!id)return;run("st.rev['"+id+"']=true;var __c=renderQCard(allQ().find(q=>q.id==='"+id+"'),{showAdmin:true})");const t=text(run('__c'));if(!/Select \d/.test(t))throw new Error('no Select N badge');});
ok('weights sum to questionCount and fit the pool',()=>{const w=run('WEIGHTS'),N=run('EX.blueprint.questionCount');const s=Object.values(w).reduce((a,b)=>a+b,0);if(s!==N)throw new Error('sum '+s);const pool=run('(()=>{const p={};allQ().forEach(q=>p[q.domain]=(p[q.domain]||0)+1);return p})()');for(const d in w)if(w[d]>(pool[d]||0))throw new Error('D'+d+' needs '+w[d]+' has '+pool[d]);});
// Yes/No and Match items (CCAR-P Version 2): one answer per statement, scored all or nothing,
// with Submit only once every row is answered. Skipped for exams without them.
ok('Yes/No and Match items: render, select, submit, score, review',()=>{
 for(const ty of ['yn','match']){const id=run("(allQ().find(q=>q.type==='"+ty+"')||{}).id");if(!id)continue;
  const Q="allQ().find(q=>q.id==='"+id+"')";
  run("st.sel={};st.sub={};st.rev={};var __g="+Q);
  let t=text(run("renderQCard(__g,{})"));
  if(!t.includes(ty==='yn'?'Yes / No':'Match'))throw new Error(id+': no type badge');
  if(/Submit/.test(t))throw new Error(id+': Submit shown before any answer');
  // answer all but the last statement: still no Submit, and not correct
  run("st.sel[__g.id]=__g.answer.map((a,i)=>i<__g.answer.length-1?a:null)");
  if(/Submit/.test(text(run("renderQCard(__g,{})"))))throw new Error(id+': Submit shown with a row unanswered');
  if(run("isCorrect(__g)"))throw new Error(id+': partial grid scored as correct');
  if(!run("hasAnswer(__g)"))throw new Error(id+': partial grid not counted as answered');
  // all right: Submit appears, scores correct
  run("st.sel[__g.id]=__g.answer.slice()");
  if(!/Submit/.test(text(run("renderQCard(__g,{})"))))throw new Error(id+': no Submit with every row answered');
  if(!run("isCorrect(__g)"))throw new Error(id+': all-correct grid scored as wrong');
  // one row wrong: all or nothing
  run("var __w=__g.answer.slice();__w[0]="+(ty==='yn'?"__w[0]==='Yes'?'No':'Yes'":"__g.options.find(o=>o.l!==__w[0]).l")+";st.sel[__g.id]=__w");
  if(run("isCorrect(__g)"))throw new Error(id+': one wrong row still scored correct');
  run("st.sub[__g.id]=true");if(run("calcScore([__g]).c")!==0)throw new Error(id+': calcScore counted a wrong grid');
  run("st.sel[__g.id]=__g.answer.slice()");if(run("calcScore([__g]).c")!==1)throw new Error(id+': calcScore missed a right grid');
  // review and reveal show the answer and one explanation per statement
  t=text(run("renderQCard(__g,{showAnswer:true,allowSelect:false})"));
  if(!t.includes('Explanation of each statement'))throw new Error(id+': no per-statement explanations');
  if(!t.includes(run("__g.answer.map((a,i)=>(i+1)+' '+a).join(', ')")))throw new Error(id+': answer line missing');
  // a peek (Show Answer) never grades
  run("st.sub={};st.sel={};st.rev[__g.id]=true");t=text(run("renderQCard(__g,{})"));
  if(!/Hide/.test(t)||/Submit/.test(t))throw new Error(id+': revealed grid should offer Hide only');
  run("st.sel={};st.sub={};st.rev={}");}
});
ok('every question well-formed with a reference',()=>{const bad=run(`allQ().filter(q=>!q.ref||!/^https:\\/\\//.test(q.ref)||q.ref.split('|').length!==2||!q.answer.length||(isGrid(q)?(!q.statements||q.answer.length!==q.statements.length||(q.type==='yn'?q.answer.some(a=>a!=='Yes'&&a!=='No'):q.answer.some(a=>!q.options.some(o=>o.l===a)))||!q.notes||q.notes.length!==q.statements.length):q.answer.some(a=>!q.options.some(o=>o.l===a)))||(q.type==='multi'&&q.answer.length!==q.select)||!EX.domains[q.domain]).map(q=>q.id)`);if(bad.length)throw new Error('bad: '+bad.join(','));});
ok('never reads questions from Supabase',()=>{if(fetched.some(u=>/\/rest\/v1\/(questions|scenarios)/.test(u)))throw new Error(fetched.join(' '))});
ok('fixed tests: each draws exactly its ids, no overlap',()=>{const T=run('FIXED');const seen=new Set();
 T.forEach(t=>{run('PROG.cur=null;startPractice('+t.n+')');const ids=run('st.pq.map(q=>q.id)');
  if(ids.length!==t.ids.length||ids.length>run('EX.blueprint.questionCount'))throw new Error(t.title+' drew '+ids.length);
  const want=t.secs||Math.round(run('EX.blueprint.durationSec')*t.ids.length/run('EX.blueprint.questionCount')/60)*60;
  if(run('st.psec')!==want)throw new Error(t.title+' timer '+run('st.psec')+' not '+want);
  if([...ids].sort().join()!==[...t.ids].sort().join())throw new Error(t.title+' drew other ids');
  t.ids.forEach(id=>{if(seen.has(id))throw new Error(id+' in two tests');seen.add(id);});});
 if(!T.length)console.log('  (no fixed tests in this exam)');});
ok('attempt saved on submit; report compares with previous',()=>{const T=run('FIXED.length?1:0');
 run('PROG=freshProgress();startPractice('+T+');st.sel[st.pq[0].id]=st.pq[0].answer.slice();submitPractice()');
 run('startPractice('+T+');submitPractice();renderReport()');
 const a=run('attemptsFor('+T+')');if(a.length!==2)throw new Error(a.length+' attempts saved');if(a[0].c!==1||a[1].c!==0)throw new Error('scores '+a[0].c+','+a[1].c);
 if(run('PROG.cur')!==null)throw new Error('cur not cleared on submit');
 if(!find(byId.app,n=>/from your previous attempt/.test(n.textContent||'')))throw new Error('no comparison line');
 run('homeTest='+(T||0)+';renderHome()');if(T&&!find(byId.app,n=>/Best \d+% · Last \d+% · 2 attempts/.test(n.textContent||'')))throw new Error('test card shows no history');});
ok('review filters',()=>{// the last run above answered nothing, then one correctly
 run("st.sel[st.pq[0].id]=st.pq[0].answer.slice();st.rf='wrong';renderReview()");const n=run('st.pq.filter(q=>!isCorrect(q)).length');
 if(n!==run('st.pq.length')-1)throw new Error('wrong count '+n);
 if(!find(byId.app,n=>/^Incorrect/.test(n.textContent||'')))throw new Error('no Incorrect tab');run("st.rf='all'");});
// Discard and submit stamp curU so account sync keeps the newer side (a discarded run
// used to come back from the account on the next sync).
ok('discard and submit stamp curU',()=>{run("PROG.cur=null;startPractice(1);saveCur()");const u1=run('PROG.curU');if(!u1||!run('PROG.cur'))throw new Error('saveCur did not stamp');
 run('discardCur()');if(run('PROG.cur')!==null||!(run('PROG.curU')>=u1))throw new Error('discard did not stamp');
 run('startPractice(1);submitPractice()');if(run('PROG.cur')!==null||!run('PROG.curU'))throw new Error('submit did not stamp');run("go('home')");});
ok('resume: exit saves, reload and Forward restore, discard clears',()=>{const T=run('FIXED.length?FIXED.length:0');
 run("PROG.cur=null;startPractice("+T+");st.pi=3;st.sel[st.pq[2].id]=['A'];st.pflag[st.pq[1].id]=true;st.psec=4000;renderPractice()");
 const ids=run('st.pq.map(q=>q.id)');
 ctx.location.hash='#/';run('routeFromHash()');
 if(run('view')!=='home'||run('st.pq.length'))throw new Error('leaving did not pause');
 run('renderHome()');if(!find(byId.app,n=>/in progress/.test(n.textContent||'')))throw new Error('no resume bar');
 run('PROG=loadProgress()');// as after a reload
 ctx.location.hash='#/practice';run('routeFromHash()');
 if(run('view')!=='practice')throw new Error('#/practice did not resume, view '+run('view'));
 if(run('st.pq.map(q=>q.id)').join()!==ids.join())throw new Error('order changed');
 if(run('st.pi')!==3||run('st.psec')!==4000||run('st.ptest')!==T)throw new Error('pi/psec/ptest not restored');
 if(run("(st.sel[st.pq[2].id]||[]).join()")!=='A'||!run('st.pflag[st.pq[1].id]'))throw new Error('answers/flags not restored');
 ctx.location.hash='#/';run('routeFromHash()');run('discardCur()');ctx.location.hash='#/practice';run('routeFromHash()');
 if(run('view')!=='home')throw new Error('discarded run came back');});
ok('export/import progress merges and rejects other exams',()=>{
 const d=run("({app:'certprep',exam:EX.id,progress:JSON.parse(JSON.stringify(PROG))})");const before=run('PROG.attempts.length');
 if(run('mergeProgress('+JSON.stringify(d)+')')!==0)throw new Error('re-import duplicated attempts');
 d.progress.attempts.push({t:0,d:'2026-01-01T00:00:00.000Z',c:5,n:10,ds:{}});
 if(run('mergeProgress('+JSON.stringify(d)+')')!==1||run('PROG.attempts.length')!==before+1)throw new Error('new attempt not merged');
 if(run('PROG.attempts[0].d')!=='2026-01-01T00:00:00.000Z')throw new Error('not sorted by date');
 let threw=false;try{run("mergeProgress({app:'certprep',exam:'other',progress:{attempts:[]}})");}catch(e){threw=true;}if(!threw)throw new Error('accepted another exam');
 run('PROG=freshProgress();saveProgress()');});
ok('test list + mode cards: every test listed; Study and Exam per test; Random Mix exam only',()=>{const T=run('FIXED');
 const all=cls=>{const out=[];const walk=n=>{if(!n)return;if(typeof n.className==='string'&&n.className.split(' ').includes(cls))out.push(n);(n.children||[]).forEach(walk);};walk(byId.app);return out;};
 run('homeTest=null;PROG=freshProgress();renderHome()');
 if(all('tl-item').length!==T.length+1)throw new Error('list has '+all('tl-item').length+' items for '+T.length+' tests');
 if(T.length&&run('selectedTest()')!==1)throw new Error('default is not the first untaken test');
 const last=T.length||0;run('selectTest('+last+')');
 if(T.length&&!find(byId.app,n=>n.className==='tm-h'&&n.textContent===T[last-1].title))throw new Error('panel does not show the selected test');
 const modes=all('mode2');if(modes.length!==(T.length?2:2))throw new Error(modes.length+' mode cards');
 if(!find(byId.app,n=>n.className==='m2-t'&&n.textContent==='Study mode')||!find(byId.app,n=>n.className==='m2-t'&&n.textContent==='Exam mode'))throw new Error('missing a mode');
 if(T.length){run('selectTest(0)');const m=all('mode2');if(m.length!==1||!/Exam mode/.test(m[0].textContent))throw new Error('Random Mix should offer exam mode only');}
 run('homeTest=null');});
ok('study opens exactly one test, with its own URL',()=>{const T=run('FIXED');if(!T.length)return;const L=T[T.length-1];
 run('st.pq=[];st.pdone=false;startStudy('+L.n+')');
 if(ctx.location.hash!=='#/study/'+L.n)throw new Error('hash '+ctx.location.hash);
 const ids=run('studySet(st.stest).map(q=>q.id)');if(ids.slice().sort().join()!==L.ids.slice().sort().join())throw new Error('wrong questions');
 run('renderStudy()');if(!find(byId.app,n=>(n.textContent||'')===L.title+': Study'))throw new Error('no study title');
 ctx.location.hash='#/study/1';run('routeFromHash()');if(run('st.stest')!==1||run('view')!=='study')throw new Error('#/study/1 -> '+run('st.stest'));
 ctx.location.hash='#/study/99';run('routeFromHash()');if(run('st.stest')!==0)throw new Error('bad test number kept');
 run('startStudy(0)');if(run('studySet(0).length')!==run('allQ().length'))throw new Error('study 0 is not the whole bank');});
ok('study state is saved per test and restored (leave, other test, reload, Back)',()=>{const T=run('FIXED');if(!T.length)return;const two=T.length>1;
 run('PROG=freshProgress();saveProgress();st.pq=[];st.pdone=false;startStudy(1)');
 const q=run('studySet(1).slice(0,3).map(q=>({id:q.id,a:q.answer}))');
 run("st.sel['"+q[0].id+"']=['A'];render()");// an option click re-renders
 run("st.sel['"+q[1].id+"']="+JSON.stringify(q[1].a)+";st.sub['"+q[1].id+"']=true;saveStudy()");// Submit
 run("st.rev['"+q[2].id+"']=true;saveStudy();st.as=2;render()");// Show Answer, domain tab
 const check=w=>{if(run("(st.sel['"+q[0].id+"']||[]).join()")!=='A')throw new Error(w+': selection lost');if(!run("st.sub['"+q[1].id+"']"))throw new Error(w+': submit lost');if(!run("st.rev['"+q[2].id+"']"))throw new Error(w+': reveal lost');if(run('st.as')!==2)throw new Error(w+': domain tab lost');};
 run("go('home')");if(two){run('startStudy(2)');if(run('Object.keys(st.sub).length'))throw new Error('test 2 shows test 1 answers');}
 run('startStudy(1)');check('return');
 run("go('home')");run('PROG=loadProgress();st.sel={};st.sub={};st.rev={};st.as=0');// as after a reload
 ctx.location.hash='#/study/1';run('routeFromHash()');check('reload');
 if(two){ctx.location.hash='#/study/2';run('routeFromHash()');ctx.location.hash='#/study/1';run('routeFromHash()');check('Back');}
 const ss=run('studyStats(1)');if(!ss||ss.done!==1||ss.c!==1)throw new Error('studyStats '+JSON.stringify(ss));
 run("go('home');homeTest=1;renderHome()");if(!find(byId.app,n=>/Answered 1 of \d+ · 1 correct/.test(n.textContent||'')))throw new Error('home does not show study progress');
 run('PROG=freshProgress();saveProgress();st.sel={};st.sub={};st.rev={};st.as=0;st.stest=0;homeTest=null');});
ok('latest answer per question: exam submit records it, old progress is back-filled',()=>{const T=run('FIXED');
 run('PROG=freshProgress();st.pq=[];st.pdone=false;startPractice(0)');const q0=run('st.pq[0].id');
 run('st.sel[st.pq[0].id]=st.pq[0].answer.slice();submitPractice()');
 const a=run('PROG.attempts[0]');if(!a.ids||a.ids.length!==run('st.pq.length'))throw new Error('Random Mix attempt has no ids');
 const ql=run('PROG.ql');if(Object.keys(ql).length!==a.ids.length)throw new Error('ql has '+Object.keys(ql).length);
 if(ql[q0][0]!==1||ql[a.ids.find(i=>i!==q0)][0]!==0)throw new Error('ql right/wrong mixed up');
 if(!T.length)return;
 // Progress saved before ql existed: a Test 1 attempt and a study answer.
 const t1=T[0].ids,sq=run("allQ().find(q=>q.id==='"+t1[1]+"')");
 store[run('PKEY')]=JSON.stringify({v:1,cur:null,attempts:[{t:1,d:'2026-10-01T00:00:00.000Z',c:59,n:60,ds:{},wrong:[t1[0]]}],study:{1:{sel:{[t1[1]]:sq.answer.filter((_,i)=>i>0).concat(sq.options.find(o=>!sq.answer.includes(o.l)).l)},sub:[t1[1]],rev:[]}}});
 run('PROG=loadProgress()');const b=run('PROG.ql');
 if(b[t1[0]][0]!==0)throw new Error('missed exam answer not back-filled');
 if(b[t1[1]][0]!==1)throw new Error('exam attempt should override the undated study answer');
 if(b[t1[2]][0]!==1||Object.keys(b).length!==t1.length)throw new Error('test ids not back-filled');
 run('PROG=freshProgress();saveProgress()');});
ok('retry mistakes: all and per domain, answers leave the pool, summary, URL and reload',()=>{
 const ids=run('(()=>{const by={};allQ().forEach(q=>(by[q.domain]=by[q.domain]||[]).push(q.id));const d=Object.keys(by);return[by[d[0]][0],by[d[0]][1],by[d[1]][0]];})()');
 const d1=run("allQ().find(q=>q.id==='"+ids[0]+"').domain");
 run('PROG=freshProgress();st.pq=[];st.pdone=false;view="home"');
 ids.forEach(id=>run("recordResult(allQ().find(q=>q.id==='"+id+"'),false)"));
 if(run('missedIds().length')!==3||run('missedIds('+d1+').length')!==2)throw new Error('missedIds');
 run('startRetry(0)');if(run('view')!=='retry'||ctx.location.hash!=='#/retry'||run('st.rq.length')!==3)throw new Error('startRetry(0) -> '+run('view')+' '+ctx.location.hash);
 run('renderRetry()');if(!find(byId.app,n=>/Question 1 of 3/.test(n.textContent||'')))throw new Error('no position line');
 // Answer the first one correctly (what Submit does), then finish.
 run('const __q=st.rq[0];st.sel[__q.id]=__q.answer.slice();st.sub[__q.id]=true;recordResult(__q,true);saveProgress();st.ri=st.rq.length;renderRetry()');
 if(run('missedIds().length')!==2)throw new Error('correct answer did not leave the pool');
 if(!find(byId.app,n=>/2 questions are still marked as missed/.test(n.textContent||'')))throw new Error('no summary');
 run('startRetry('+d1+')');if(ctx.location.hash!=='#/retry/'+d1)throw new Error('domain hash '+ctx.location.hash);
 if(run('st.rq.some(q=>q.domain!=='+d1+')'))throw new Error('domain retry has other domains');
 // Reload on #/retry/<d>: rebuilt from the saved pool.
 run("go('home');st.rq=[];st.rd=0;PROG=loadProgress()");ctx.location.hash='#/retry/'+d1;run('routeFromHash()');
 if(run('view')!=='retry'||run('st.rd')!==d1||!run('st.rq.length'))throw new Error('reload did not rebuild');
 // Nothing missed: the route falls back to home.
 run("go('home');st.rq=[];PROG=freshProgress()");ctx.location.hash='#/retry';run('routeFromHash()');if(run('view')!=='home')throw new Error('empty retry -> '+run('view'));
 // Report offers a retry of that attempt's misses.
 run('startPractice(0);submitPractice();renderReport()');if(!find(byId.app,n=>/^Retry the \d+ you missed$/.test(n.textContent||'')))throw new Error('no retry button on report');
 run('PROG=freshProgress();saveProgress();st.rq=[]');});
ok('readiness: hidden without data, verdict needs enough answers, weighted overall',()=>{
 run('PROG=freshProgress();renderHome()');if(find(byId.app,n=>n.textContent==='Readiness by Domain'))throw new Error('shown with no data');
 const d=run('Object.keys(EX.domains).map(Number)'),pool=run('allQ().filter(q=>q.domain==='+d[0]+').map(q=>q.id)');
 pool.slice(0,4).forEach(id=>run("recordResult(allQ().find(q=>q.id==='"+id+"'),true)"));
 let R=run('readiness()');if(R.rows[0].status!=='none'||R.overall!==null)throw new Error('verdict on 4 answers');
 run("recordResult(allQ().find(q=>q.id==='"+pool[4]+"'),true)");R=run('readiness()');
 if(R.rows[0].status!=='ok'||R.rows[0].acc!==100||R.overall!==100||R.rated!==1)throw new Error('after 5 right: '+JSON.stringify(R.rows[0])+' overall '+R.overall);
 const p2=run('allQ().filter(q=>q.domain==='+d[1]+').map(q=>q.id)');p2.slice(0,5).forEach(id=>run("recordResult(allQ().find(q=>q.id==='"+id+"'),false)"));
 R=run('readiness()');const w=run('EX.domains')[d[0]].weightPct,w2=run('EX.domains')[d[1]].weightPct;
 if(R.rows[1].status!=='work'||R.overall!==Math.round(100*w/(w+w2)))throw new Error('weighting '+R.overall);
 run('renderHome()');if(!find(byId.app,n=>n.textContent==='Readiness by Domain'))throw new Error('panel missing');
 if(!find(byId.app,n=>n.textContent==='Retry 5 mistakes'))throw new Error('no retry-all button');
 // Import keeps the more recent answer for each question.
 const id=pool[0],f={app:'certprep',exam:run('EX.id'),progress:{attempts:[],ql:{[id]:[0,'2999-01-01T00:00:00.000Z'],[p2[0]]:[1,'2000-01-01T00:00:00.000Z']}}};
 run('mergeProgress('+JSON.stringify(f)+')');if(run("PROG.ql['"+id+"'][0]")!==0||run("PROG.ql['"+p2[0]+"'][0]")!==0)throw new Error('import merge did not keep the newer answer');
 run('PROG=freshProgress();saveProgress()');});
ok('router: go(), Back-style routing, guarded routes, #admin',()=>{
 const H=()=>ctx.location.hash,V=()=>run('view');
 run("st.pq=[];st.pdone=false;go('study')");if(H()!=='#/study'||V()!=='study')throw new Error('go(study) -> '+H()+' '+V());
 ctx.location.hash='#/';run('routeFromHash()');if(V()!=='home')throw new Error('#/ -> '+V());
 ctx.location.hash='#/review';run('routeFromHash()');if(V()!=='home'||H()!=='#/')throw new Error('#/review without an exam -> '+V()+' '+H());
 ctx.location.hash='#/nonsense';run('routeFromHash()');if(V()!=='home')throw new Error('unknown route -> '+V());
 ctx.location.hash='#admin';run('routeFromHash()');if(run('st.modal')!=='admin')throw new Error('#admin did not open admin');
 ctx.location.hash='#/study';run('routeFromHash()');if(run('st.modal')||V()!=='study')throw new Error('leaving #admin -> '+V());});
ok('learning guide: every lesson task has questions, answer panels link the objective to its lesson',()=>{
 // The progress strip appears only once a lesson is complete (the exam tab bar links the guide).
 const L=run("typeof LEARN!=='undefined'?LEARN.lessons:[]"),pk=run('EX.storagePrefix')+'-learn',hasStrip=()=>!!find(byId.app,n=>n.className==='learn-strip');
 delete store[pk];run('renderHome()');if(hasStrip())throw new Error('guide strip shown with no lesson complete');
 if(L.length){store[pk]=JSON.stringify({v:1,done:{[L[0].id]:'2026-11-04'}});run('renderHome()');
  if(!hasStrip())throw new Error('guide strip missing after a lesson was completed');
  if(!find(byId.app,n=>n.className==='ls-go'&&n.attrs.href===L[1].u))throw new Error('strip does not link the next lesson');
  delete store[pk];run('renderHome()');}
 for(const l of L)if(!run('allQ().some(q=>q.objective==='+JSON.stringify(l.t)+')'))throw new Error('lesson '+l.id+' task has no question');
 const q=run('allQ().find(q=>q.objective&&lessonForOb(q.objective))');
 if(!L.length){if(q)throw new Error('lesson link without a guide');return;}
 const l=L.find(x=>x.t===q.objective);
 const card=run('renderQCard(allQ().find(q=>q.id==='+JSON.stringify(q.id)+'),{showAnswer:true})');
 if(!find(card,n=>n.textContent==='Read lesson '+l.id))throw new Error('no "Read lesson '+l.id+'" link on '+q.id);});
ok('learning guide return point: Read lesson saves the view, #/back restores it once',()=>{
 if(!run('LESSONS.length'))return;
 run("startPractice(1);st.pq.slice(0,7).forEach(q=>{st.sel[q.id]=isGrid(q)?q.statements.map(()=>q.type==='yn'?'Yes':q.options[0].l):[q.options[0].l]});submitPractice();go('review');st.rf='wrong'");
 const q=run("st.pq.find(q=>lessonForOb(q.objective)).id");
 run("saveBack(allQ().find(q=>q.id==='"+q+"'))");
 const rec=run('readBack()');if(!rec||rec.v!=='review'||rec.label!=='your review'||rec.ids.length!==run('st.pq.length'))throw new Error('bad record '+JSON.stringify(rec&&{v:rec.v,label:rec.label}));
 const want=run('JSON.stringify(st.sel)');
 run("st.pq=[];st.pdone=false;st.sel={};view='home'");ctx.location.hash='#/back';run('routeFromHash()');
 if(run('view')!=='review'||ctx.location.hash!=='#/review'||!run('st.pdone')||run('JSON.stringify(st.sel)')!==want||run('st.rf')!=='wrong')throw new Error('review not restored: '+run('view')+' '+ctx.location.hash);
 if(run('readBack()'))throw new Error('record not consumed');
 ctx.location.hash='#/back';run('routeFromHash()');if(run('view')!=='home')throw new Error('#/back with no record -> '+run('view'));
 run("PROG=freshProgress();saveProgress();st.pq=[];st.pdone=false;go('home')");});
if(dumpI>0)fs.writeFileSync(process.argv[dumpI+1],JSON.stringify(run('({EX,WEIGHTS,DM,BUILTIN:BUILTIN.map(q=>({...q,difficulty:undefined,objective:undefined})).sort((a,b)=>a.id<b.id?-1:1),BS})')));
console.log((fail?fail+' FAILED':'ALL PASS')+'  ['+run('EX.code')+', '+run('allQ().length')+' questions]');process.exit(fail?1:0);
