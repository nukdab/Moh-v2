/* Manager panel (/manager/...) */
(function () {
  var M = MH, $ = M.$, $$ = M.$$, fa = M.fa, esc = M.esc, toast = M.toast, api = M.api, badge = M.badge;
  var BASE = '/manager', ME = null, fs = 'همه', ft = 'همه', fb = 'همه', q = '', curId = null, qt = null;

  function stats() {
    return api('GET', '/api/admin/stats').then(function (d) {
      var s = d.stats;
      $('#stats').innerHTML = ['جدید', 'در حال بررسی', 'ابلاغ شده', 'مختومه'].map(function (k) { return '<a class="stat" href="' + BASE + '/complaints" data-st="' + k + '"><span>' + (k === 'جدید' ? 'شکایت جدید' : k) + '</span><b>' + fa(s[k]) + '</b></a>'; }).join('');
      $$('#stats .stat').forEach(function (a) { a.addEventListener('click', function () { fs = a.dataset.st; }); });
      $('#nbadge').textContent = fa(s['جدید']); $('#nbadge').hidden = !s['جدید'];
      $('#fbadge').textContent = fa(d.feedback_unread); $('#fbadge').hidden = !d.feedback_unread;
    });
  }
  function dash() {
    stats().catch(function (e) { toast(e.message); });
    api('GET', '/api/cases?status=' + encodeURIComponent('جدید')).then(function (a) {
      return api('GET', '/api/cases?status=' + encodeURIComponent('در حال بررسی')).then(function (b) { return a.cases.concat(b.cases); });
    }).then(function (t) {
      $('#todo').innerHTML = t.length ? t.map(function (c) { return '<tr><td><span class="code">' + esc(fa(c.code)) + '</span></td><td>' + esc(c.fn + ' ' + c.ln) + '</td><td>' + esc(c.title) + '</td><td>' + c.type + '</td><td>' + badge(c.status) + '</td><td><a class="btn sm" href="' + BASE + '/complaints/' + c.id + '">بررسی</a></td></tr>'; }).join('') : '<tr><td colspan="6" class="empty">پرونده‌ی بازی وجود ندارد.</td></tr>';
    }).catch(function (e) { toast(e.message); });
    $('#today').textContent = M.fd(Date.now());
  }

  function list() {
    M.chips($('#fst'), ['همه', 'جدید', 'در حال بررسی', 'ابلاغ شده', 'مختومه'], function () { return fs; }, function (v) { fs = v; list(); });
    M.chips($('#ftype'), ['همه', 'حقوقی', 'کیفری'], function () { return ft; }, function (v) { ft = v; list(); });
    M.chips($('#fby'), ['همه', 'مشتریان', 'مدیر'], function () { return fb; }, function (v) { fb = v; list(); });
    var p = [];
    if (fs !== 'همه') p.push('status=' + encodeURIComponent(fs));
    if (ft !== 'همه') p.push('type=' + encodeURIComponent(ft));
    if (fb !== 'همه') p.push('by=' + (fb === 'مدیر' ? 'admin' : 'customers'));
    if (q) p.push('q=' + encodeURIComponent(q));
    api('GET', '/api/cases' + (p.length ? '?' + p.join('&') : '')).then(function (d) {
      $('#all').innerHTML = d.cases.length ? d.cases.map(function (c) { return '<tr><td><span class="code">' + esc(fa(c.code)) + '</span></td><td>' + esc(c.fn + ' ' + c.ln) + '</td><td>' + esc(c.title) + '</td><td>' + c.type + '</td><td>' + M.fd(c.created_at) + '</td><td>' + badge(c.status) + '</td><td><a class="btn sm" href="' + BASE + '/complaints/' + c.id + '">بررسی</a></td></tr>'; }).join('') : '<tr><td colspan="7" class="empty">شکایتی با این فیلتر پیدا نشد.</td></tr>';
    }).catch(function (e) { toast(e.message); });
  }
  $('#q').oninput = function (e) { q = e.target.value.trim(); clearTimeout(qt); qt = setTimeout(list, 250); };

  function showCase(id) {
    curId = +id;
    api('GET', '/api/cases/' + id).then(function (d) {
      var c = d.case, u = c.complainant;
      $('#c-title').textContent = c.title;
      $('#c-meta').innerHTML = '<div><small>کد رهگیری</small><b class="code">' + esc(fa(c.code)) + '</b></div><div><small>نوع پرونده</small><span class="st mint">پرونده ' + c.type + '</span></div><div><small>وضعیت</small>' + badge(c.status) + '</div><div><small>تاریخ ثبت</small><b>' + M.fd(c.created_at) + '</b></div>';
      $('#c-kv').innerHTML = '<div><dt>شاکی</dt><dd>' + esc(u.fn + ' ' + u.ln) + (c.by_admin ? ' <span class="role">مدیر</span>' : '') + '</dd></div><div><dt>شماره همراه</dt><dd>' + esc(fa(u.mobile)) + '</dd></div><div><dt>کد ملی شاکی</dt><dd>' + esc(fa(u.nid)) + '</dd></div><div><dt>متهم / خوانده</dt><dd>' + esc(c.defendant) + '</dd></div>' + (c.defendant_phone ? '<div><dt>شماره متهم</dt><dd>' + esc(fa(c.defendant_phone)) + '</dd></div>' : '') + (c.incident_date ? '<div><dt>تاریخ وقوع</dt><dd>' + esc(fa(c.incident_date)) + '</dd></div>' : '');
      $('#c-desc').textContent = c.description || '—';
      var docs = d.files.filter(function (f) { return !f.by_admin; }), adm = d.files.filter(function (f) { return f.by_admin; });
      $('#c-docs').innerHTML = docs.length ? docs.map(function (f) { return '<a class="chip" href="/api/files/' + f.id + '" download>' + esc(f.name) + '</a>'; }).join('') : '<span class="empty">مدرکی پیوست نشده است.</span>';
      $('#c-sig').innerHTML = c.signature ? '<img alt="امضای شاکی" src="' + c.signature + '" style="display:block;max-width:100%;height:auto;max-height:90px">' : '—';
      $('#c-tl').innerHTML = d.events.map(function (e) { return '<li class="done"><b>' + esc(e.text) + '</b><small>' + M.fd(e.created_at) + ' · ' + M.ft(e.created_at) + '</small></li>'; }).join('');
      $('#s-st').value = c.status; $('#s-note').value = c.note;
      $('#c-notices').innerHTML = d.notices.map(function (n) { return '<li><b>' + esc(n.title) + '</b><small>' + esc(fa(n.no)) + ' · ' + M.fd(n.created_at) + '</small></li>'; }).join('');
      $('#a-files').innerHTML = adm.map(function (f) { return '<li><a href="/api/files/' + f.id + '" download>' + esc(f.name) + '</a><button type="button" data-id="' + f.id + '" aria-label="حذف">×</button></li>'; }).join('');
      $$('#a-files button').forEach(function (b) { b.onclick = function () { api('DELETE', '/api/files/' + b.dataset.id).then(function () { toast('مدرک حذف شد.'); showCase(curId); }).catch(function (e) { toast(e.message); }); }; });
      $('#cert').hidden = c.status !== 'مختومه'; $('#cert').href = '/api/cases/' + c.id + '/certificate';
    }).catch(function (e) { toast(e.message); router.go(BASE + '/complaints', true); });
  }
  $('#stform').onsubmit = function (e) {
    e.preventDefault();
    var st = $('#s-st').value, note = $('#s-note').value.trim();
    if (st === 'مختومه' && !note) { toast('برای مختومه کردن، توضیحات را بنویسید.'); return; }
    api('POST', '/api/cases/' + curId + '/status', { status: st, note: note }).then(function () { toast('وضعیت و توضیحات ثبت شد.'); showCase(curId); }).catch(function (er) { toast(er.message); });
  };
  $('#ntform').onsubmit = function (e) {
    e.preventDefault();
    var t = $('#n-t').value.trim(), b = $('#n-b').value.trim();
    if (!t || !b) { toast('عنوان و متن ابلاغیه را بنویسید.'); return; }
    api('POST', '/api/cases/' + curId + '/notice', { title: t, body: b }).then(function () { $('#n-t').value = ''; $('#n-b').value = ''; toast('ابلاغیه برای شاکی ارسال شد.'); showCase(curId); }).catch(function (er) { toast(er.message); });
  };
  $('#a-file').onchange = function (e) {
    var fl = []; M.addFileChecks(fl, e.target.files, toast); e.target.value = '';
    if (!fl.length) return;
    M.uploadFiles(curId, fl).then(function (failed) { toast(failed.length ? failed[0] : 'مدرک به پرونده اضافه شد.'); showCase(curId); });
  };

  function notices() {
    api('GET', '/api/admin/notices').then(function (d) {
      var N = d.notices;
      function draw(sel) {
        $('#nlist').innerHTML = N.length ? N.map(function (n, i) { return '<li><button type="button" data-i="' + i + '" aria-pressed="' + (i === sel) + '"><span class="t">' + esc(n.title) + '</span><small>پرونده ' + esc(fa(n.code || '—')) + ' · ' + M.fd(n.created_at) + '</small></button></li>'; }).join('') : '<li class="empty">هنوز ابلاغیه‌ای صادر نشده است.</li>';
        var n = N[sel];
        $('#npaper').innerHTML = n ? '<h3>' + esc(n.title) + '</h3><small>برای: ' + esc(n.fn + ' ' + n.ln) + ' · شماره ' + esc(fa(n.no)) + ' · ' + M.fd(n.created_at) + '</small><p>' + esc(n.body) + '</p><p style="margin-top:18px">سازمان مدیریت منزل</p>' : '<p class="empty">ابلاغیه‌ای برای نمایش نیست.</p>';
        $$('#nlist button').forEach(function (b) { b.onclick = function () { draw(+b.dataset.i); }; });
      }
      draw(0);
    }).catch(function (e) { toast(e.message); });
  }
  function logPage() {
    api('GET', '/api/admin/log').then(function (d) {
      $('#logl').innerHTML = d.log.length ? d.log.map(function (l) { return '<li><time>' + M.fd(l.created_at) + ' · ' + M.ft(l.created_at) + '</time><span>' + esc(l.text) + '</span></li>'; }).join('') : '<li class="empty">هنوز اقدامی ثبت نشده است.</li>';
    }).catch(function (e) { toast(e.message); });
  }
  function feedback() {
    api('GET', '/api/admin/feedback').then(function (d) {
      $('#fbl').innerHTML = d.feedback.length ? d.feedback.map(function (f) { return '<li class="' + (f.is_read ? '' : 'unread') + '"><time>' + M.fd(f.created_at) + ' · ' + M.ft(f.created_at) + '</time><b>' + esc(f.name) + '</b>' + (f.contact ? ' <small>(' + esc(f.contact) + ')</small>' : '') + '<p style="margin:4px 0 0;flex-basis:100%">' + esc(f.message) + '</p>' + (f.is_read ? '' : '<button class="btn sm alt" type="button" data-id="' + f.id + '">علامت‌گذاری به‌عنوان خوانده‌شده</button>') + '</li>'; }).join('') : '<li class="empty">پیامی وجود ندارد.</li>';
      $$('#fbl button').forEach(function (b) { b.onclick = function () { api('POST', '/api/admin/feedback/' + b.dataset.id + '/read').then(function () { feedback(); stats(); }); }; });
    }).catch(function (e) { toast(e.message); });
  }

  var router = M.router(BASE, [[/^$/, 'dashboard'], [/^complaints$/, 'complaints'], [/^complaints\/(\d+)$/, 'case'], [/^new$/, 'new'], [/^new\/docs$/, 'new-docs'], [/^notices$/, 'notices'], [/^log$/, 'log'], [/^feedback$/, 'feedback'], [/^logout$/, 'logout']], {
    dashboard: dash, complaints: list, case: showCase, notices: notices, log: logPage, feedback: feedback,
    'new-docs': function () { if (!wiz.hasDraft()) { router.go(BASE + '/new', true); return false; } setTimeout(wiz.fit, 30); },
    logout: function () { M.logout(); return false; },
  }, { case: 'complaints', 'new-docs': 'new' });
  var wiz = M.wizard(BASE, { go: function (p, r) { router.go(p, r); } });

  api('GET', '/api/me').then(function (d) { ME = d.user; if (ME.role !== 'admin') { location.href = '/user'; return; } $('#who-name').textContent = ME.fn + ' ' + ME.ln; $('#av').textContent = ME.fn.charAt(0); router.run(); stats().catch(function () { }); });
})();
