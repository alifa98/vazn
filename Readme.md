# وزن

وزن یک برنامهٔ وب پیش‌رونده برای خواندن و نگهداری شعر فارسی است. پس از دریافت آثار، می‌توانید آن‌ها را بدون اینترنت هم بخوانید.

## اجرا در رایانهٔ خودتان

ابتدا وابستگی‌ها را نصب کنید و برنامه را اجرا کنید:

```bash
npm install
npm run dev
```

## ساخت نسخهٔ نهایی

برای ساخت و پیش‌نمایش نسخهٔ قابل انتشار:

```bash
npm run build
npm run preview
```

## انتشار روی وب‌سایت ایستا

دستور زیر فایل‌های ساخته‌شده را به پوشهٔ `docs` کپی و برای ثبت در Git آماده می‌کند:

```bash
npm run deploy
```

سپس تغییرات را ثبت و به مخزن بفرستید:

```bash
git commit -m "deploy"
git push
```

در تنظیمات میزبانی، پوشهٔ `docs` را به‌عنوان پوشهٔ انتشار انتخاب کنید. برای نصب برنامه و استفاده از قابلیت‌های آفلاین، وب‌سایت باید از طریق HTTPS ارائه شود.

# Vazn


Build locally with:

```bash
npm install
npm run dev
```

Build for production with:

```bash
npm run build
npm run preview # for local testing
```

move the files to the root of the website:

```bash
npm run deploy
```
then `git add .` and `git commit -m "deploy"` and `git push` to deploy the website.
