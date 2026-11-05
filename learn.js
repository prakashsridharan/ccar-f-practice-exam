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

  // Search, per exam: the box (sidebar, cheat sheet) searches <learn>/search.json, written by
  // tools/build-learn.js, with MiniSearch (/vendor, MIT). Both load on first focus. A result opens
  // its page at the matching section with ?q=<query>&hl=<matched words>, highlighted below.
  var LP=body.getAttribute('data-learn'),SV=body.getAttribute('data-v')||'1',idx=null,meta=null,loading=null;
  function escRe(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
  function escH(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function loadIndex(){
    if(loading)return loading;
    loading=new Promise(function(res,rej){var s=document.createElement('script');s.src='/vendor/minisearch-7.1.2.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s);})
      .then(function(){return fetch(LP+'search.json?v='+SV);}).then(function(r){return r.json();})
      .then(function(j){meta=j;idx=new MiniSearch({fields:['t','h','c','x'],storeFields:['u','k','l','t','h','d','x'],
        searchOptions:{boost:{t:4,h:3,c:2},prefix:true,fuzzy:function(term){return term.length>4?0.2:false;},combineWith:'AND'}});
        idx.addAll(j.docs);return idx;})
      .catch(function(e){loading=null;throw e;});
    return loading;
  }
  function find(q){
    var syn=meta.synonyms||{},q2=q.toLowerCase();
    Object.keys(syn).forEach(function(k){q2=q2.replace(new RegExp('\\b'+escRe(k)+'\\b','g'),syn[k]);});
    var run=function(s){var r=idx.search(s);return r.length?r:idx.search(s,{combineWith:'OR'});};
    var all={};[q].concat(q2!==q.toLowerCase()?[q2]:[]).forEach(function(s){run(s).forEach(function(r){if(!all[r.id]||all[r.id].score<r.score)all[r.id]=r;});});
    var list=Object.keys(all).map(function(k){return all[k];}).sort(function(a,b){return b.score-a.score;});
    var per={},out=[];// at most two sections from the same page
    list.forEach(function(r){var p=r.u.split('#')[0];per[p]=(per[p]||0)+1;if(per[p]<=2&&out.length<8)out.push(r);});
    return out;
  }
  function snippet(x,terms){
    var re=new RegExp('\\b('+terms.map(escRe).join('|')+')[\\w-]*','i'),m=re.exec(x),at=m?m.index:0;
    var s=Math.max(0,at-50),sp=s?x.indexOf(' ',s):-1;if(sp>-1&&sp<at)s=sp+1;var t=(s?'... ':'')+x.slice(s,s+150)+(x.length>s+150?' ...':'');
    return escH(t).replace(new RegExp('\\b('+terms.map(escRe).join('|')+')[\\w-]*','gi'),'<mark>$&</mark>');
  }
  document.querySelectorAll('.ls').forEach(function(box){
    var q=box.querySelector('.ls-q'),ul=box.querySelector('.ls-r'),items=[],on=-1,timer;
    function show(html){ul.innerHTML=html;ul.hidden=!html;items=[].slice.call(ul.querySelectorAll('a'));on=-1;}
    function inView(li){var t=li.offsetTop-ul.offsetTop;if(t<ul.scrollTop)ul.scrollTop=t;else if(t+li.offsetHeight>ul.scrollTop+ul.clientHeight)ul.scrollTop=t+li.offsetHeight-ul.clientHeight;}
    function mark(i){items.forEach(function(a,k){a.parentNode.classList.toggle('on',k===i);});on=i;if(items[i])inView(items[i].parentNode);}
    // The result for the page being read (same path and section) is marked "Viewing".
    function markCurrent(){var here=location.pathname+location.hash;items.forEach(function(a){
      var u=new URL(a.href,location.href),is=u.pathname+u.hash===here||(!u.hash&&u.pathname===location.pathname&&!location.hash);
      a.parentNode.classList.toggle('cur',is);if(is){a.setAttribute('aria-current','page');inView(a.parentNode);}});}
    function go(){
      var v=q.value.trim();if(v.length<2){show('');return;}
      loadIndex().then(function(){
        if(q.value.trim()!==v)return;
        var rs=find(v);
        if(!rs.length){show('<li class="ls-none">No matches. Try another word.</li>');return;}
        show(rs.map(function(r){
          var parts=r.u.split('#'),dom=meta.domains[r.d],terms=r.terms.length?r.terms:v.toLowerCase().split(/\s+/);
          var href=parts[0]+'?q='+encodeURIComponent(v)+'&hl='+encodeURIComponent(terms.join(' '))+(parts[1]?'#'+parts[1]:'');
          var tag=r.k==='lesson'?r.l:r.k==='cheat'?'Sheet':'Case';
          return '<li role="option"><a href="'+escH(href)+'"><span class="ls-id"'+(dom?' style="--dc:'+dom.color+'"':'')+'>'+escH(tag)+'</span><span class="ls-m"><b>'+escH(r.t)+'</b>'+
            (r.h?'<i>'+escH(r.h)+'</i>':'')+'<small>'+snippet(r.x||'',terms)+'</small></span></a></li>';}).join(''));
        markCurrent();
      }).catch(function(){show('<li class="ls-none">Search is unavailable right now.</li>');});
    }
    q.addEventListener('focus',function(){loadIndex().catch(function(){});if(q.value.trim().length>1&&ul.hidden)go();});
    // Clearing the box with its x button empties the results too.
    q.addEventListener('search',function(){if(!q.value)show('');});
    q.addEventListener('input',function(){clearTimeout(timer);timer=setTimeout(go,90);});
    q.addEventListener('keydown',function(e){
      if(e.key==='ArrowDown'&&items.length){e.preventDefault();mark(Math.min(on+1,items.length-1));}
      else if(e.key==='ArrowUp'&&items.length){e.preventDefault();mark(Math.max(on-1,0));}
      else if(e.key==='Enter'&&items.length){e.preventDefault();location.href=items[on<0?0:on].href;}
      else if(e.key==='Escape'){q.value='';show('');q.blur();}
    });
    // The cheat-sheet box floats over the page, so it closes on an outside click; the sidebar
    // list stays open while the reader moves between matches.
    if(box.classList.contains('ls-wide'))document.addEventListener('click',function(e){if(!box.contains(e.target))show('');});
    box._ls={set:function(v,open){q.value=v;if(open)go();else show('');}};
  });
  // "/" jumps to the search box (unless the reader is typing somewhere).
  document.addEventListener('keydown',function(e){
    if(e.key!=='/'||e.ctrlKey||e.metaKey||e.altKey||/^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName||''))||e.target.isContentEditable)return;
    var q=document.querySelector('.ls-q');if(q&&q.offsetParent!==null){e.preventDefault();q.focus();}
  });

  // Arrived from a search result (?hl=words): mark those words in the page, show a bar with the
  // count and "Clear highlights", then drop q/hl from the address bar so bookmarks stay clean.
  (function(){
    var p=window.URLSearchParams&&new URLSearchParams(location.search),hl=p&&(p.get('hl')||'').trim();if(!hl)return;
    var main=document.querySelector('.main'),terms=hl.toLowerCase().split(/\s+/).filter(function(t){return t.length>1;}).slice(0,8);
    if(!main||!terms.length)return;
    var re=new RegExp('\\b('+terms.map(escRe).join('|')+')[\\w-]*','gi'),nodes=[],n,count=0;
    var w=document.createTreeWalker(main,NodeFilter.SHOW_TEXT,{acceptNode:function(t){
      return t.nodeValue.trim()&&!t.parentNode.closest('script,style,mark,.crumbs,.ls,.kc,button,.notice')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;}});
    while((n=w.nextNode()))nodes.push(n);
    nodes.forEach(function(t){
      var s=t.nodeValue,m,last=0,f=document.createDocumentFragment();re.lastIndex=0;
      while((m=re.exec(s))){f.appendChild(document.createTextNode(s.slice(last,m.index)));
        var k=document.createElement('mark');k.className='hl';k.textContent=m[0];f.appendChild(k);last=m.index+m[0].length;count++;}
      if(!last)return;f.appendChild(document.createTextNode(s.slice(last)));t.parentNode.replaceChild(f,t);
    });
    var bar=document.createElement('div');bar.className='hl-bar';
    bar.innerHTML='<span>'+count+' match'+(count===1?'':'es')+' for <b></b></span><button type="button">Clear highlights</button>';
    bar.querySelector('b').textContent='"'+(p.get('q')||hl)+'"';
    var qv=(p.get('q')||'').trim(),boxes=[].slice.call(document.querySelectorAll('.ls')).filter(function(b){return b._ls;});
    // Carry the search over: the box keeps the query and, where there is room, the results list
    // reopens with this page marked, so the reader can step to the next match. On phones it stays
    // closed so the lesson is not pushed down; tapping the box shows it again.
    if(qv)boxes.forEach(function(b){b._ls.set(qv,window.matchMedia('(min-width:901px)').matches);});
    bar.querySelector('button').addEventListener('click',function(){
      main.querySelectorAll('mark.hl').forEach(function(m){m.parentNode.replaceChild(document.createTextNode(m.textContent),m);});main.normalize();bar.remove();
      boxes.forEach(function(b){b._ls.set('',false);});});
    var cr=main.querySelector('.crumbs');if(cr)cr.parentNode.insertBefore(bar,cr.nextSibling);else main.insertBefore(bar,main.firstChild);
    p.delete('hl');p.delete('q');var rest=p.toString();
    try{history.replaceState(history.state,'',location.pathname+(rest?'?'+rest:'')+location.hash);}catch(e){}
    var tgt=location.hash&&document.getElementById(decodeURIComponent(location.hash.slice(1))),first=main.querySelector('mark.hl');
    if(tgt)tgt.scrollIntoView();else if(first)first.scrollIntoView({block:'center'});
  })();

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
