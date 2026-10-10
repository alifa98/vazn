import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Check, Download, Feather, HardDrive, Share, Sparkles, X } from 'lucide-react';

interface Props { onOpenWebApp: () => void }

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function installHelp(): string {
  const agent = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(agent)) return 'در Safari روی دکمهٔ اشتراک‌گذاری بزنید، سپس «افزودن به صفحهٔ اصلی» را انتخاب کنید.';
  if (/Macintosh/i.test(agent) && /Safari/i.test(agent) && !/Chrome|Chromium/i.test(agent)) return 'در Safari از منوی File گزینهٔ «Add to Dock» را انتخاب کنید.';
  if (/Firefox/i.test(agent)) return 'Firefox دسکتاپ نصب مستقیم PWA را ارائه نمی‌کند. برای نصب، همین نشانی را در Chrome یا Edge باز کنید؛ یا در Firefox از سایت استفاده کنید.';
  return 'از منوی مرورگر، گزینهٔ «Install app» یا «نصب برنامه» را انتخاب کنید. اگر گزینه را نمی‌بینید، صفحه را با HTTPS باز کنید و دوباره تلاش کنید.';
}

export function InstallLanding({ onOpenWebApp }: Props) {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const appInstalled = () => { setInstalled(true); setPromptEvent(null); };
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', appInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', appInstalled);
    };
  }, []);

  const install = async () => {
    if (!promptEvent) { setHelpOpen(true); return; }
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
      else setHelpOpen(true);
    } catch {
      setHelpOpen(true);
    } finally {
      setPromptEvent(null);
    }
  };

  return <main className="relative min-h-screen overflow-hidden bg-[#faf7f0] px-5 pb-12 pt-7 text-stone-900 dark:bg-[#121214] dark:text-zinc-100 sm:px-8">
    <div className="pointer-events-none absolute -left-32 top-24 h-96 w-96 rounded-full bg-amber/10 blur-3xl" />
    <div className="pointer-events-none absolute -right-36 bottom-0 h-96 w-96 rounded-full bg-orange-900/5 blur-3xl" />
    <header className="relative mx-auto flex max-w-6xl items-center justify-between">
      <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber text-white shadow-lg shadow-amber/20"><Feather size={23}/></span><div><p className="text-xl font-bold">وزن</p><p className="text-[11px] text-stone-500 dark:text-zinc-400">گنجینهٔ شعر فارسی</p></div></div>
      <span className="rounded-full border border-stone-200 bg-white/70 px-3 py-1.5 text-xs text-stone-500 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300">رایگان · بدون حساب کاربری</span>
    </header>

    <section className="relative mx-auto grid max-w-6xl items-center gap-12 pb-12 pt-16 md:grid-cols-[1.1fr_.9fr] md:pb-24 md:pt-24">
      <div className="relative z-10">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-amber/10 px-3 py-1.5 text-xs font-medium text-amber"><Sparkles size={14}/> شعر فارسی، همیشه همراه شما</div>
        <h1 className="max-w-2xl text-4xl font-semibold leading-[1.55] tracking-tight sm:text-5xl md:text-6xl">یک کتابخانهٔ شعر،<br/><span className="text-amber">همیشه در جیب شما</span></h1>
        <p className="mt-6 max-w-xl text-base leading-8 text-stone-600 dark:text-zinc-300 sm:text-lg">دیوان‌های محبوبتان را یک‌بار دریافت کنید؛ بعد، شعر بخوانید و بیت‌ها را نشان بگذارید، حتی وقتی اینترنت ندارید.</p>
        <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <button onClick={() => void install()} className="group inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-amber px-7 text-lg font-semibold text-white shadow-xl shadow-amber/20 transition hover:-translate-y-0.5 hover:bg-amber-800 sm:w-auto">
            {installed ? <Check size={22}/> : <Download size={22}/>}<span>{installed ? 'وزن نصب شد' : 'نصب / به‌روزرسانی وزن'}</span>{!installed && <ArrowLeft className="transition group-hover:-translate-x-1" size={19}/>}
          </button>
          <p className="max-w-xs text-xs leading-6 text-stone-500 dark:text-zinc-400">نصب رایگان است؛ پس از نصب، برنامه را از صفحهٔ اصلی یا فهرست برنامه‌ها باز کنید.</p>
        </div>
        {installed && <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">برنامه آماده است. آیکن وزن را برای باز کردن نسخهٔ کامل پیدا کنید.</p>}
        <div className="mt-10 flex items-center gap-3 text-xs text-stone-500 dark:text-zinc-400"><span className="flex -space-x-2 space-x-reverse">{['ح','س','م'].map((letter) => <span key={letter} className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#faf7f0] bg-[#ead8bb] font-medium text-amber dark:border-[#121214]">{letter}</span>)}</span><span>از حافظ و سعدی تا هزاران شاعر دیگر</span></div>
      </div>

      <div className="relative mx-auto w-full max-w-[440px]">
        <div className="absolute inset-8 rounded-[3rem] bg-amber/20 blur-3xl" />
        <div className="relative rotate-1 rounded-[2.5rem] border border-stone-200/80 bg-white p-3 shadow-2xl shadow-stone-900/10 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="overflow-hidden rounded-[2rem] bg-[#faf7f0] dark:bg-[#171719]">
            <div className="flex items-center justify-between border-b border-stone-200/70 px-5 py-4 dark:border-zinc-800"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-amber text-white"><Feather size={16}/></span><span className="font-bold">وزن</span></div><span className="text-xs text-stone-400">کتابخانه</span></div>
            <div className="p-5"><div className="rounded-2xl bg-[#efe4cf] p-5 dark:bg-[#29251f]"><p className="text-xs text-amber">یک بیت برای امروز</p><p className="mt-3 text-xl leading-10">بنی‌آدم اعضای یکدیگرند<br/>که در آفرینش ز یک گوهرند</p><p className="mt-3 text-xs text-stone-500">سعدی</p></div>
              <div className="mt-5 flex items-center justify-between"><div><p className="text-sm font-semibold">شاعران محبوب</p><p className="mt-1 text-[11px] text-stone-500">برای شروع انتخاب کنید</p></div><span className="text-xs text-amber">همهٔ شاعران ←</span></div>
              <div className="mt-3 grid grid-cols-3 gap-2">{['حافظ','سعدی','فردوسی'].map((name) => <div key={name} className="rounded-xl border border-stone-200 bg-white p-3 text-center text-sm dark:border-zinc-800 dark:bg-zinc-900"><span className="mx-auto mb-2 grid h-8 w-8 place-items-center rounded-lg bg-amber/10 text-amber"><BookOpen size={16}/></span>{name}</div>)}</div>
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"><HardDrive size={15}/> شعرها برای خواندن آفلاین ذخیره می‌شوند</div>
            </div>
          </div>
        </div>
        <span className="absolute -left-4 top-1/3 grid h-14 w-14 place-items-center rounded-2xl border border-stone-200 bg-white text-amber shadow-lg dark:border-zinc-700 dark:bg-zinc-900"><BookOpen/></span>
        <span className="absolute -right-4 bottom-20 grid h-14 w-14 place-items-center rounded-2xl border border-stone-200 bg-white text-emerald-700 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"><Check/></span>
      </div>
    </section>

    <section className="relative mx-auto grid max-w-6xl gap-4 border-t border-stone-200/80 pt-8 dark:border-zinc-800 sm:grid-cols-3">
      {[['یک بار نصب', 'آیکن وزن را به صفحهٔ اصلی بیاورید'], ['دریافت دیوان', 'شاعرها و کتاب‌های دلخواهتان را ذخیره کنید'], ['همیشه در دسترس', 'خواندن آفلاین، با نشانک‌های خودتان']].map(([title, description], index) => <div key={title} className="flex items-start gap-3 rounded-2xl p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-amber shadow-sm dark:bg-zinc-900">{index === 0 ? <Download size={17}/> : index === 1 ? <BookOpen size={17}/> : <HardDrive size={17}/>}</span><div><p className="font-medium">{title}</p><p className="mt-1 text-xs leading-5 text-stone-500 dark:text-zinc-400">{description}</p></div></div>)}
    </section>
    <footer className="relative mx-auto mt-7 max-w-6xl text-center text-xs text-stone-400">وزن · ساخته‌شده برای دوستداران شعر فارسی</footer>

    {helpOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation" onClick={() => setHelpOpen(false)}>
      <section role="dialog" aria-modal="true" aria-labelledby="install-title" onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
        <div className="flex items-start justify-between"><div><p className="text-sm text-amber">راه‌اندازی آسان</p><h2 id="install-title" className="mt-1 text-xl font-semibold">نصب وزن روی دستگاه</h2></div><button onClick={() => setHelpOpen(false)} aria-label="بستن" className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-zinc-800"><X size={18}/></button></div>
        <p className="mt-4 flex items-start gap-3 text-sm leading-7 text-stone-600 dark:text-zinc-300">{/iPhone|iPad|iPod/i.test(navigator.userAgent) ? <Share className="mt-1 shrink-0 text-amber" size={18}/> : <Download className="mt-1 shrink-0 text-amber" size={18}/>}<span>{installHelp()}</span></p>
        <p className="mt-3 rounded-xl bg-stone-50 p-3 text-xs leading-6 text-stone-500 dark:bg-zinc-800 dark:text-zinc-400">به‌روزرسانی‌های برنامه پس از انتشار به‌طور خودکار دریافت می‌شوند.</p>
        <button onClick={() => setHelpOpen(false)} className="mt-5 w-full rounded-xl bg-amber py-3 font-medium text-white">متوجه شدم</button>
        <button onClick={onOpenWebApp} className="mt-3 w-full rounded-xl py-2 text-sm text-stone-500 hover:bg-stone-50 dark:hover:bg-zinc-800">فعلاً استفاده در همین مرورگر</button>
      </section>
    </div>}
  </main>;
}
