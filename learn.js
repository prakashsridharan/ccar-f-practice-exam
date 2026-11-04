// Learning-guide pages: Mark complete, progress counts and ticks, mobile sidebar.
// Progress lives in localStorage['<prefix>-learn'] = {v:1, done:{'1.3':isoDate}}, separate
// from the exam engine's '<prefix>-progress'. Every storage access is guarded: pages must
// work (just without progress) when storage is blocked.
(function(){
  'use strict';
  var root=document.documentElement;root.classList.add('js');
  var body=document.body,key=(body.getAttribute('data-prefix')||'learn')+'-learn';
  function load(){try{var p=JSON.parse(localStorage.getItem(key)||'null');if(p&&p.v===1&&p.done)return p;}catch(e){}return{v:1,done:{}};}
  function save(p){try{localStorage.setItem(key,JSON.stringify(p));}catch(e){}}
  var P=load();

  function paint(){
    var done=P.done,all=0;
    document.querySelectorAll('[data-l]').forEach(function(el){el.classList.toggle('done',!!done[el.getAttribute('data-l')]);});
    var counts={};
    Object.keys(done).forEach(function(id){var d='d'+id.split('.')[0];counts[d]=(counts[d]||0)+1;all++;});
    counts.all=all;
    document.querySelectorAll('[data-prog]').forEach(function(el){
      var k=el.getAttribute('data-prog'),n=Math.min(counts[k]||0,+el.getAttribute('data-total'));
      el.textContent=n+' of '+el.getAttribute('data-total')+(k==='all'?'':' complete');
    });
    document.querySelectorAll('[data-bar]').forEach(function(el){
      var t=document.querySelector('[data-prog="'+el.getAttribute('data-bar')+'"]');
      var tot=t?+t.getAttribute('data-total'):1;el.style.width=Math.round(100*(counts[el.getAttribute('data-bar')]||0)/tot)+'%';
    });
    document.querySelectorAll('[data-done]').forEach(function(b){
      var on=!!done[b.getAttribute('data-done')];
      b.classList.toggle('is-done',on);b.textContent=on?'Completed':'Mark complete';
      b.setAttribute('aria-pressed',on?'true':'false');
    });
  }
  document.addEventListener('click',function(e){
    if(e.target.closest('[data-print]')){window.print();return;}// cheat sheet
    var b=e.target.closest('[data-done]');if(!b)return;
    var id=b.getAttribute('data-done');
    P=load();
    if(P.done[id])delete P.done[id];else P.done[id]=new Date().toISOString();
    save(P);paint();
  });
  // Another tab marked something complete: repaint.
  window.addEventListener('storage',function(e){if(e.key===key){P=load();paint();}});

  // Came here from the practice tests ("Read lesson")? The exam app saved where the reader
  // was in '<prefix>-back'; the Practice tests tab then goes back to it (#/back restores it).
  var hp=document.querySelector('.xt a.hp');
  try{var back=JSON.parse(localStorage.getItem((body.getAttribute('data-prefix')||'')+'-back')||'null');
    if(hp&&back&&Date.now()-back.at<24*3600*1000){
      hp.href=hp.getAttribute('href').split('#')[0]+'#/back';
      hp.textContent='Back to '+(back.label||'the practice tests');hp.classList.add('is-back');
    }}catch(e){}

  // Check questions: pick, Check answer, see right/wrong and the explanation; Try again resets.
  // Not saved and not scored: they are for the reader, separate from the practice tests.
  document.querySelectorAll('[data-kc]').forEach(function(kc){
    var btn=kc.querySelector('.kc-b'),det=kc.querySelector('.kc-d'),need=+kc.getAttribute('data-right')||1;
    var inputs=[].slice.call(kc.querySelectorAll('input'));
    var picked=function(){return inputs.filter(function(i){return i.checked;});};
    kc.addEventListener('change',function(e){
      if(need>1&&picked().length>need)e.target.checked=false;// "select 2" allows only two ticks
      btn.disabled=picked().length!==need;
    });
    btn.addEventListener('click',function(){
      var good=picked().every(function(i){return i.hasAttribute('data-ok');});
      inputs.forEach(function(i){var lab=i.closest('label');i.disabled=true;
        if(i.hasAttribute('data-ok'))lab.classList.add('ok');else if(i.checked)lab.classList.add('bad');});
      kc.classList.add('is-done');btn.hidden=true;
      var v=document.createElement('div');v.className='kc-v '+(good?'ok':'bad');v.textContent=good?'Correct.':'Not quite.';
      var again=document.createElement('button');again.type='button';again.className='kc-again';again.textContent='Try again';
      again.addEventListener('click',function(){
        inputs.forEach(function(i){i.disabled=false;i.checked=false;i.closest('label').classList.remove('ok','bad');});
        kc.classList.remove('is-done');v.remove();det.open=false;btn.hidden=false;btn.disabled=true;
      });
      v.appendChild(again);det.insertBefore(v,det.querySelector('.kc-r'));det.open=true;
    });
  });

  // Exercises: self-check ticks are remembered per item in P.ck ('<lesson>:<n>'); "Copy the
  // steps as a template" puts the exercise title, case and step headings on the clipboard.
  document.querySelectorAll('.ex [data-ck]').forEach(function(cb){
    var k=cb.getAttribute('data-ck');cb.checked=!!(P.ck&&P.ck[k]);
    cb.addEventListener('change',function(){P=load();P.ck=P.ck||{};if(cb.checked)P.ck[k]=1;else delete P.ck[k];save(P);});
  });
  document.querySelectorAll('.ex-copy').forEach(function(btn){
    btn.addEventListener('click',function(){
      var ex=btn.closest('.ex'),h=ex.previousElementSibling,lines=[];
      lines.push('# '+(h&&/^H/.test(h.tagName)?h.textContent:'Exercise'),'',ex.querySelector('.ex-case').textContent,'');
      ex.querySelectorAll(':scope>ol>li').forEach(function(li,i){var s=li.querySelector('strong');lines.push('## '+(i+1)+'. '+(s?s.textContent:li.textContent.split('\n')[0]),'','');});
      var text=lines.join('\n'),done=function(){btn.textContent='Copied';setTimeout(function(){btn.textContent='Copy the steps as a template';},1800);};
      if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(done,function(){fallback(text);done();});else{fallback(text);done();}
    });
  });
  function fallback(text){var t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();try{document.execCommand('copy');}catch(e){}t.remove();}

  // On narrow screens the lesson list starts collapsed so the lesson comes first.
  var side=document.querySelector('.side-d');
  if(side&&window.matchMedia('(max-width:900px)').matches)side.removeAttribute('open');
  paint();
  trackVisit();

  // Count the visit in the same Supabase 'visits' table as the exam pages (public role=anon key,
  // insert-only), with where it came from: utm_source/utm_campaign from a shared link, else the
  // referring site. The utm_ tags are then removed from the address bar so a bookmark or a
  // re-shared link does not credit the same post again. Mirrors visitMeta() in app.js.
  function trackVisit(){
    if(!window.fetch||!window.URLSearchParams)return;
    var U='https://vuzdypmlfpeslsfezapd.supabase.co/rest/v1/visits',
      K='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1emR5cG1sZnBlc2xzZmV6YXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNjYyNDcsImV4cCI6MjEwMzk0MjI0N30.UGbcFwFLeKnTITJLQm8QO4YPn1hDhWe8ptz1-QJ19ik';
    var q=new URLSearchParams(location.search),ref='';
    try{var h=document.referrer&&new URL(document.referrer).hostname;if(h&&h!==location.hostname)ref=h.slice(0,80);}catch(e){}
    var base={page:'learn-'+(body.getAttribute('data-prefix')||''),ua:navigator.userAgent.substring(0,200)};
    var full={page:base.page,ua:base.ua,path:location.pathname.slice(0,200),
      src:(q.get('utm_source')||'').slice(0,40),campaign:(q.get('utm_campaign')||'').slice(0,60),ref:ref};
    var tags=[];q.forEach(function(v,k){if(k.indexOf('utm_')===0)tags.push(k);});
    if(tags.length){tags.forEach(function(k){q.delete(k);});var s=q.toString();
      try{history.replaceState(history.state,'',location.pathname+(s?'?'+s:'')+location.hash);}catch(e){}}
    function post(b){return fetch(U,{method:'POST',headers:{apikey:K,Authorization:'Bearer '+K,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(b)});}
    // 400 = the source columns are not migrated yet: still count the visit.
    post(full).then(function(r){if(r.status===400)return post(base);}).catch(function(){});
  }
})();
