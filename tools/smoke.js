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
 setAttribute(k,v){this.attrs[k]=String(v)},getAttribute(k){return this.attrs[k]},removeAttribute(k){delete this.attrs[k]},
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
 scrollTo(){},addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){}}),URL,Blob:function(){},getComputedStyle:()=>({getPropertyValue:()=>''})};
ctx.window=ctx;vm.createContext(ctx);
let fail=0;const ok=(n,f)=>{try{f();console.log('PASS',n)}catch(e){fail++;console.log('FAIL',n,'-',e&&e.message||e)}};
const run=c=>vm.runInContext(c,ctx);
ok('load scripts ('+scripts.map(s=>s.name).join(', ')+')',()=>scripts.forEach(s=>vm.runInContext(s.code,ctx,{filename:s.name})));
const text=n=>!n?'':(n.textContent||'');
const find=(n,pred)=>{if(!n)return null;if(pred(n))return n;for(const c of n.children||[]){const r=find(c,pred);if(r)return r;}return null;};
ok('renderHome',()=>run('renderHome()'));
ok('home has hub link',()=>{if(!find(byId.app,n=>n.attrs&&n.attrs.href==='/'))throw new Error('no href="/" link')});
ok('renderStudy',()=>run('renderStudy()'));
ok('renderPractice',()=>run('startPractice();renderPractice()'));
ok('practice draws questionCount',()=>{const n=run('st.pq.length'),N=run('EX.blueprint.questionCount');if(n!==N)throw new Error(n+' != '+N);if(new Set(run('st.pq.map(q=>q.id)')).size!==n)throw new Error('duplicate ids in draw');});
ok('timer starts at durationSec',()=>{if(run('st.psec')!==run('EX.blueprint.durationSec'))throw new Error('psec '+run('st.psec'))});
ok('calcScore',()=>run('calcScore(allQ())'));
ok('renderReport',()=>run('submitPractice();renderReport()'));
ok('renderReview',()=>run('renderReview()'));
ok('multi-select card renders and reveals',()=>{const id=run("(allQ().find(q=>q.type==='multi')||{}).id");if(!id)return;run("st.rev['"+id+"']=true;var __c=renderQCard(allQ().find(q=>q.id==='"+id+"'),{showAdmin:true})");const t=text(run('__c'));if(!/Select \d/.test(t))throw new Error('no Select N badge');});
ok('weights sum to questionCount and fit the pool',()=>{const w=run('WEIGHTS'),N=run('EX.blueprint.questionCount');const s=Object.values(w).reduce((a,b)=>a+b,0);if(s!==N)throw new Error('sum '+s);const pool=run('(()=>{const p={};allQ().forEach(q=>p[q.domain]=(p[q.domain]||0)+1);return p})()');for(const d in w)if(w[d]>(pool[d]||0))throw new Error('D'+d+' needs '+w[d]+' has '+pool[d]);});
ok('every question well-formed with a reference',()=>{const bad=run(`allQ().filter(q=>!q.ref||!/^https:\\/\\//.test(q.ref)||q.ref.split('|').length!==2||!q.answer.length||q.answer.some(a=>!q.options.some(o=>o.l===a))||(q.type==='multi'&&q.answer.length!==q.select)||!EX.domains[q.domain]).map(q=>q.id)`);if(bad.length)throw new Error('bad: '+bad.join(','));});
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
ok('router: go(), Back-style routing, guarded routes, #admin',()=>{
 const H=()=>ctx.location.hash,V=()=>run('view');
 run("st.pq=[];st.pdone=false;go('study')");if(H()!=='#/study'||V()!=='study')throw new Error('go(study) -> '+H()+' '+V());
 ctx.location.hash='#/';run('routeFromHash()');if(V()!=='home')throw new Error('#/ -> '+V());
 ctx.location.hash='#/review';run('routeFromHash()');if(V()!=='home'||H()!=='#/')throw new Error('#/review without an exam -> '+V()+' '+H());
 ctx.location.hash='#/nonsense';run('routeFromHash()');if(V()!=='home')throw new Error('unknown route -> '+V());
 ctx.location.hash='#admin';run('routeFromHash()');if(run('st.modal')!=='admin')throw new Error('#admin did not open admin');
 ctx.location.hash='#/study';run('routeFromHash()');if(run('st.modal')||V()!=='study')throw new Error('leaving #admin -> '+V());});
if(dumpI>0)fs.writeFileSync(process.argv[dumpI+1],JSON.stringify(run('({EX,WEIGHTS,DM,BUILTIN:BUILTIN.map(q=>({...q,difficulty:undefined,objective:undefined})).sort((a,b)=>a.id<b.id?-1:1),BS})')));
console.log((fail?fail+' FAILED':'ALL PASS')+'  ['+run('EX.code')+', '+run('allQ().length')+' questions]');process.exit(fail?1:0);
