import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertCircle, CheckCircle2, CloudDownload, HardDrive, LoaderCircle, Trash2 } from 'lucide-react';
import { db, type Poet } from '../db';
import { deletePoetDownload, downloadPoet } from '../services/downloader';

export function DownloadManager() {
  const poets = useLiveQuery(() => db.poets.toArray(), []) ?? [];
  const [progress, setProgress] = useState<Record<number, { completed: number; total: number; message: string }>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [usage, setUsage] = useState<number | null>(null);
  const [usageByPoet, setUsageByPoet] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState<Record<number, boolean>>({});
  const localPoets = poets.filter((poet) => poet.isDownloaded);

  const storage = async () => {
    if (navigator.storage?.estimate) {
      const result = await navigator.storage.estimate();
      setUsage(result.usage ?? 0);
    }
    const sizes: Record<number, number> = {};
    for (const poet of localPoets) {
      const poems = await db.poems.where('poetId').equals(poet.id).toArray();
      const poemIds = poems.map((poem) => poem.id);
      const [categories, verses] = await Promise.all([
        db.categories.where('poetId').equals(poet.id).toArray(),
        poemIds.length ? db.verses.where('poemId').anyOf(poemIds).toArray() : Promise.resolve([]),
      ]);
      sizes[poet.id] = new TextEncoder().encode(JSON.stringify({ poet, poems, categories, verses })).byteLength;
    }
    setUsageByPoet(sizes);
  };
  useEffect(() => { void storage(); }, [localPoets.map((poet) => poet.id).join(',')]);
  const start = async (poet: Poet) => {
    setBusy((items) => ({ ...items, [poet.id]: true }));
    setErrors((items) => ({ ...items, [poet.id]: '' }));
    try { await downloadPoet(poet, (value) => setProgress((items) => ({ ...items, [poet.id]: value }))); }
    catch (error) { setErrors((items) => ({ ...items, [poet.id]: error instanceof Error ? error.message : 'دریافت ناموفق بود' })); }
    finally { setBusy((items) => ({ ...items, [poet.id]: false })); }
  };
  const remove = async (poet: Poet) => { await deletePoetDownload(poet.id); setProgress((items) => { const next = { ...items }; delete next[poet.id]; return next; }); };
  const bytes = usage === null ? 'برای مشاهده، روی به‌روزرسانی بزنید' : `${(usage / 1024 / 1024).toFixed(1)} مگابایت`;

  return <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-8 md:px-8 md:pt-12">
    <div className="mb-8">
      <p className="text-sm font-medium text-amber">کتابخانهٔ شما</p><h1 className="mt-2 text-3xl font-semibold">مدیریت دانلودها</h1>
      <p className="mt-2 text-stone-500 dark:text-nightMuted">دیوان‌های دریافت‌شده بدون اینترنت هم در دسترس هستند.</p>
    </div>
    <section className="mb-6 flex items-center justify-between rounded-2xl border border-stone-200/70 bg-white p-5 dark:border-zinc-800 dark:bg-surface">
      <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-amber/10 text-amber"><HardDrive size={20}/></span><div><p className="font-medium">فضای ذخیره‌سازی</p><p className="mt-1 text-sm text-stone-500">{bytes}</p></div></div>
      <button onClick={() => void storage()} className="text-sm text-amber hover:underline">به‌روزرسانی</button>
    </section>
    <h2 className="mb-3 text-sm font-semibold text-stone-500">دیوان‌های آفلاین · {localPoets.length}</h2>
    <div className="space-y-3">
      {localPoets.map((poet) => {
        const state = progress[poet.id]; const pct = state?.total ? Math.round(state.completed / state.total * 100) : 100;
        return <article key={poet.id} className="rounded-2xl border border-stone-200/70 bg-white p-5 dark:border-zinc-800 dark:bg-surface">
          <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="text-2xl">✦</span><div><h3 className="font-medium">{poet.name}</h3><p className="mt-1 text-xs text-stone-500">{poet.downloadDate ? `دریافت‌شده در ${new Date(poet.downloadDate).toLocaleDateString('fa-IR')}` : 'ذخیره‌شده برای استفادهٔ آفلاین'}</p></div></div>
            <div className="flex items-center gap-2">{state && state.completed < state.total ? <LoaderCircle className="animate-spin text-amber" size={18}/> : <CheckCircle2 className="text-emerald-600" size={18}/>}<button onClick={() => void remove(poet)} className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950" title="حذف دانلود"><Trash2 size={17}/></button></div>
          </div>
          {usageByPoet[poet.id] !== undefined && <p className="mt-3 text-xs text-stone-500">حجم تخمینی این دیوان: حدود {(usageByPoet[poet.id] / 1024).toFixed(0)} کیلوبایت</p>}
          {state && <div className="mt-4"><div className="mb-2 flex justify-between text-xs text-stone-500"><span>{state.message}</span><span>{pct}% · {state.completed} از {state.total}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-zinc-800"><div className="h-full rounded-full bg-amber transition-all" style={{ width: `${pct}%` }}/></div></div>}
          {errors[poet.id] && <p className="mt-3 flex items-center gap-2 text-xs text-red-600"><AlertCircle size={15}/>{errors[poet.id]}</p>}
          <button onClick={() => void start(poet)} disabled={busy[poet.id] || !navigator.onLine} className="mt-4 inline-flex items-center gap-2 text-xs text-amber hover:underline disabled:opacity-50"><CloudDownload size={15}/> {busy[poet.id] ? 'در حال دریافت…' : 'دریافت دوباره / تکمیل'}</button>
        </article>;
      })}
      {!localPoets.length && <div className="rounded-2xl border border-dashed border-stone-300 px-6 py-14 text-center dark:border-zinc-700"><CloudDownload className="mx-auto text-stone-400"/><p className="mt-3 font-medium">هنوز دیوانی دریافت نکرده‌اید</p><p className="mt-1 text-sm text-stone-500">از بخش کتابخانه یک شاعر را انتخاب کنید.</p></div>}
    </div>
  </main>;
}
