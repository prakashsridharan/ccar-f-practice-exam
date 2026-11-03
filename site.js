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

  var q=document.querySelector('.cl-q');
  if(q)q.addEventListener('input',function(){
    var t=q.value.trim().toLowerCase();
    document.querySelectorAll('.cert-row[data-q]').forEach(function(r){r.hidden=!!t&&r.getAttribute('data-q').indexOf(t)<0;});
  });
})();
