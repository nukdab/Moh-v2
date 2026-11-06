/* Client-side privacy hardening. Browsers cannot truly block OS screenshots; this hides content on every signal the page can see. */
(function(){
  var sh=document.createElement('div');sh.id='secShield';sh.setAttribute('aria-hidden','true');
  var lg=document.querySelector('.logo');
  sh.innerHTML=(lg?'<div><img alt="" src="'+lg.src+'"><br>':'<div>')+'سازمان مدیریت منزل<br><small style="font-weight:500;opacity:.7">محتوا برای حفظ حریم خصوصی پنهان شد</small></div>';
  document.documentElement.appendChild(sh);
  function hide(){sh.classList.add('on')}
  function show(){if(document.visibilityState==='visible'&&document.hasFocus())sh.classList.remove('on')}
  document.addEventListener('visibilitychange',function(){document.visibilityState==='hidden'?hide():show()});
  window.addEventListener('blur',hide);window.addEventListener('focus',show);
  window.addEventListener('pagehide',hide);window.addEventListener('pageshow',show);
  document.addEventListener('keydown',function(e){
    var k=(e.key||'').toLowerCase(),m=e.ctrlKey||e.metaKey;
    if(k==='printscreen'||k==='snapshot'||(e.metaKey&&e.shiftKey&&/^[345]$/.test(k))||(m&&['p','s'].indexOf(k)>-1)||k==='f12'||(m&&e.shiftKey&&['i','j','c','s'].indexOf(k)>-1)||(m&&k==='u')){
      e.preventDefault();hide();try{navigator.clipboard.writeText(' ')}catch(x){}setTimeout(show,1800)}
  },true);
  document.addEventListener('keyup',function(e){if((e.key||'').toLowerCase()==='printscreen'){try{navigator.clipboard.writeText(' ')}catch(x){}hide();setTimeout(show,1800)}});
  ['contextmenu','dragstart','selectstart'].forEach(function(t){document.addEventListener(t,function(e){var n=e.target;if(t==='selectstart'&&n&&n.closest&&n.closest('input,textarea'))return;e.preventDefault()})});
  ['copy','cut','paste'].forEach(function(t){document.addEventListener(t,function(e){var n=e.target;if(t==='copy'||t==='cut'||(n&&n.type==='password'))e.preventDefault()},true)});
  document.addEventListener('beforeinput',function(e){if(e.target&&e.target.type==='password'&&/paste|drop/i.test(e.inputType||''))e.preventDefault()},true);
  function hardenPw(r){(r||document).querySelectorAll('input[type=password]').forEach(function(i){i.setAttribute('autocomplete','new-password');i.setAttribute('autocapitalize','off');i.setAttribute('spellcheck','false');i.setAttribute('data-lpignore','true')})}
  hardenPw();new MutationObserver(function(){hardenPw()}).observe(document.documentElement,{childList:true,subtree:true});
  if(window.top!==window.self){/* embedded preview: keep working */}
})();
