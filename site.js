// Site chrome behaviour on every page. The header menu is a <details>, so it works without
// this file; here it closes on Escape, on an outside click and when another menu opens.
// Also: the certification search box, shown only once the list is long (tools/site-nav.js).
(function(){
  'use strict';
  document.documentElement.classList.add('js');
  var menus=[].slice.call(document.querySelectorAll('.sh-m'));
  function closeAll(except){menus.forEach(function(m){if(m!==except)m.removeAttribute('open');});}
  menus.forEach(function(m){m.addEventListener('toggle',function(){if(m.open)closeAll(m);});});
  document.addEventListener('click',function(e){if(!e.target.closest||!e.target.closest('.sh-m'))closeAll();});
  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape')return;
    var open=menus.filter(function(m){return m.open;})[0];
    if(open){closeAll();var s=open.querySelector('summary');if(s)s.focus();}
  });
  // Slim title bar: once the page's blue banner (.hdr with an h1) has scrolled up under the
  // sticky header, a one-line copy of its title stays pinned below the header (and the exam
  // tabs). The banner itself never changes size, so the page cannot jump. The exam app
  // re-renders its banner, so the current one is looked up on every check.
  var mini=document.createElement('div');mini.className='hdr-mini';mini.setAttribute('aria-hidden','true');
  var inner=document.createElement('div');inner.className='hm-in';mini.appendChild(inner);document.body.appendChild(mini);
  var ticking=false;
  function check(){
    ticking=false;
    var h=document.querySelector('.hdr'),t=h&&h.querySelector('h1'),bar=document.querySelector('.xt')||document.querySelector('.sh');
    var show=!!(t&&bar&&h.getBoundingClientRect().bottom<=bar.getBoundingClientRect().bottom+1);
    if(show){var txt=t.textContent;if(inner.textContent!==txt)inner.textContent=txt;mini.style.top=bar.getBoundingClientRect().bottom+'px';}
    mini.classList.toggle('on',show);
  }
  function req(){if(!ticking){ticking=true;requestAnimationFrame(check);}}
  window.addEventListener('scroll',req,{passive:true});window.addEventListener('resize',req);
  // The exam app swaps views without scrolling events (Back/Forward, tab clicks).
  window.addEventListener('hashchange',function(){setTimeout(check,0);});
  check();

  // Visit counting for the pages that have no tracker of their own (home, vendor, Resources).
  // Exam pages (app.js, #app) and guide pages (learn.js, body[data-prefix]) count their own
  // visits, so they are skipped here. Same table, fields and utm handling as learn.js.
  if(!document.getElementById('app')&&!(document.body.hasAttribute&&document.body.hasAttribute('data-prefix'))&&window.fetch&&window.URLSearchParams)(function(){
    var U='https://vuzdypmlfpeslsfezapd.supabase.co/rest/v1/visits',
      K='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1emR5cG1sZnBlc2xzZmV6YXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNjYyNDcsImV4cCI6MjEwMzk0MjI0N30.UGbcFwFLeKnTITJLQm8QO4YPn1hDhWe8ptz1-QJ19ik';
    if(location.hash==='#admin')return;// the owner checking stats is not a visit
    var p=new URLSearchParams(location.search),ref='';
    try{var h=document.referrer&&new URL(document.referrer).hostname;if(h&&h!==location.hostname)ref=h.slice(0,80);}catch(e){}
    var page=location.pathname==='/'?'hub':location.pathname.replace(/^\/|\/$/g,'').slice(0,40);
    var full={page:page,ua:navigator.userAgent.substring(0,200),path:location.pathname.slice(0,200),
      src:(p.get('utm_source')||'').slice(0,40),campaign:(p.get('utm_campaign')||'').slice(0,60),ref:ref};
    var tags=[];p.forEach(function(v,k){if(k.indexOf('utm_')===0)tags.push(k);});
    if(tags.length){tags.forEach(function(k){p.delete(k);});var s=p.toString();
      try{history.replaceState(history.state,'',location.pathname+(s?'?'+s:'')+location.hash);}catch(e){}}
    fetch(U,{method:'POST',headers:{apikey:K,Authorization:'Bearer '+K,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(full)}).catch(function(){});
  })();

  // Account (header "Sign in"): account.js and the sign-in library load only when they are
  // needed: a saved session, a return from Google or an email link (?code=, error=), or a click.
  // window.cpSync(key) is how app.js and learn.js report a saved change; it is a no-op until an
  // account is signed in, and account.js reads the browser's copy at its first sync anyway.
  (function(){
    var box=document.querySelector('.sh-acct'),btn=box&&box.querySelector('.sh-in-btn');
    window.cpSync=function(k){if(window.CPAccount)window.CPAccount.changed(k);};
    // Launch switch: until the Google, email and database setup is done, sign-in shows only in a
    // browser that opened a page with ?auth=preview (remembered; ?auth=off forgets it).
    var AUTH_LIVE=true,pv=false;
    try{if(/[?&]auth=preview/.test(location.search))localStorage.setItem('cp-auth-preview','1');
      if(/[?&]auth=off/.test(location.search))localStorage.removeItem('cp-auth-preview');pv=localStorage.getItem('cp-auth-preview')==='1';}catch(e){}
    var me=document.querySelector('script[src*="/site.js"]'),v=(String(me&&me.getAttribute('src')||'').split('?v=')[1]||''),loading=null;
    function load(){
      if(window.CPAccount)return Promise.resolve();
      return loading||(loading=new Promise(function(res,rej){var s=document.createElement('script');s.src='/account.js?v='+v;
        s.onload=res;s.onerror=function(){loading=null;rej();};document.head.appendChild(s);}));
    }
    // For the admin panels: is the signed-in account an admin (see CPAccount.admin), and open sign-in.
    window.cpAdmin=function(){return load().then(function(){return window.CPAccount.admin();});};
    window.cpSignIn=function(){load().then(function(){window.CPAccount.click();}).catch(function(){});};
    // Private preview (site.json "preview", see tools/site-nav.js previewHead): the page starts hidden
    // and is shown only to a signed-in admin; anyone else sees a cover with a Sign in button.
    // This is a client-side gate for unlisted pages, not access control: the files are public.
    if(document.querySelector('meta[name="cp-preview"]')){
      var cover=function(msg,signin){
        var d=document.getElementById('cp-pvg');
        if(!d){d=document.createElement('div');d.id='cp-pvg';
          d.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#f4f7fb;display:flex;align-items:center;justify-content:center;padding:24px;font:16px Inter,system-ui,sans-serif;color:#1A2E45;text-align:center';
          document.body.appendChild(d);}
        d.innerHTML='<div style="max-width:440px"><h1 style="font-size:1.4rem;margin:0 0 .6rem">Private preview</h1><p style="margin:0 0 1.1rem;line-height:1.5">'+msg+'</p>'+
          (signin?'<p><button type="button" id="cp-pvb" style="font:600 15px Inter,system-ui,sans-serif;background:#1B4F8A;color:#fff;border:0;border-radius:8px;padding:10px 22px;cursor:pointer">Sign in</button></p>':'')+
          '<p style="margin-top:1rem"><a href="/" style="color:#1B4F8A">Back to CertPrep</a></p></div>';
        var b=document.getElementById('cp-pvb');if(b)b.onclick=function(){window.cpSignIn();};
        var st=document.getElementById('cp-pv');if(st)st.remove();};
      var gate=function(){window.cpAdmin().then(function(a){
          if(a.state==='admin'){var g=document.getElementById('cp-pvg');if(g)g.remove();var st=document.getElementById('cp-pv');if(st)st.remove();}
          else cover(a.state==='signin'?'This page is not published yet. Sign in with an admin account to view it.':'This page is not published yet.',a.state==='signin');
        }).catch(function(){cover('This page is not published yet.',false);});};
      gate();window.addEventListener('cp-auth',gate);
    }
    if(!btn||!(AUTH_LIVE||pv))return;
    btn.hidden=false;
    btn.addEventListener('click',function(){load().then(function(){window.CPAccount.click();}).catch(function(){});});
    var has=false;try{has=!!localStorage.getItem('sb-vuzdypmlfpeslsfezapd-auth-token');}catch(e){}
    if(has||/[?&](code|error_description)=/.test(location.search)||/error_description=/.test(location.hash))
      load().then(function(){window.CPAccount.init();}).catch(function(){});
  })();

  // Feedback (every page): a small fixed button, plus any [data-fb] element such as the footer's
  // "Send feedback". /feedback.js (the form) loads on the first click only.
  (function(){
    var me=document.querySelector('script[src*="/site.js"]'),v=(String(me&&me.getAttribute('src')||'').split('?v=')[1]||''),loading=null;
    function open(){
      if(window.CPFeedback){window.CPFeedback.open();return;}
      if(loading)return;
      loading=true;var s=document.createElement('script');s.src='/feedback.js?v='+v;
      s.onload=function(){loading=null;if(window.CPFeedback)window.CPFeedback.open();};
      s.onerror=function(){loading=null;location.href='mailto:contact@pratechlabs.com?subject='+encodeURIComponent('CertPrep feedback: '+location.pathname);};
      document.head.appendChild(s);
    }
    var b=document.createElement('button');b.type='button';b.className='fb-tab';b.setAttribute('aria-label','Send feedback');
    b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z"/></svg><span>Feedback</span>';
    b.addEventListener('click',open);document.body.appendChild(b);
    document.addEventListener('click',function(e){var t=e.target&&e.target.closest&&e.target.closest('[data-fb]');if(t){e.preventDefault();closeAll();open();}});
  })();

  // A guide shared by two versions (CCAR-P v1 and v2): remember which version the reader is
  // using, so the guide's practice-test links go back to it (learn.js reads 'cp-for:<guide>').
  // Saved when a version's exam page opens (its tab bar carries data-for) and when a link with
  // data-for is followed from a menu or a certification card.
  function setFor(a){var v=(a&&a.getAttribute('data-for')||'').split(' ');if(v[1])try{localStorage.setItem('cp-for:'+v[0],v[1]);}catch(e){}}
  setFor(document.querySelector('.xt a[data-for]'));
  ['click','auxclick'].forEach(function(t){document.addEventListener(t,function(e){setFor(e.target&&e.target.closest&&e.target.closest('a[data-for]'));});});

  var q=document.querySelector('.cl-q');
  if(q)q.addEventListener('input',function(){
    var t=q.value.trim().toLowerCase();
    document.querySelectorAll('.cert-row[data-q]').forEach(function(r){r.hidden=!!t&&r.getAttribute('data-q').indexOf(t)<0;});
  });
})();
