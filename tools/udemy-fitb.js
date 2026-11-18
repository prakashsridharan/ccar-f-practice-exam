#!/usr/bin/env node
// Paste-ready Udemy "Fill in the blanks" items for the Yes/No and Match questions of a
// Version 2 bank (Udemy practice tests mark a blank as __answer__; one item can hold several).
//
//   node tools/udemy-fitb.js <v2-exam-dir> [out.txt]
//   e.g. node tools/udemy-fitb.js ../certprep-content/claude/ccar-p-v2
//
// Writes <dir>/udemy/fill-in-blanks.txt (private content repo): one block per item, grouped by
// test, each with the Statement text (scenario, Match options, numbered statements with blanks),
// the Explanation (rationale, one line per statement, then the documentation link) and the Domain to pick.
'use strict';
const fs=require('fs'),path=require('path');
const {parseQuestions}=require('./build.js');
const dir=process.argv[2];if(!dir){console.error('usage: node tools/udemy-fitb.js <v2-exam-dir> [out.txt]');process.exit(2);}
const EXAM=new Function(fs.readFileSync(path.join(dir,'config.js'),'utf8')+';return EXAM;')();
const shared=EXAM.shares?path.join(dir,'..',EXAM.shares):dir;
const {qs,keys}=parseQuestions(fs.readFileSync(path.join(dir,'questions.md'),'utf8'),'questions.md');
const refs=JSON.parse(fs.readFileSync(path.join(fs.existsSync(path.join(dir,'refs.json'))?dir:shared,'refs.json'),'utf8'));
const tests=JSON.parse(fs.readFileSync(path.join(fs.existsSync(path.join(dir,'tests.json'))?dir:shared,'tests.json'),'utf8'));
// Udemy shows plain text: drop Markdown emphasis and code ticks.
const plain=s=>String(s).replace(/\*\*([^*]+)\*\*/g,'$1').replace(/`([^`]+)`/g,'$1');
// The bank says "select Yes ... or No"; in Udemy the learner types the answer.
const typed=s=>s.replace(/select Yes if/g,'type Yes if').replace(/, select Yes/g,', type Yes');
const out=[EXAM.code+' '+(EXAM.name.match(/\(Version [\d.]+\)/)||[''])[0]+' - Udemy "Fill in the blanks" items','',
  'One block per Yes/No or Match question. In Udemy: Add question, Fill in the blanks. Copy the lines between [STATEMENT]',
  'and [END STATEMENT] into Statement, and those between [EXPLANATION] and [END EXPLANATION] into Explanation, pasting',
  'with Ctrl+Shift+V (paste as plain text) so Udemy keeps normal text that wraps. Add the RESOURCE TITLE and URL under',
  'Resources, and pick the DOMAIN. Each __answer__ becomes a blank. Answers are Yes/No or a single',
  'capital letter, and every item tells the learner exactly what to type.',''];
let n=0;
for(const t of tests){
  const items=t.ids.map(id=>qs.find(q=>EXAM.idPrefix+q.n===id)).filter(q=>q&&(q.ty==='yn'||q.ty==='match'));
  if(!items.length)continue;
  out.push('='.repeat(72),t.title.toUpperCase()+' ('+items.length+' items)','='.repeat(72),'');
  for(const q of items){const k=keys[q.n],id=EXAM.idPrefix+q.n;n++;
    const stem=typed(plain(q.stem.join(' ')));
    const lines=[q.ty==='match'?stem+' Type the letter of the matching option in each blank.':stem,''];
    if(q.ty==='match'){q.o.forEach(o=>lines.push(o.l+'. '+plain(o.t)));lines.push('');}
    q.st.forEach((s,i)=>lines.push((i+1)+'. '+plain(s.t)+' __'+k.sa[i].v+'__'));
    const exp=[plain(k.r.join(' ')),'',...k.sn.map(x=>x.n+'. '+plain(x.t))];
    const ref=(refs[id]||'').split('|');if(!ref[0])throw new Error(id+': no documentation link in refs.json');
    out.push('-'.repeat(72),id+' · '+(q.ty==='yn'?'Yes/No':'Match')+' · '+(q.df||''),'-'.repeat(72),'',
      'DOMAIN: '+q.d+'. '+EXAM.domains[q.d].n,'','RESOURCE TITLE: '+(ref[1]||ref[0]),'RESOURCE URL: '+ref[0],'',
      '[STATEMENT]',...lines,'[END STATEMENT]','','[EXPLANATION]',...exp,'[END EXPLANATION]','','');}
}
const target=process.argv[3]||path.join(dir,'udemy','fill-in-blanks.txt');
fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,out.join('\n'));
console.log('wrote '+n+' items to '+target);
