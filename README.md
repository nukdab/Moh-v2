# سازمان مدیریت منزل — Management of House

سامانه‌ی ثبت و پیگیری شکایت (فارسی، راست‌به‌چپ) روی Cloudflare Workers + D1.

## مسیرها
| مسیر | توضیح |
|---|---|
| `/` | صفحه‌ی اصلی (Welcome) |
| `/log-in` | ورود، ثبت‌نام و فراموشی رمز عبور |
| `/user`, `/user/complaints`, `/user/complaints/:id`, `/user/new`, `/user/notices`, `/user/profile` | پنل مشتریان |
| `/manager`, `/manager/complaints`, `/manager/complaints/:id`, `/manager/new`, `/manager/notices`, `/manager/feedback`, `/manager/log` | پنل مدیریت |
| `/info/rules`, `/info/about`, `/info/contact` | قوانین، درباره، ارتباط |
| `/api/*` | API (Worker) |

## ساختار
- `src/worker.js` — API، احراز هویت (نشست HttpOnly)، محافظ مسیرها (`/user` و `/manager` بر اساس نقش)، دستیار هوشمند
- `public/` — صفحه‌ها (HTML/CSS/JS ساده)
- `schema.sql` — جدول‌ها (Worker در اولین درخواست خودکار می‌سازد)
- `wrangler.jsonc` — تنظیمات Cloudflare (D1 با نام `DB`، Workers AI با نام `AI`)

## ادمین
هر کاربر ثبت‌نام‌شده را می‌توان ادمین کرد:
```sql
UPDATE users SET role='admin' WHERE mobile='09XXXXXXXXX';
```
یا شماره را در `vars.ADMIN_MOBILES` (جداشده با کاما) در `wrangler.jsonc` بنویسید.

## نکات امنیتی
رمزها با PBKDF2‑SHA256 هش می‌شوند؛ نشست در کوکی `HttpOnly; Secure; SameSite=Lax`؛ بررسی Origin و هدر `X-Requested-With` برای درخواست‌های تغییردهنده؛ CSP و HSTS در `public/_headers`. فایل‌ها فعلاً در D1 ذخیره می‌شوند (حداکثر ۱ مگابایت)؛ با فعال‌کردن R2 می‌توان آن را جابه‌جا کرد.

## اجرای محلی / استقرار
```
npm install
npx wrangler dev
npx wrangler deploy
```
