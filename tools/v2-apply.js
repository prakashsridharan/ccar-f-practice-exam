#!/usr/bin/env node
// Replace questions in a Version 2 bank with rewritten ones from a batch file.
//
//   node tools/v2-apply.js <bank.md> <batch.md>
//
// The batch file has the same two parts as the bank: question blocks ("**Q12.** ...") and,
// after a "# Answer key" line, key blocks ("**Q12** (CODE) - ..."). Each question block and
// key block in the batch replaces the block with the same number in the bank; nothing else
// changes. Run tools/check-v2.js afterwards.
'use strict';
const fs=require('fs');
const [bankF,batchF]=process.argv.slice(2);
if(!bankF||!batchF){console.error('usage: node tools/v2-apply.js <bank.md> <batch.md>');process.exit(2);}
const crlf=/\r\n/.test(fs.readFileSync(bankF,'utf8'));
const norm=s=>s.replace(/\r\n/g,'\n');
const bank=norm(fs.readFileSync(bankF,'utf8')),batch=norm(fs.readFileSync(batchF,'utf8'));
const split=s=>{const i=s.search(/^# Answer key/m);if(i<0)throw new Error('no "# Answer key" line');return[s.slice(0,i),s.slice(i)];};
// Blocks start at a header line and run up to the next header, a "## " heading or the end.
const blocks=(part,re)=>{const out={},lines=part.split('\n');let n=null,buf=[];
  const end=()=>{if(n!==null)out[n]=buf.join('\n').replace(/\s+$/,'');n=null;buf=[];};
  for(const l of lines){const m=l.match(re);if(m){end();n=+m[1];buf=[l];}else if(/^#{1,2} /.test(l)){end();}else if(n!==null)buf.push(l);}
  end();return out;};
const QH=/^\*\*Q(\d+)\.\*\*/,KH=/^\*\*Q(\d+)\*\*\s/;
const [bq,bk]=split(batch),newQ=blocks(bq,QH),newK=blocks(bk,KH);
if(!Object.keys(newQ).length)throw new Error('batch has no question blocks');
const replace=(part,re,repl)=>{const lines=part.split('\n'),out=[];let skip=false;const done=new Set();
  for(const l of lines){const m=l.match(re);
    if(m){skip=false;if(repl[+m[1]]!==undefined){out.push(repl[+m[1]],'');skip=true;done.add(+m[1]);continue;}}
    else if(/^#{1,2} /.test(l))skip=false;
    if(!skip)out.push(l);}
  Object.keys(repl).forEach(n=>{if(!done.has(+n))throw new Error('Q'+n+' is not in the bank');});
  return out.join('\n').replace(/\n{3,}/g,'\n\n');};
const [q,k]=split(bank);
let out=replace(q,QH,newQ)+replace(k,KH,newK);
if(crlf)out=out.replace(/\n/g,'\r\n');
fs.writeFileSync(bankF,out);
console.log('replaced questions '+Object.keys(newQ).join(', ')+'; keys '+Object.keys(newK).join(', '));
