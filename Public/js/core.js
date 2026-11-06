/* Shared helpers for all pages: API client, formatting, toast, theme, path router, new-complaint wizard. */
(function () {
  var FA = '۰۱۲۳۴۵۶۷۸۹';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function fa(n) { return String(n).replace(/\d/g, function (d) { return FA[d]; }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m) {
    var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = m;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3200);
  }
  var dfmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' });
  var tfmt = new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit' });
  function fd(ts) { return dfmt.format(new Date(ts)); }
  function ft(ts) { return tfmt.format(new Date(ts)); }

  function api(method, path, body, raw) {
    var opt = { method: method, credentials: 'same-origin', headers: { 'X-Requested-With': 'fetch' } };
    if (raw) { opt.body = raw.body; opt.headers['Content-Type'] = raw.type || 'application/octet-stream'; }
    else if (body !== undefined) { opt.body = JSON.stringify(body); opt.headers['Content-Type'] = 'application/json'; }
    return fetch(path, opt).then(function (r) {
      var ct = r.headers.get('Content-Type') || '';
      return (ct.indexOf('json') > -1 ? r.json() : Promise.resolve({})).then(function (d) {
        if (r.status === 401 && path.indexOf('/api/auth/') !== 0) { location.href = '/log-in'; throw new Error('unauthorized'); }
        if (!r.ok) { var e = new Error(d.error || 'خطایی رخ داد؛ دوباره تلاش کنید.'); e.status = r.status; throw e; }
        return d;
      });
    }, function () { throw new Error('ارتباط با سرور برقرار نشد.'); });
  }

  /* theme */
  function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem('mh-theme', t); } catch (e) { } }
  var th = $('#theme');
  if (th) th.onclick = function () {
    var c = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
    applyTheme(c === 'dark' ? 'light' : 'dark');
  };

  function statusClass(s) { return s === 'مختومه' ? 'green' : s === 'ابلاغ شده' ? 'mint' : s === 'جدید' ? 'amber' : 'blue'; }
  function badge(s) { return '<span class="st ' + statusClass(s) + '">' + esc(s) + '</span>'; }

  function logout() { return api('POST', '/api/auth/logout').then(function () { location.href = '/log-in'; }, function () { location.href = '/log-in'; }); }

  /* path router: base like /user; routes [[regex, name], ...]; handlers by name */
  function router(base, routes, handlers, groups) {
    function go(path, replace) { history[replace ? 'replaceState' : 'pushState'](null, '', path); run(); }
    function run() {
      var rest = location.pathname.slice(base.length).replace(/^\/+|\/+$/g, ''), name = null, args = [];
      for (var i = 0; i < routes.length; i++) { var m = rest.match(routes[i][0]); if (m) { name = routes[i][1]; args = m.slice(1); break; } }
      if (!name) { go(base, true); return; }
      var h = handlers[name];
      if (h && h.apply(null, args) === false) return;
      $$('[data-view]').forEach(function (s) { s.hidden = s.dataset.view !== name; });
      var active = (groups && groups[name]) || name;
      $$('.side a[data-nav]').forEach(function (a) { if (a.dataset.nav === active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      window.scrollTo(0, 0);
      window.dispatchEvent(new Event('hashchange'));
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.target || e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
      var h = a.getAttribute('href');
      if (h && (h === base || h.indexOf(base + '/') === 0)) { e.preventDefault(); go(h); }
    });
    window.addEventListener('popstate', run);
    return { go: go, run: run };
  }

  /* chips helper */
  function chips(el, vals, get, set) {
    el.innerHTML = vals.map(function (v) { return '<button class="chip" type="button" data-v="' + esc(v) + '" aria-pressed="' + (v === get()) + '">' + esc(v) + '</button>'; }).join('');
    $$('.chip', el).forEach(function (b) { b.onclick = function () { set(b.dataset.v); }; });
  }

  /* new complaint wizard (steps 1-2), shared by user and manager */
  var EXT = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'txt', 'doc', 'docx'], MAXF = 1300000;
  function uploadFiles(caseId, files) {
    var chain = Promise.resolve(), failed = [];
    files.forEach(function (f) {
      chain = chain.then(function () {
        return f.arrayBuffer().then(function (buf) {
          return api('POST', '/api/cases/' + caseId + '/files?name=' + encodeURIComponent(f.name), null, { body: buf, type: f.type || 'application/octet-stream' });
        }).catch(function (e) { failed.push(f.name + ': ' + e.message); });
      });
    });
    return chain.then(function () { return failed; });
  }
  function addFileChecks(list, fl, onBad) {
    Array.prototype.forEach.call(fl, function (f) {
      var ext = (f.name.split('.').pop() || '').toLowerCase();
      if (EXT.indexOf(ext) < 0) return onBad('فرمت «' + f.name + '» مجاز نیست.');
      if (f.size > MAXF) return onBad('حجم «' + f.name + '» بیش از ۱ مگابایت است.');
      list.push(f);
    });
  }
  function wizard(base, nav) {
    var draft = null, ntype = 'حقوقی', files = [], signed = false, drawing = false;
    var cv = $('#pad'), cx = cv.getContext('2d');
    $$('.type').forEach(function (b) { b.onclick = function () { ntype = b.dataset.type; $$('.type').forEach(function (o) { o.setAttribute('aria-pressed', o === b); }); }; });
    $('#f1').onsubmit = function (e) {
      e.preventDefault();
      if (!$('#f-def').value.trim() || !$('#f-sub').value.trim()) { toast('نام متهم و موضوع شکایت را وارد کنید.'); return; }
      draft = { type: ntype, defendant: $('#f-def').value.trim(), defendant_phone: $('#f-phone').value.trim(), title: $('#f-sub').value.trim(), incident_date: $('#f-date').value.trim(), description: $('#f-desc').value.trim() };
      nav.go(base + '/new/docs');
    };
    function drawFiles() {
      $('#files').innerHTML = files.map(function (f, i) { return '<li>' + esc(f.name) + '<button type="button" data-i="' + i + '" aria-label="حذف">×</button></li>'; }).join('');
      $$('#files button').forEach(function (b) { b.onclick = function () { files.splice(+b.dataset.i, 1); drawFiles(); }; });
    }
    $('#file').onchange = function (e) { addFileChecks(files, e.target.files, toast); e.target.value = ''; drawFiles(); };
    ['dragover', 'dragleave', 'drop'].forEach(function (ev) {
      $('#drop').addEventListener(ev, function (e) {
        e.preventDefault(); $('#drop').classList.toggle('over', ev === 'dragover');
        if (ev === 'drop') { addFileChecks(files, e.dataTransfer.files, toast); drawFiles(); }
      });
    });
    function fit() {
      var r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1; if (!r.width) return;
      cv.width = r.width * d; cv.height = r.height * d; cx.setTransform(1, 0, 0, 1, 0, 0); cx.scale(d, d);
      cx.lineWidth = 2.6; cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.strokeStyle = '#111'; signed = false; $('#hint').hidden = false;
    }
    function pt(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    cv.onpointerdown = function (e) { drawing = true; cv.setPointerCapture(e.pointerId); var p = pt(e); cx.beginPath(); cx.moveTo(p[0], p[1]); $('#hint').hidden = true; };
    cv.onpointermove = function (e) { if (!drawing) return; var p = pt(e); cx.lineTo(p[0], p[1]); cx.stroke(); signed = true; };
    cv.onpointerup = cv.onpointercancel = function () { drawing = false; };
    $('#clr').onclick = fit;
    var busy = false;
    $('#submit').onclick = function () {
      if (busy) return;
      if (!signed) { toast('لطفاً کادر امضا را پر کنید.'); return; }
      if (!$('#rules').checked) { toast('پذیرش قوانین الزامی است.'); return; }
      busy = true; $('#submit').disabled = true;
      var body = Object.assign({}, draft, { signature: cv.toDataURL('image/png') });
      api('POST', '/api/cases', body).then(function (d) {
        return uploadFiles(d.id, files).then(function (failed) {
          toast(failed.length ? 'شکایت ثبت شد؛ برخی فایل‌ها بارگذاری نشد: ' + failed[0] : 'شکایت شما ثبت شد. کد رهگیری: ' + d.code);
          draft = null; files = []; drawFiles(); $('#f1').reset(); $('#rules').checked = false;
          nav.go(base + '/complaints/' + d.id);
        });
      }).catch(function (e) { toast(e.message); }).then(function () { busy = false; $('#submit').disabled = false; });
    };
    return { hasDraft: function () { return !!draft; }, fit: fit };
  }

  window.MH = { $: $, $$: $$, fa: fa, esc: esc, toast: toast, fd: fd, ft: ft, api: api, badge: badge, logout: logout, router: router, chips: chips, wizard: wizard, uploadFiles: uploadFiles, addFileChecks: addFileChecks };
})();
