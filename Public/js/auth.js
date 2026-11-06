/* /log-in : login, register, forgot password (all verified on the server) */
(function () {
  var M = MH, $ = M.$, $$ = M.$$;
  var MN = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  function opts(a, ph) { return '<option value="">' + ph + '</option>' + a.join(''); }
  var d = [], y = [], i;
  for (i = 1; i <= 31; i++) d.push('<option value="' + i + '">' + i + '</option>');
  for (i = 1404; i >= 1300; i--) y.push('<option value="' + i + '">' + i + '</option>');
  $$('.bd').forEach(function (b) {
    b.innerHTML = '<select class="in fa" name="d" aria-label="روز">' + opts(d, 'روز') + '</select><select class="in fa" name="m" aria-label="ماه">' + opts(MN.map(function (n, k) { return '<option value="' + (k + 1) + '">' + n + '</option>'; }), 'ماه') + '</select><select class="in fa" name="y" aria-label="سال">' + opts(y, 'سال') + '</select>';
  });
  function en(s) { return String(s).replace(/[۰-۹]/g, function (c) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(c); }).replace(/[٠-٩]/g, function (c) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(c); }); }
  function validNid(v) { if (!/^\d{10}$/.test(v) || /^(\d)\1{9}$/.test(v)) return false; var s = 0, i; for (i = 0; i < 9; i++) s += (+v[i]) * (10 - i); var r = s % 11, c = +v[9]; return r < 2 ? c === r : c === 11 - r; }
  function validPw(p) { return p.length >= 8 && /[A-Za-z؀-ۿ]/.test(p) && /\d/.test(p); }
  function msg(f, t) { var n = $('.err', f); n.textContent = t || ''; return false; }
  var HEAD = { login: ['ورود به پنل شکایت', 'برای ادامه وارد شوید یا ثبت نام کنید.'], register: ['ثبت نام', 'اطلاعات خود را با دقت وارد کنید.'], forgot: ['فراموشی رمز عبور', 'برای تعیین رمز جدید هویت خود را تایید کنید.'] };
  function tab(t) {
    $$('.atabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); });
    ['login', 'register', 'forgot'].forEach(function (k) { $('#f-' + k).classList.toggle('on', k === t); });
    $('h1.at').textContent = HEAD[t][0]; $('p.sub.at').textContent = HEAD[t][1];
    try { history.replaceState(null, '', t === 'login' ? '/log-in' : '/log-in?tab=' + t); } catch (e) { }
  }
  $$('.atabs button').forEach(function (b) { b.onclick = function () { tab(b.dataset.t); }; });
  $$('[data-go]').forEach(function (b) { b.onclick = function () { tab(b.dataset.go); }; });
  function grab(f) { var o = {}; $$('input,select', f).forEach(function (i) { o[i.name] = en(i.value).trim(); }); return o; }
  function bd(o) { return { y: o.y, m: o.m, d: o.d }; }
  function common(f, o, needName) {
    if (needName && (o.fn.length < 2 || o.ln.length < 2)) return msg(f, 'نام و نام خانوادگی را وارد کنید.');
    if (o.nid !== undefined && !validNid(o.nid)) return msg(f, 'کد ملی معتبر نیست.');
    if (!/^09\d{9}$/.test(o.mobile)) return msg(f, 'شماره همراه معتبر نیست (مثال: 09123456789).');
    if (o.d !== undefined && (!o.d || !o.m || !o.y)) return msg(f, 'تاریخ تولد را کامل انتخاب کنید.');
    if (o.pw !== undefined && f.id !== 'f-login' && !validPw(o.pw)) return msg(f, 'رمز باید حداقل ۸ نویسه و شامل حرف و عدد باشد.');
    return true;
  }
  function busy(f, on) { $('button[type=submit]', f).disabled = on; }
  $('#f-login').onsubmit = function (ev) {
    ev.preventDefault(); var f = ev.target, o = grab(f);
    if (!/^09\d{9}$/.test(o.mobile)) return msg(f, 'شماره همراه معتبر نیست.');
    if (!o.pw) return msg(f, 'رمز عبور را وارد کنید.');
    msg(f, ''); busy(f, true);
    M.api('POST', '/api/auth/login', { mobile: o.mobile, pw: o.pw }).then(function (r) { location.href = r.redirect; }).catch(function (e) { msg(f, e.message); busy(f, false); });
  };
  $('#f-register').onsubmit = function (ev) {
    ev.preventDefault(); var f = ev.target, o = grab(f);
    if (common(f, o, true) !== true) return; msg(f, ''); busy(f, true);
    M.api('POST', '/api/auth/register', { fn: o.fn, ln: o.ln, nid: o.nid, mobile: o.mobile, bd: bd(o), pw: o.pw }).then(function () { f.reset(); tab('login'); M.toast('ثبت نام انجام شد؛ اکنون وارد شوید.'); busy(f, false); }).catch(function (e) { msg(f, e.message); busy(f, false); });
  };
  $('#f-forgot').onsubmit = function (ev) {
    ev.preventDefault(); var f = ev.target, o = grab(f);
    if (common(f, o, false) !== true) return; msg(f, ''); busy(f, true);
    M.api('POST', '/api/auth/forgot', { mobile: o.mobile, nid: o.nid, bd: bd(o), pw: o.pw }).then(function () { f.reset(); tab('login'); M.toast('هویت تایید شد و رمز عبور جدید اعمال شد.'); busy(f, false); }).catch(function (e) { msg(f, e.message); busy(f, false); });
  };
  var t = new URLSearchParams(location.search).get('tab');
  tab(t === 'register' || t === 'forgot' ? t : 'login');
})();
