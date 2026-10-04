#!/usr/bin/env node
// Partition an exam's question bank into fixed, numbered practice tests and
// write them to <content>/<vendor>/<exam>/tests.json, which tools/build.js
// compiles into the exam file as TESTS.
//
//   node tools/make-tests.js <exam-content-dir> <count> [--seed N] [--force]
//   e.g. node tools/make-tests.js ../certprep-content/claude/ccar-p 5
//
// Run it once per exam. Assignments are stored so a test never changes under
// someone's score history; it refuses to overwrite tests.json without --force.
// To add a test later, append one to tests.json by hand (or with a new bank).
//
// Each test gets questionCount questions with no overlap between tests:
// - if the bank has more questions than the tests need, every test takes the
//   blueprint's per-domain counts and the rest stay in Study and Random mix;
// - if the bank is exactly count x questionCount, every question is used and
//   each domain is split as evenly as possible (within 1 of the ideal share).
// Within a domain, questions are dealt round-robin in difficulty order, so
// easy/medium/hard and multiple-response items spread evenly across tests.
'use strict';
const fs=require('fs'),path=require('path');
const {parseQuestions}=require('./build.js');

const args=process.argv.slice(2),dir=args[0],T=parseInt(args[1],10);
const seedI=args.indexOf('--seed'),seed=seedI>0?parseInt(args[seedI+1],10):1;
if(!dir||!T){console.error('usage: node tools/make-tests.js <exam-content-dir> <count> [--seed N] [--force]');process.exit(2);}
const out=path.join(dir,'tests.json');
if(fs.existsSync(out)&&!args.includes('--force')){console.error(out+' exists. Tests are fixed once published; pass --force only if none is live yet.');process.exit(1);}

const EXAM=new Function(fs.readFileSync(path.join(dir,'config.js'),'utf8')+';return EXAM;')();
const {qs}=parseQuestions(fs.readFileSync(path.join(dir,'questions.md'),'utf8'),'questions.md');
const N=EXAM.blueprint.questionCount,doms=Object.keys(EXAM.domains).map(Number);

// Same largest-remainder apportionment as weightsFor() in app.js.
const w={};let used=0;
const rem=doms.map(d=>{const v=EXAM.domains[d].weightPct/100*N;w[d]=Math.floor(v);used+=w[d];return{d,r:v-w[d]};});
rem.sort((a,b)=>b.r-a.r).slice(0,N-used).forEach(x=>w[x.d]++);

const pool={};doms.forEach(d=>pool[d]=qs.filter(q=>q.d===d));
const total=qs.length;
// quota[t][d] = how many domain-d questions test t gets.
const quota=Array.from({length:T},()=>({}));
if(doms.every(d=>pool[d].length>=T*w[d])){
  quota.forEach(q=>doms.forEach(d=>q[d]=w[d]));
}else if(total===T*N){
  const sum=t=>doms.reduce((a,d)=>a+quota[t][d],0);
  doms.forEach(d=>quota.forEach(q=>q[d]=Math.floor(pool[d].length/T)));
  // Hand each domain's remainder to the tests with the fewest questions so far.
  doms.map(d=>({d,e:pool[d].length%T})).sort((a,b)=>b.e-a.e).forEach(({d,e})=>{
    const order=[...Array(T).keys()].sort((a,b)=>sum(a)-sum(b)||a-b);
    order.slice(0,e).forEach(t=>quota[t][d]++);});
  quota.forEach((q,t)=>{if(sum(t)!==N)throw new Error('test '+(t+1)+' has '+sum(t)+' questions, not '+N);});
}else{
  const short=doms.filter(d=>pool[d].length<T*w[d]).map(d=>'D'+d+' has '+pool[d].length+', needs '+T*w[d]);
  console.error('Bank cannot fill '+T+' tests of '+N+' without overlap ('+short.join('; ')+'). Write more questions or make fewer tests.');process.exit(1);
}

// Seeded shuffle so the deal is reproducible.
let s=seed>>>0||1;const rnd=()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const tests=Array.from({length:T},(_,i)=>({n:i+1,title:'Practice Test '+(i+1),ids:[]}));
// Pick which questions go into tests at all (every one when the bank is exact),
// then place the scarce kinds first: each question goes to the test that has
// room in its domain and the fewest of its difficulty (and of multi-response
// items) so far. Any placement that respects the domain quotas fills exactly.
const chosen=[];
doms.forEach(d=>chosen.push(...shuffle([...pool[d]]).slice(0,quota.reduce((a,q)=>a+q[d],0))));
const freq={};chosen.forEach(q=>freq[q.df||'medium']=(freq[q.df||'medium']||0)+1);
chosen.sort((a,b)=>freq[a.df||'medium']-freq[b.df||'medium']||(b.se>1)-(a.se>1));
const left=quota.map(q=>({...q})),dfc=tests.map(()=>({})),mc=tests.map(()=>0);
for(const q of chosen){
  const df=q.df||'medium',multi=q.se>1;
  const t=[...Array(T).keys()].filter(t=>left[t][q.d]>0)
    .sort((a,b)=>(dfc[a][df]||0)-(dfc[b][df]||0)||(multi?mc[a]-mc[b]:0)||left[b][q.d]-left[a][q.d]||a-b)[0];
  tests[t].ids.push(EXAM.idPrefix+q.n);left[t][q.d]--;dfc[t][df]=(dfc[t][df]||0)+1;if(multi)mc[t]++;
}
tests.forEach(t=>t.ids.sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})));
fs.writeFileSync(out,JSON.stringify(tests,null,1)+'\n');

const byId={};qs.forEach(q=>byId[EXAM.idPrefix+q.n]=q);
console.log('wrote '+out);
console.log('blueprint per test: '+doms.map(d=>'D'+d+' '+w[d]).join('  '));
tests.forEach(t=>{const c={},df={easy:0,medium:0,hard:0},m=t.ids.filter(id=>byId[id].se>1).length;
  t.ids.forEach(id=>{c[byId[id].d]=(c[byId[id].d]||0)+1;df[byId[id].df||'medium']++;});
  console.log(t.title+': '+t.ids.length+' Qs  '+doms.map(d=>'D'+d+' '+(c[d]||0)).join('  ')+'  | '+df.easy+'/'+df.medium+'/'+df.hard+' e/m/h, '+m+' multi');});
const unused=total-tests.reduce((a,t)=>a+t.ids.length,0);
if(unused)console.log(unused+' questions are in no fixed test (Study and Random mix only).');
