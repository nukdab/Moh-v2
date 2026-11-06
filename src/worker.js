// سازمان مدیریت منزل — Cloudflare Worker (API + route guard) with D1.
// Static pages are served from /public through the ASSETS binding.

const STATUSES = ['جدید', 'در حال بررسی', 'ابلاغ شده', 'مختومه'];
const TYPES = ['حقوقی', 'کیفری'];
const MAX_FILE = 1_300_000; // D1 rows are limited to ~2MB; files are stored as base64 text
const MAX_FILES_PER_CASE = 10;
const FILE_EXT = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'txt', 'doc', 'docx'];
const MIME = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', txt: 'text/plain; charset=utf-8', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
const SESSION_MS = 30 * 24 * 3600 * 1000;
const PBKDF2_ITER = 100000; // Workers cap

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT, mobile TEXT NOT NULL UNIQUE, nid TEXT NOT NULL UNIQUE, fn TEXT NOT NULL, ln TEXT NOT NULL, bd TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', pw_hash TEXT NOT NULL, pw_salt TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sessions(id_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS cases(id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, user_id INTEGER NOT NULL, title TEXT NOT NULL, type TEXT NOT NULL, defendant TEXT NOT NULL, defendant_phone TEXT, incident_date TEXT, description TEXT, status TEXT NOT NULL DEFAULT 'جدید', note TEXT NOT NULL DEFAULT '', signature TEXT, by_admin INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_cases_user ON cases(user_id)`,
  `CREATE TABLE IF NOT EXISTS case_events(id INTEGER PRIMARY KEY AUTOINCREMENT, case_id INTEGER NOT NULL, text TEXT NOT NULL, actor_id INTEGER, created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_events_case ON case_events(case_id)`,
  `CREATE TABLE IF NOT EXISTS attachments(id INTEGER PRIMARY KEY AUTOINCREMENT, case_id INTEGER NOT NULL, name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, by_admin INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_att_case ON attachments(case_id)`,
  `CREATE TABLE IF NOT EXISTS notifications(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, case_id INTEGER, title TEXT NOT NULL, body TEXT NOT NULL, no TEXT NOT NULL, is_read INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id)`,
  `CREATE TABLE IF NOT EXISTS admin_audit_logs(id INTEGER PRIMARY KEY AUTOINCREMENT, admin_id INTEGER NOT NULL, text TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS feedback(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, contact TEXT, message TEXT NOT NULL, is_read INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)`,
];

let schemaReady = null;
async function ensureSchema(env) {
  if (!schemaReady) schemaReady = env.DB.batch(SCHEMA.map((s) => env.DB.prepare(s))).catch((e) => { schemaReady = null; throw e; });
  await schemaReady;
}

/* ---------- helpers ---------- */
const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};
function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...SEC_HEADERS, ...extra } });
}
const err = (msg, status = 400) => json({ error: msg }, status);
const nd = (s) => String(s ?? '').replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const rand = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);

async function sha256(s) { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))); }
async function pbkdf2(pw, saltHex) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', iterations: PBKDF2_ITER, salt: new TextEncoder().encode(saltHex) }, key, 256);
  return hex(bits);
}
function safeEq(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function validNid(v) {
  if (!/^\d{10}$/.test(v) || /^(\d)\1{9}$/.test(v)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += +v[i] * (10 - i);
  const r = s % 11;
  return r < 2 ? +v[9] === r : +v[9] === 11 - r;
}
const validMobile = (v) => /^09\d{9}$/.test(v);
const validPw = (p) => typeof p === 'string' && p.length >= 8 && p.length <= 128 && /[A-Za-z؀-ۿ]/.test(p) && /\d/.test(p);
function parseBd(b) {
  if (!b) return null;
  const y = +nd(b.y), m = +nd(b.m), d = +nd(b.d);
  if (!(y >= 1300 && y <= 1450 && m >= 1 && m <= 12 && d >= 1 && d <= (m <= 6 ? 31 : m <= 11 ? 30 : 30))) return null;
  return `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
}

function cookie(req, name) {
  const m = (req.headers.get('Cookie') || '').match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? m[1] : null;
}
async function getUser(env, req) {
  const tok = cookie(req, 'sid');
  if (!tok || !/^[0-9a-f]{64}$/.test(tok)) return null;
  const h = await sha256(tok);
  const row = await env.DB.prepare(`SELECT u.id,u.mobile,u.nid,u.fn,u.ln,u.bd,u.role,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id_hash=?`).bind(h).first();
  if (!row) return null;
  if (row.expires_at < Date.now()) { await env.DB.prepare(`DELETE FROM sessions WHERE id_hash=?`).bind(h).run(); return null; }
  return row;
}
function setSession(tok) {
  return `sid=${tok}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_MS / 1000}`;
}
async function startSession(env, userId) {
  const tok = rand(32);
  const now = Date.now();
  await env.DB.prepare(`INSERT INTO sessions(id_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)`).bind(await sha256(tok), userId, now + SESSION_MS, now).run();
  await env.DB.prepare(`DELETE FROM sessions WHERE expires_at<?`).bind(now).run();
  return tok;
}
async function readJson(req) {
  try { const t = await req.text(); if (t.length > 700_000) return null; return JSON.parse(t); } catch { return null; }
}
const publicUser = (u) => ({ id: u.id, fn: u.fn, ln: u.ln, mobile: u.mobile, nid: u.nid, bd: u.bd, role: u.role });

/* ---------- tracking code ---------- */
function trackPrefix(date, type) {
  const tz = 'Asia/Tehran';
  const part = (loc, opt, t) => new Intl.DateTimeFormat(loc, { timeZone: tz, ...opt }).formatToParts(date).find((p) => p.type === t)?.value ?? '';
  const pYear = part('en-u-ca-persian-nu-latn', { year: 'numeric' }, 'year').replace(/\D/g, '');
  const gMonth = String(+part('en-u-ca-gregory-nu-latn', { month: 'numeric' }, 'month')).padStart(2, '0');
  const hDay = String(+part('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric' }, 'day')).padStart(2, '0');
  const gYear = part('en-u-ca-gregory-nu-latn', { year: 'numeric' }, 'year');
  const hour = String(+part('en-u-ca-gregory-nu-latn', { hour: 'numeric', hourCycle: 'h23' }, 'hour') % 24).padStart(2, '0');
  return `${pYear}${gMonth}${hDay}${gYear}${hour}${type === 'حقوقی' ? '1' : '2'}`;
}
async function newCode(env, type) {
  const prefix = trackPrefix(new Date(), type);
  const { c } = await env.DB.prepare(`SELECT COUNT(*) c FROM cases WHERE code=? OR code LIKE ?`).bind(prefix, prefix + '%').first();
  return c ? `${prefix}${c + 1}` : prefix;
}

/* ---------- data helpers ---------- */
async function audit(env, adminId, text) {
  await env.DB.prepare(`INSERT INTO admin_audit_logs(admin_id,text,created_at) VALUES(?,?,?)`).bind(adminId, text, Date.now()).run();
}
async function event(env, caseId, text, actorId) {
  await env.DB.prepare(`INSERT INTO case_events(case_id,text,actor_id,created_at) VALUES(?,?,?,?)`).bind(caseId, text, actorId ?? null, Date.now()).run();
}
async function loadCase(env, id) {
  return env.DB.prepare(`SELECT c.*,u.fn,u.ln,u.mobile,u.nid,u.role urole FROM cases c JOIN users u ON u.id=c.user_id WHERE c.id=?`).bind(id).first();
}
const canSee = (u, c) => u.role === 'admin' || c.user_id === u.id;

function b64(bytes) {
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  return btoa(s);
}
function unb64(str) {
  const s = atob(str);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/* ---------- AI assistant ---------- */
const AI_SYSTEM = `تو «دستیار هوشمند سازمان مدیریت منزل» هستی؛ در پنل کاربری یک سامانه‌ی ثبت و پیگیری شکایت. به زبان فارسیِ ساده، مودبانه و کوتاه (حداکثر ۶ جمله) به کسانی که با سایت آشنا نیستند کمک کن.
اطلاعات سایت: بخش‌های پنل: داشبورد، شکایات من، ثبت شکایت جدید، ابلاغیه‌ها، پروفایل، خروج. ثبت شکایت در سه مرحله است: ۱) نوع پرونده (حقوقی یا کیفری)، نام متهم/خوانده، موضوع و توضیحات؛ ۲) بارگذاری مدارک (PDF، تصویر، متن یا Word؛ هر فایل حداکثر ۱ مگابایت) و امضا با انگشت یا ماوس در کادر امضا و پذیرش قوانین؛ ۳) ثبت نهایی. بعد از ثبت یک کد رهگیری داده می‌شود و وضعیت پرونده (جدید، در حال بررسی، ابلاغ شده، مختومه) و توضیحات مدیر در «شکایات من» دیده می‌شود. مدیر سازمان می‌تواند وضعیت را تغییر دهد، مدرک اضافه کند و ابلاغیه بفرستد که در بخش «ابلاغیه‌ها» می‌آید. برای مختومه شدن پرونده گواهی قابل دانلود است. شکایت حقوقی معمولاً درباره‌ی مطالبه‌ی حق، خسارت و اختلاف‌های مالی و قراردادی است و شکایت کیفری درباره‌ی رفتارهایی که قانون برایشان مجازات تعیین کرده (مثل تهدید، توهین، کلاهبرداری).
قوانین: نظر حقوقی قطعی یا تضمین نتیجه نده و برای تصمیم‌های مهم توصیه کن با وکیل مشورت شود. هرگز رمز عبور، کد ملی یا اطلاعات محرمانه نخواه. اگر سوال بی‌ربط به سایت بود مودبانه به موضوع سایت برگردان. اگر نمی‌دانی صادقانه بگو و پیشنهاد کن از مدیر سازمان بپرسند.`;
const FAQ = [
  [/(ثبت|شکایت).*(چطور|چگونه|چه)|چطور.*(شکایت|ثبت)/, 'از منوی «ثبت شکایت جدید» شروع کنید: نوع پرونده (حقوقی یا کیفری)، نام متهم و موضوع را بنویسید، سپس مدارک را بارگذاری کنید، در کادر امضا امضا کنید و قوانین را بپذیرید. در پایان کد رهگیری به شما داده می‌شود.'],
  [/رهگیری/, 'کد رهگیری شماره‌ی یکتای پرونده‌ی شماست. با آن می‌توانید در «شکایات من» وضعیت، روند و توضیحات مدیر را ببینید.'],
  [/حقوقی|کیفری/, 'پرونده‌ی حقوقی معمولاً برای مطالبه‌ی حق، خسارت و اختلاف‌های مالی و قراردادی است؛ پرونده‌ی کیفری برای رفتارهایی که قانون برایشان مجازات تعیین کرده، مثل تهدید، توهین یا کلاهبرداری. برای تصمیم قطعی بهتر است با وکیل مشورت کنید.'],
  [/امضا/, 'در مرحله‌ی دوم ثبت شکایت، با انگشت یا ماوس داخل کادر امضا بکشید. اگر اشتباه شد دکمه‌ی «پاک کردن» را بزنید.'],
  [/ابلاغیه/, 'ابلاغیه‌هایی که مدیر برای شما صادر می‌کند در بخش «ابلاغیه‌ها» نمایش داده می‌شود و تعداد خوانده‌نشده‌ها کنار آن دیده می‌شود.'],
];
function faq(q) {
  for (const [re, a] of FAQ) if (re.test(q)) return a;
  return 'برای ثبت شکایت از «ثبت شکایت جدید»، برای پیگیری از «شکایات من» و برای پیام‌های مدیر از «ابلاغیه‌ها» استفاده کنید. اگر سوال دیگری دارید دقیق‌تر بپرسید یا از مدیر سازمان کمک بگیرید.';
}

/* ---------- API ---------- */
async function api(req, env, url) {
  await ensureSchema(env);
  const path = url.pathname.replace(/\/+$/, '');
  const m = req.method;

  if (m !== 'GET' && m !== 'HEAD') {
    const o = req.headers.get('Origin');
    if (o && new URL(o).host !== url.host) return err('درخواست نامعتبر است.', 403);
    if (req.headers.get('X-Requested-With') !== 'fetch') return err('درخواست نامعتبر است.', 403);
  }

  /* --- public auth --- */
  if (path === '/api/auth/register' && m === 'POST') {
    const b = await readJson(req); if (!b) return err('درخواست نامعتبر است.');
    const fn = clean(b.fn, 40), ln = clean(b.ln, 50), nid = nd(b.nid).trim(), mobile = nd(b.mobile).trim(), bd = parseBd(b.bd), pw = String(b.pw ?? '');
    if (fn.length < 2 || ln.length < 2) return err('نام و نام خانوادگی را وارد کنید.');
    if (!validNid(nid)) return err('کد ملی معتبر نیست.');
    if (!validMobile(mobile)) return err('شماره همراه معتبر نیست (مثال: 09123456789).');
    if (!bd) return err('تاریخ تولد را کامل انتخاب کنید.');
    if (!validPw(pw)) return err('رمز باید حداقل ۸ نویسه و شامل حرف و عدد باشد.');
    const dup = await env.DB.prepare(`SELECT mobile,nid FROM users WHERE mobile=? OR nid=?`).bind(mobile, nid).first();
    if (dup) return err(dup.mobile === mobile ? 'این شماره همراه قبلاً ثبت نام کرده است؛ وارد شوید.' : 'این کد ملی قبلاً ثبت شده است.', 409);
    const salt = rand(16);
    const admins = String(env.ADMIN_MOBILES || '').split(',').map((s) => s.trim());
    const role = admins.includes(mobile) ? 'admin' : 'user';
    await env.DB.prepare(`INSERT INTO users(mobile,nid,fn,ln,bd,role,pw_hash,pw_salt,created_at) VALUES(?,?,?,?,?,?,?,?,?)`).bind(mobile, nid, fn, ln, bd, role, await pbkdf2(pw, salt), salt, Date.now()).run();
    return json({ ok: true });
  }
  if (path === '/api/auth/login' && m === 'POST') {
    const b = await readJson(req); if (!b) return err('درخواست نامعتبر است.');
    const mobile = nd(b.mobile).trim(), pw = String(b.pw ?? '');
    const u = validMobile(mobile) ? await env.DB.prepare(`SELECT * FROM users WHERE mobile=?`).bind(mobile).first() : null;
    const h = await pbkdf2(pw, u ? u.pw_salt : '0'.repeat(32));
    if (!u || !safeEq(h, u.pw_hash)) return err('شماره همراه یا رمز عبور اشتباه است.', 401);
    const admins = String(env.ADMIN_MOBILES || '').split(',').map((s) => s.trim());
    if (u.role !== 'admin' && admins.includes(mobile)) { await env.DB.prepare(`UPDATE users SET role='admin' WHERE id=?`).bind(u.id).run(); u.role = 'admin'; }
    const tok = await startSession(env, u.id);
    return json({ ok: true, role: u.role, redirect: u.role === 'admin' ? '/manager' : '/user' }, 200, { 'Set-Cookie': setSession(tok) });
  }
  if (path === '/api/auth/forgot' && m === 'POST') {
    const b = await readJson(req); if (!b) return err('درخواست نامعتبر است.');
    const mobile = nd(b.mobile).trim(), nid = nd(b.nid).trim(), bd = parseBd(b.bd), pw = String(b.pw ?? '');
    if (!validMobile(mobile) || !validNid(nid) || !bd) return err('اطلاعات واردشده معتبر نیست.');
    if (!validPw(pw)) return err('رمز باید حداقل ۸ نویسه و شامل حرف و عدد باشد.');
    const u = await env.DB.prepare(`SELECT id,nid,bd FROM users WHERE mobile=?`).bind(mobile).first();
    if (!u || u.nid !== nid || u.bd !== bd) return err('مشخصات واردشده با اطلاعات ثبت نام مطابقت ندارد؛ رمز تغییر نکرد.', 403);
    const salt = rand(16);
    await env.DB.batch([
      env.DB.prepare(`UPDATE users SET pw_hash=?,pw_salt=? WHERE id=?`).bind(await pbkdf2(pw, salt), salt, u.id),
      env.DB.prepare(`DELETE FROM sessions WHERE user_id=?`).bind(u.id),
    ]);
    return json({ ok: true });
  }
  if (path === '/api/auth/logout' && m === 'POST') {
    const tok = cookie(req, 'sid');
    if (tok && /^[0-9a-f]{64}$/.test(tok)) await env.DB.prepare(`DELETE FROM sessions WHERE id_hash=?`).bind(await sha256(tok)).run();
    return json({ ok: true }, 200, { 'Set-Cookie': 'sid=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0' });
  }
  if (path === '/api/feedback' && m === 'POST') {
    const b = await readJson(req); if (!b) return err('درخواست نامعتبر است.');
    const name = clean(b.name, 60), contact = clean(b.contact, 80), message = clean(b.message, 1500);
    if (name.length < 2 || message.length < 5) return err('نام و متن پیام را وارد کنید.');
    await env.DB.prepare(`INSERT INTO feedback(name,contact,message,created_at) VALUES(?,?,?,?)`).bind(name, contact, message, Date.now()).run();
    return json({ ok: true });
  }

  /* --- authenticated --- */
  const me = await getUser(env, req);
  if (!me) return err('ابتدا وارد شوید.', 401);
  const isAdmin = me.role === 'admin';
  const need = (ok) => (ok ? null : err('دسترسی ندارید.', 403));

  if (path === '/api/me' && m === 'GET') {
    const { n } = await env.DB.prepare(`SELECT COUNT(*) n FROM notifications WHERE user_id=? AND is_read=0`).bind(me.id).first();
    return json({ user: publicUser(me), unread: n });
  }
  if (path === '/api/me' && m === 'PATCH') {
    const b = await readJson(req); if (!b) return err('درخواست نامعتبر است.');
    const fn = clean(b.fn, 40), ln = clean(b.ln, 50);
    if (fn.length < 2 || ln.length < 2) return err('نام و نام خانوادگی را وارد کنید.');
    await env.DB.prepare(`UPDATE users SET fn=?,ln=? WHERE id=?`).bind(fn, ln, me.id).run();
    return json({ ok: true, user: publicUser({ ...me, fn, ln }) });
  }
  if (path === '/api/me/password' && m === 'POST') {
    const b = await readJson(req); if (!b) return err('درخواست نامعتبر است.');
    const u = await env.DB.prepare(`SELECT pw_hash,pw_salt FROM users WHERE id=?`).bind(me.id).first();
    if (!safeEq(await pbkdf2(String(b.old ?? ''), u.pw_salt), u.pw_hash)) return err('رمز عبور فعلی اشتباه است.', 403);
    if (!validPw(String(b.new ?? ''))) return err('رمز جدید باید حداقل ۸ نویسه و شامل حرف و عدد باشد.');
    const salt = rand(16);
    const cur = await sha256(cookie(req, 'sid'));
    await env.DB.batch([
      env.DB.prepare(`UPDATE users SET pw_hash=?,pw_salt=? WHERE id=?`).bind(await pbkdf2(String(b.new), salt), salt, me.id),
      env.DB.prepare(`DELETE FROM sessions WHERE user_id=? AND id_hash<>?`).bind(me.id, cur),
    ]);
    return json({ ok: true });
  }

  /* cases */
  if (path === '/api/cases' && m === 'GET') {
    const where = [], args = [];
    if (!isAdmin) { where.push('c.user_id=?'); args.push(me.id); }
    const st = url.searchParams.get('status'), ty = url.searchParams.get('type'), by = url.searchParams.get('by'), q = clean(url.searchParams.get('q'), 60);
    if (st && STATUSES.includes(st)) { where.push('c.status=?'); args.push(st); }
    if (ty && TYPES.includes(ty)) { where.push('c.type=?'); args.push(ty); }
    if (isAdmin && by === 'admin') where.push('c.by_admin=1');
    if (isAdmin && by === 'customers') where.push('c.by_admin=0');
    if (q) { where.push(`(c.code LIKE ? OR c.title LIKE ? OR (u.fn||' '||u.ln) LIKE ?)`); const l = `%${q.replace(/[%_]/g, '')}%`; args.push(l, l, l); }
    const rows = await env.DB.prepare(`SELECT c.id,c.code,c.title,c.type,c.status,c.by_admin,c.created_at,u.fn,u.ln FROM cases c JOIN users u ON u.id=c.user_id ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY c.created_at DESC LIMIT 500`).bind(...args).all();
    return json({ cases: rows.results });
  }
  if (path === '/api/cases' && m === 'POST') {
    const b = await readJson(req); if (!b) return err('درخواست نامعتبر است.');
    const type = TYPES.includes(b.type) ? b.type : null;
    const title = clean(b.title, 150), defendant = clean(b.defendant, 120), dphone = clean(nd(b.defendant_phone), 20), idate = clean(nd(b.incident_date), 20), desc = clean(b.description, 4000);
    const sig = typeof b.signature === 'string' && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(b.signature) && b.signature.length < 400_000 ? b.signature : null;
    if (!type) return err('نوع پرونده را انتخاب کنید.');
    if (!defendant || !title) return err('نام متهم/خوانده و موضوع شکایت را وارد کنید.');
    if (!sig) return err('امضای شاکی لازم است.');
    const code = await newCode(env, type), now = Date.now();
    const r = await env.DB.prepare(`INSERT INTO cases(code,user_id,title,type,defendant,defendant_phone,incident_date,description,signature,by_admin,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).bind(code, me.id, title, type, defendant, dphone, idate, desc, sig, isAdmin ? 1 : 0, now, now).run();
    const id = r.meta.last_row_id;
    await event(env, id, isAdmin ? 'ثبت شکایت توسط مدیر' : 'ثبت شکایت توسط شاکی', me.id);
    if (isAdmin) await audit(env, me.id, `شکایت جدید «${title}» توسط مدیر ثبت شد (${code})`);
    return json({ ok: true, id, code });
  }
  let mm;
  if ((mm = path.match(/^\/api\/cases\/(\d+)$/)) && m === 'GET') {
    const c = await loadCase(env, +mm[1]);
    if (!c || !canSee(me, c)) return err('پرونده پیدا نشد.', 404);
    const [ev, at, nt] = await Promise.all([
      env.DB.prepare(`SELECT e.text,e.created_at FROM case_events e WHERE e.case_id=? ORDER BY e.id`).bind(c.id).all(),
      env.DB.prepare(`SELECT id,name,mime,size,by_admin,created_at FROM attachments WHERE case_id=? ORDER BY id`).bind(c.id).all(),
      env.DB.prepare(`SELECT id,title,no,created_at FROM notifications WHERE case_id=? ORDER BY id DESC`).bind(c.id).all(),
    ]);
    const complainant = isAdmin ? { fn: c.fn, ln: c.ln, mobile: c.mobile, nid: c.nid } : { fn: c.fn, ln: c.ln };
    return json({ case: { id: c.id, code: c.code, title: c.title, type: c.type, status: c.status, note: c.note, defendant: c.defendant, defendant_phone: c.defendant_phone, incident_date: c.incident_date, description: c.description, signature: c.signature, by_admin: c.by_admin, created_at: c.created_at, updated_at: c.updated_at, complainant }, events: ev.results, files: at.results, notices: nt.results });
  }
  if ((mm = path.match(/^\/api\/cases\/(\d+)\/status$/)) && m === 'POST') {
    const d = need(isAdmin); if (d) return d;
    const b = await readJson(req); if (!b) return err('درخواست نامعتبر است.');
    const c = await loadCase(env, +mm[1]); if (!c) return err('پرونده پیدا نشد.', 404);
    const st = b.status, note = clean(b.note, 3000);
    if (!STATUSES.includes(st)) return err('وضعیت نامعتبر است.');
    if (st === 'مختومه' && !note) return err('برای مختومه کردن، توضیحات را بنویسید.');
    if (st === c.status && note === c.note) return err('تغییری برای ثبت وجود ندارد.');
    await env.DB.prepare(`UPDATE cases SET status=?,note=?,updated_at=? WHERE id=?`).bind(st, note, Date.now(), c.id).run();
    if (st !== c.status) { await event(env, c.id, `تغییر وضعیت به «${st}»`, me.id); await audit(env, me.id, `وضعیت پرونده ${c.code} به «${st}» تغییر کرد`); }
    if (note !== c.note) await audit(env, me.id, `توضیحات پرونده ${c.code} ویرایش شد`);
    return json({ ok: true });
  }
  if ((mm = path.match(/^\/api\/cases\/(\d+)\/notice$/)) && m === 'POST') {
    const d = need(isAdmin); if (d) return d;
    const b = await readJson(req); if (!b) return err('درخواست نامعتبر است.');
    const c = await loadCase(env, +mm[1]); if (!c) return err('پرونده پیدا نشد.', 404);
    const title = clean(b.title, 150), body = clean(b.body, 3000);
    if (!title || !body) return err('عنوان و متن ابلاغیه را بنویسید.');
    const now = Date.now();
    const { n } = await env.DB.prepare(`SELECT COUNT(*) n FROM notifications`).first();
    const pYear = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { timeZone: 'Asia/Tehran', year: 'numeric' }).formatToParts(new Date()).find((p) => p.type === 'year').value.replace(/\D/g, '');
    const no = `ب-${pYear}-${String(n + 1).padStart(4, '0')}`;
    await env.DB.prepare(`INSERT INTO notifications(user_id,case_id,title,body,no,created_at) VALUES(?,?,?,?,?,?)`).bind(c.user_id, c.id, title, body, no, now).run();
    await event(env, c.id, `ابلاغیه «${title}» ارسال شد`, me.id);
    await audit(env, me.id, `ابلاغیه «${title}» برای پرونده ${c.code} ارسال شد`);
    return json({ ok: true, no });
  }
  if ((mm = path.match(/^\/api\/cases\/(\d+)\/files$/)) && m === 'POST') {
    const c = await loadCase(env, +mm[1]);
    if (!c || !canSee(me, c)) return err('پرونده پیدا نشد.', 404);
    const name = clean(decodeURIComponent(url.searchParams.get('name') || ''), 120).replace(/[\\/]/g, '_');
    const ext = (name.split('.').pop() || '').toLowerCase();
    if (!name || !FILE_EXT.includes(ext)) return err('فرمت فایل مجاز نیست (PDF، تصویر، متن یا Word).');
    if (Number(req.headers.get('Content-Length') || 0) > MAX_FILE) return err('حجم فایل بیش از ۱ مگابایت است.', 413);
    const buf = new Uint8Array(await req.arrayBuffer());
    if (!buf.length) return err('فایل خالی است.');
    if (buf.length > MAX_FILE) return err('حجم فایل بیش از ۱ مگابایت است.', 413);
    const { n } = await env.DB.prepare(`SELECT COUNT(*) n FROM attachments WHERE case_id=?`).bind(c.id).first();
    if (n >= MAX_FILES_PER_CASE * 2) return err('تعداد فایل‌های این پرونده به حداکثر رسیده است.');
    const byAdmin = isAdmin && c.user_id !== me.id ? 1 : 0;
    const r = await env.DB.prepare(`INSERT INTO attachments(case_id,name,mime,size,by_admin,data,created_at) VALUES(?,?,?,?,?,?,?)`).bind(c.id, name, MIME[ext], buf.length, byAdmin, b64(buf), Date.now()).run();
    await event(env, c.id, byAdmin ? `مدرک «${name}» توسط مدیر اضافه شد` : `مدرک «${name}» اضافه شد`, me.id);
    if (byAdmin) await audit(env, me.id, `مدرک «${name}» به پرونده ${c.code} اضافه شد`);
    return json({ ok: true, id: r.meta.last_row_id });
  }
  if ((mm = path.match(/^\/api\/files\/(\d+)$/))) {
    const f = await env.DB.prepare(`SELECT a.*,c.user_id,c.code FROM attachments a JOIN cases c ON c.id=a.case_id WHERE a.id=?`).bind(+mm[1]).first();
    if (!f || !(isAdmin || f.user_id === me.id)) return err('فایل پیدا نشد.', 404);
    if (m === 'GET') {
      return new Response(unb64(f.data), { headers: { 'Content-Type': f.mime, 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(f.name)}`, ...SEC_HEADERS } });
    }
    if (m === 'DELETE') {
      if (!isAdmin && f.by_admin) return err('دسترسی ندارید.', 403);
      await env.DB.prepare(`DELETE FROM attachments WHERE id=?`).bind(f.id).run();
      await event(env, f.case_id, `مدرک «${f.name}» حذف شد`, me.id);
      if (isAdmin) await audit(env, me.id, `مدرک «${f.name}» از پرونده ${f.code} حذف شد`);
      return json({ ok: true });
    }
  }
  if ((mm = path.match(/^\/api\/cases\/(\d+)\/certificate$/)) && m === 'GET') {
    const c = await loadCase(env, +mm[1]);
    if (!c || !canSee(me, c)) return err('پرونده پیدا نشد.', 404);
    if (c.status !== 'مختومه') return err('گواهی فقط برای پرونده‌های مختومه صادر می‌شود.', 400);
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    const fd = (t) => new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
    const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>گواهی مختومه شدن پرونده ${esc(c.code)}</title><style>body{font-family:Tahoma,sans-serif;max-width:720px;margin:40px auto;padding:32px;border:3px double #1b8f80;line-height:2.2}h1{text-align:center;color:#0f6d62}dl{display:grid;grid-template-columns:140px 1fr;gap:4px 12px}dt{color:#555}dd{margin:0;font-weight:700}.f{text-align:left;margin-top:40px}</style></head><body><h1>گواهی مختومه شدن پرونده</h1><p style="text-align:center">سازمان مدیریت منزل</p><dl><dt>کد رهگیری</dt><dd>${esc(c.code)}</dd><dt>شاکی</dt><dd>${esc(c.fn)} ${esc(c.ln)}</dd><dt>موضوع</dt><dd>${esc(c.title)}</dd><dt>نوع پرونده</dt><dd>${esc(c.type)}</dd><dt>تاریخ ثبت</dt><dd>${fd(c.created_at)}</dd><dt>تاریخ مختومه شدن</dt><dd>${fd(c.updated_at)}</dd></dl><h3>توضیحات</h3><p>${esc(c.note)}</p><p class="f">سازمان مدیریت منزل</p></body></html>`;
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': `attachment; filename="certificate-${c.code}.html"`, ...SEC_HEADERS, 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'" } });
  }

  /* notices (user) */
  if (path === '/api/notices' && m === 'GET') {
    const rows = await env.DB.prepare(`SELECT n.id,n.title,n.body,n.no,n.is_read,n.created_at,c.code FROM notifications n LEFT JOIN cases c ON c.id=n.case_id WHERE n.user_id=? ORDER BY n.id DESC LIMIT 200`).bind(me.id).all();
    return json({ notices: rows.results });
  }
  if ((mm = path.match(/^\/api\/notices\/(\d+)\/read$/)) && m === 'POST') {
    await env.DB.prepare(`UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?`).bind(+mm[1], me.id).run();
    return json({ ok: true });
  }

  /* admin */
  if (path === '/api/admin/stats' && m === 'GET') {
    const d = need(isAdmin); if (d) return d;
    const rows = await env.DB.prepare(`SELECT status,COUNT(*) n FROM cases GROUP BY status`).all();
    const s = Object.fromEntries(STATUSES.map((x) => [x, 0]));
    for (const r of rows.results) s[r.status] = r.n;
    const { f } = await env.DB.prepare(`SELECT COUNT(*) f FROM feedback WHERE is_read=0`).first();
    return json({ stats: s, feedback_unread: f });
  }
  if (path === '/api/admin/notices' && m === 'GET') {
    const d = need(isAdmin); if (d) return d;
    const rows = await env.DB.prepare(`SELECT n.id,n.title,n.body,n.no,n.created_at,c.code,c.id case_id,u.fn,u.ln FROM notifications n LEFT JOIN cases c ON c.id=n.case_id JOIN users u ON u.id=n.user_id ORDER BY n.id DESC LIMIT 300`).all();
    return json({ notices: rows.results });
  }
  if (path === '/api/admin/log' && m === 'GET') {
    const d = need(isAdmin); if (d) return d;
    const rows = await env.DB.prepare(`SELECT text,created_at FROM admin_audit_logs ORDER BY id DESC LIMIT 300`).all();
    return json({ log: rows.results });
  }
  if (path === '/api/admin/feedback' && m === 'GET') {
    const d = need(isAdmin); if (d) return d;
    const rows = await env.DB.prepare(`SELECT id,name,contact,message,is_read,created_at FROM feedback ORDER BY id DESC LIMIT 300`).all();
    return json({ feedback: rows.results });
  }
  if ((mm = path.match(/^\/api\/admin\/feedback\/(\d+)\/read$/)) && m === 'POST') {
    const d = need(isAdmin); if (d) return d;
    await env.DB.prepare(`UPDATE feedback SET is_read=1 WHERE id=?`).bind(+mm[1]).run();
    return json({ ok: true });
  }

  /* AI assistant */
  if (path === '/api/ai' && m === 'POST') {
    const b = await readJson(req); if (!b || !Array.isArray(b.messages)) return err('درخواست نامعتبر است.');
    const msgs = b.messages.slice(-8).map((x) => ({ role: x.role === 'assistant' ? 'assistant' : 'user', content: clean(x.content, 500) })).filter((x) => x.content);
    if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return err('پیام نامعتبر است.');
    try {
      if (!env.AI) throw new Error('no ai');
      const out = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', { messages: [{ role: 'system', content: AI_SYSTEM }, ...msgs], max_tokens: 450 });
      const reply = clean(out.response, 1500);
      if (!reply) throw new Error('empty');
      return json({ reply });
    } catch {
      return json({ reply: faq(msgs[msgs.length - 1].content), fallback: true });
    }
  }

  return err('آدرس پیدا نشد.', 404);
}

/* ---------- page guard ---------- */
async function page(req, env, url) {
  const p = url.pathname.replace(/\/+$/, '') || '/';
  const asset = (path) => env.ASSETS.fetch(new Request(new URL(path, url.origin), { method: 'GET', headers: req.headers }));
  const redirect = (to) => new Response(null, { status: 302, headers: { Location: to, 'Cache-Control': 'no-store' } });
  await ensureSchema(env);
  const me = await getUser(env, req);
  if (p === '/log-in') {
    if (me) return redirect(me.role === 'admin' ? '/manager' : '/user');
    return asset('/log-in');
  }
  if (p === '/user' || p.startsWith('/user/')) {
    if (!me) return redirect('/log-in');
    if (me.role === 'admin') return redirect('/manager');
    return asset('/user');
  }
  if (p === '/manager' || p.startsWith('/manager/')) {
    if (!me) return redirect('/log-in');
    if (me.role !== 'admin') return redirect('/user');
    return asset('/manager');
  }
  if (p.startsWith('/info/')) return asset('/info');
  return env.ASSETS.fetch(req);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    try {
      if (url.pathname.startsWith('/api/')) return await api(req, env, url);
      return await page(req, env, url);
    } catch (e) {
      console.error(e);
      return url.pathname.startsWith('/api/') ? err('خطای داخلی سرور.', 500) : new Response('خطای داخلی سرور', { status: 500 });
    }
  },
};
