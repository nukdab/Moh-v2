/* /info/rules | /info/about | /info/contact */
(function () {
  var M = MH, $ = M.$, $$ = M.$$;
  var T = { rules: 'قوانین', about: 'درباره', contact: 'ارتباط' };
  function show() {
    var p = location.pathname.replace(/\/+$/, '').split('/')[2];
    if (!T[p]) { history.replaceState(null, '', '/info/rules'); p = 'rules'; }
    $$('[data-view]').forEach(function (s) { s.hidden = s.dataset.view !== p; });
    $$('.topnav a').forEach(function (a) { if (a.getAttribute('href') === '/info/' + p) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    window.scrollTo(0, 0);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="/info/"]');
    if (!a || e.ctrlKey || e.metaKey || e.button) return;
    e.preventDefault(); history.pushState(null, '', a.getAttribute('href')); show();
  });
  window.addEventListener('popstate', show);
  show();
  var f = $('#fbform');
  if (f) f.onsubmit = function (e) {
    e.preventDefault();
    M.api('POST', '/api/feedback', { name: $('#fb-n').value, contact: $('#fb-c').value, message: $('#fb-m').value }).then(function () { f.reset(); M.toast('پیام شما ارسال شد. سپاسگزاریم.'); }).catch(function (er) { M.toast(er.message); });
  };
})();
