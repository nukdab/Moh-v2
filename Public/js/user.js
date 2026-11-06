/* Customer panel (/user/...) */
(function () {
  var M = MH, $ = M.$, $$ = M.$$, fa = M.fa, esc = M.esc, toast = M.toast, api = M.api, badge = M.badge;
  var BASE = '/user', ME = null, cases = [], notices = [], fs = 'همه', ft = 'همه', q = '';

  function setUnread() { var n = notices.filter(function (x) { return !x.is_read; }).length; $('#nbadge').textContent = fa(n); $('#nbadge').hidden = !n; return n; }
  function loadCases() { return api('GET', '/api/cases').then(function (d) { cases = d.cases; return cases; }); }
  function loadNotices() { return api('GET', '/api/notices').then(function (d) { notices = d.notices; setUnread(); return notices; }); }

  function dash() {
    Promise.all([loadCases(), loadNotices()]).then(function () {
      var cnt = function (s) { return cases.filter(function (x) { return x.status === s; }).length; };
      $('#stats').innerHTML = [['کل شکایات', cases.length, 'complaints'], ['در حال بررسی', cnt('در حال بررسی') + cnt('جدید'), 'complaints'], ['مختومه', cnt('مختومه'), 'complaints'], ['ابلاغیه‌های جدید', setUnread(), 'notices']]
        .map(function (a) { return '<a class="stat" href="' + BASE + '/' + a[2] + '"><span>' + a[0] + '</span><b>' + fa(a[1]) + '</b></a>'; }).join('');
      $('#recent').innerHTML = cases.length ? cases.slice(0, 5).map(function (x) { return '<tr><td><a class="code" href="' + BASE + '/complaints/' + x.id + '">' + esc(fa(x.code)) + '</a></td><td>' + esc(x.title) + '</td><td>' + M.fd(x.created_at) + '</td><td>' + badge(x.status) + '</td></tr>'; }).join('')
        : '<tr><td colspan="4" class="empty">هنوز شکایتی ثبت نکرده‌اید.</td></tr>';
    }).catch(function (e) { toast(e.message); });
  }

  function drawList() {
    M.chips($('#fst'), ['همه', 'جدید', 'در حال بررسی', 'ابلاغ شده', 'مختومه'], function () { return fs; }, function (v) { fs = v; drawList(); });
    M.chips($('#ftype'), ['همه', 'حقوقی', 'کیفری'], function () { return ft; }, function (v) { ft = v; drawList(); });
    var rows = cases.filter(function (x) { return (fs === 'همه' || x.status === fs) && (ft === 'همه' || x.type === ft) && (!q || (x.title + x.code).indexOf(q) > -1); });
    $('#all').innerHTML = rows.length ? rows.map(function (x) { return '<tr><td><span class="code">' + esc(fa(x.code)) + '</span></td><td>' + esc(x.title) + '</td><td>' + x.type + '</td><td>' + M.fd(x.created_at) + '</td><td>' + badge(x.status) + '</td><td><a class="btn sm" href="' + BASE + '/complaints/' + x.id + '">مشاهده</a></td></tr>'; }).join('')
      : '<tr><td colspan="6" class="empty">شکایتی با این فیلتر پیدا نشد.</td></tr>';
  }
  $('#q').oninput = function (e) { q = e.target.value.trim(); drawList(); };
  function list() { loadCases().then(drawList).catch(function (e) { toast(e.message); }); }

  var curCase = null;
  function showCase(id) {
    api('GET', '/api/cases/' + id).then(function (d) {
      var c = curCase = d.case;
      $('#c-title').textContent = c.title;
      $('#c-meta').innerHTML = '<div><small>کد رهگیری</small><b class="code">' + esc(fa(c.code)) + '</b></div><div><small>نوع پرونده</small><span class="st mint">پرونده ' + c.type + '</span></div><div><small>وضعیت</small>' + badge(c.status) + '</div><div><small>تاریخ ثبت</small><b>' + M.fd(c.created_at) + '</b></div>';
      $('#c-tl').innerHTML = d.events.map(function (e) { return '<li class="done"><b>' + esc(e.text) + '</b><small>' + M.fd(e.created_at) + ' · ' + M.ft(e.created_at) + '</small></li>'; }).join('');
      $('#c-note').textContent = c.note || (c.status === 'مختومه' ? '' : 'پرونده در صف بررسی است. توضیحات کارشناس پس از بررسی در این بخش نمایش داده می‌شود.');
      $('#c-docs').innerHTML = d.files.length ? d.files.map(function (f) { return '<a class="chip" href="/api/files/' + f.id + '" download>' + esc(f.name) + '</a>'; }).join('') : '<span class="empty">مدرکی پیوست نشده است.</span>';
      $('#c-sig').innerHTML = c.signature ? '<img alt="امضای ثبت‌شده" src="' + c.signature + '" style="display:block;max-width:100%;height:auto;max-height:90px">' : '—';
      var closed = c.status === 'مختومه';
      $('#cert').disabled = !closed; $('#cert').style.opacity = closed ? 1 : .5;
      $('#c-notices').innerHTML = d.notices.length ? d.notices.map(function (n) { return '<li><b>' + esc(n.title) + '</b><small>' + esc(fa(n.no)) + ' · ' + M.fd(n.created_at) + '</small></li>'; }).join('') : '';
    }).catch(function (e) { toast(e.message); router.go(BASE + '/complaints', true); });
  }
  $('#cert').onclick = function () { if (curCase && curCase.status === 'مختومه') location.href = '/api/cases/' + curCase.id + '/certificate'; };
  $('#c-file').onchange = function (e) {
    var fl = []; M.addFileChecks(fl, e.target.files, toast); e.target.value = '';
    if (!fl.length || !curCase) return;
    M.uploadFiles(curCase.id, fl).then(function (failed) { toast(failed.length ? failed[0] : 'مدرک اضافه شد.'); showCase(curCase.id); });
  };

  var selN = 0;
  function drawNotices(sel) {
    selN = sel;
    $('#nlist').innerHTML = notices.length ? notices.map(function (n, i) { return '<li><button type="button" data-i="' + i + '" aria-pressed="' + (i === sel) + '"><span class="t">' + (n.is_read ? '' : '<i title="خوانده‌نشده"></i>') + esc(n.title) + '</span><small>شماره ' + esc(fa(n.no)) + ' · ' + M.fd(n.created_at) + '</small></button></li>'; }).join('') : '<li class="empty">هنوز ابلاغیه‌ای برای شما صادر نشده است.</li>';
    var n = notices[sel];
    $('#npaper').innerHTML = n ? '<h3>' + esc(n.title) + '</h3><small>شماره ابلاغیه: ' + esc(fa(n.no)) + ' · تاریخ: ' + M.fd(n.created_at) + (n.code ? ' · پرونده ' + esc(fa(n.code)) : '') + '</small><p>' + esc(n.body) + '</p><p style="margin-top:18px">سازمان مدیریت منزل</p>' : '<p class="empty">ابلاغیه‌ای برای نمایش نیست.</p>';
    $$('#nlist button').forEach(function (b) {
      b.onclick = function () {
        var i = +b.dataset.i, x = notices[i];
        if (!x.is_read) { x.is_read = 1; api('POST', '/api/notices/' + x.id + '/read').catch(function () { }); setUnread(); }
        drawNotices(i);
      };
    });
  }
  function showNotices() { loadNotices().then(function () { drawNotices(0); }).catch(function (e) { toast(e.message); }); }

  function fillProfile() {
    $('#who-name').textContent = ME.fn + ' ' + ME.ln; $('#who-mobile').textContent = fa(ME.mobile); $('#av').textContent = ME.fn.charAt(0);
    $('#p1').value = ME.fn; $('#p1b').value = ME.ln; $('#p2').value = fa(ME.mobile); $('#p3').value = fa(ME.nid); $('#p4').value = fa(ME.bd);
    $('#h-name').textContent = ME.fn + ' ' + ME.ln;
  }
  $('#pf').onsubmit = function (e) {
    e.preventDefault();
    api('PATCH', '/api/me', { fn: $('#p1').value, ln: $('#p1b').value }).then(function (d) { ME = d.user; fillProfile(); toast('تغییرات ذخیره شد.'); }).catch(function (er) { toast(er.message); });
  };
  $('#pw').onsubmit = function (e) {
    e.preventDefault();
    if (!$('#w2').value || $('#w2').value !== $('#w3').value) { toast('رمز جدید و تکرار آن یکسان نیست.'); return; }
    api('POST', '/api/me/password', { old: $('#w1').value, new: $('#w2').value }).then(function () { toast('رمز عبور تغییر کرد.'); $('#pw').reset(); }).catch(function (er) { toast(er.message); });
  };

  var router = M.router(BASE, [[/^$/, 'dashboard'], [/^complaints$/, 'complaints'], [/^complaints\/(\d+)$/, 'case'], [/^new$/, 'new'], [/^new\/docs$/, 'new-docs'], [/^notices$/, 'notices'], [/^profile$/, 'profile'], [/^logout$/, 'logout']], {
    dashboard: dash, complaints: list, case: showCase, notices: showNotices,
    'new-docs': function () { if (!wiz.hasDraft()) { router.go(BASE + '/new', true); return false; } setTimeout(wiz.fit, 30); },
    logout: function () { M.logout(); return false; },
  }, { case: 'complaints', 'new-docs': 'new' });
  var wiz = M.wizard(BASE, { go: function (p, r) { router.go(p, r); } });

  api('GET', '/api/me').then(function (d) { ME = d.user; if (ME.role === 'admin') { location.href = '/manager'; return; } fillProfile(); router.run(); });
})();
