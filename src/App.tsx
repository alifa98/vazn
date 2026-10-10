import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, CloudDownload, Feather, Library, Moon, Search, Sun, WifiOff } from 'lucide-react';
import { db, type Poet } from './db';
import { normalizePersian } from './utils/persian';
import { DownloadManager } from './components/DownloadManager';
import { PoemReader } from './components/PoemReader';
import { downloadPoet } from './services/downloader';
import { InstallLanding } from './components/InstallLanding';

type View = 'library' | 'downloads';
const API = 'https://api.ganjoor.net/api/ganjoor';

export default function App() {
  const [showApplication, setShowApplication] = useState(() => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
  const poets = useLiveQuery(() => db.poets.toArray(), []) ?? [];
  const [view, setView] = useState<View>('library');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Poet | null>(null);
  const [activePoemId, setActivePoemId] = useState<number | null>(null);
  const [dark, setDark] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [downloadProgress, setDownloadProgress] = useState<Record<number, { completed: number; total: number; message: string }>>({});
  const [downloadErrors, setDownloadErrors] = useState<Record<number, string>>({});
  const [downloading, setDownloading] = useState<Record<number, boolean>>({});
  const poems = useLiveQuery(() => selected ? db.poems.where('poetId').equals(selected.id).toArray() : [], [selected?.id]) ?? [];
  const activePoem = useLiveQuery(() => activePoemId === null ? undefined : db.poems.get(activePoemId), [activePoemId]);
  const verses = useLiveQuery(() => activePoemId === null ? [] : db.verses.where('poemId').equals(activePoemId).sortBy('coupletIndex'), [activePoemId]) ?? [];
  const filtered = useMemo(() => {
    const needle = normalizePersian(query);
    return poets.filter((poet) => !needle || normalizePersian(poet.name).includes(needle));
  }, [poets, query]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  useEffect(() => {
    if (!navigator.onLine) return;
    fetch(`${API}/poets`).then((response) => response.ok ? response.json() : Promise.reject()).then(async (items: Record<string, any>[]) => {
      const records: Poet[] = items.map((item) => ({
        id: item.id, name: item.name, description: item.description, fullUrl: item.fullUrl,
        rootCatId: item.rootCatId, birthYear: item.birthYearInLH, deathYear: item.deathYearInLH,
        isDownloaded: false,
      }));
      await db.transaction('rw', db.poets, async () => {
        const existing = new Map((await db.poets.toArray()).map((poet) => [poet.id, poet]));
        await db.poets.bulkPut(records.map((poet) => ({ ...poet, isDownloaded: existing.get(poet.id)?.isDownloaded ?? false, downloadDate: existing.get(poet.id)?.downloadDate })));
      });
    }).catch(() => undefined);
  }, []);

  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);

  const download = async (poet: Poet) => {
    setDownloading((current) => ({ ...current, [poet.id]: true }));
    setDownloadErrors((current) => ({ ...current, [poet.id]: '' }));
    try {
      await downloadPoet(poet, (progress) => setDownloadProgress((current) => ({ ...current, [poet.id]: progress })));
    } catch (error) {
      setDownloadErrors((current) => ({ ...current, [poet.id]: error instanceof Error ? error.message : 'دریافت ناموفق بود' }));
    } finally {
      setDownloading((current) => ({ ...current, [poet.id]: false }));
    }
  };

  const startReading = (poet: Poet) => {
    setSelected(poet);
    setActivePoemId(null);
    setView('library');
  };
  const showReader = activePoem && selected;

  if (!showApplication) return <InstallLanding onOpenWebApp={() => setShowApplication(true)}/>;

  return <div className="min-h-screen bg-paper text-ink transition-colors dark:bg-night dark:text-nightText">
    <header className="sticky top-0 z-20 border-b border-stone-200/70 bg-paper/90 backdrop-blur-xl dark:border-zinc-800 dark:bg-night/90">
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between px-4 md:px-8">
        <button onClick={() => { setView('library'); setActivePoemId(null); }} className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-amber text-white"><Feather size={19}/></span><span className="text-xl font-bold">وزن</span><span className="hidden text-xs text-stone-500 sm:inline">گنجینهٔ شعر فارسی</span></button>
        <nav className="flex items-center gap-1">
          <button onClick={() => { setView('library'); setActivePoemId(null); }} className={`rounded-xl px-3 py-2 text-sm ${view === 'library' ? 'bg-white text-amber shadow-sm dark:bg-surface' : 'text-stone-500'}`}><span className="inline-flex items-center gap-2"><Library size={16}/>کتابخانه</span></button>
          <button onClick={() => { setView('downloads'); setActivePoemId(null); }} className={`rounded-xl px-3 py-2 text-sm ${view === 'downloads' ? 'bg-white text-amber shadow-sm dark:bg-surface' : 'text-stone-500'}`}><span className="inline-flex items-center gap-2"><CloudDownload size={16}/>دانلودها</span></button>
          <button onClick={() => setDark((value) => !value)} className="ms-1 rounded-xl p-2.5 text-stone-500 hover:bg-white dark:hover:bg-surface" title="تغییر پوسته">{dark ? <Sun size={17}/> : <Moon size={17}/>}</button>
        </nav>
      </div>
    </header>

    {!online && <div className="flex items-center justify-center gap-2 bg-stone-200/70 py-2 text-xs text-stone-600 dark:bg-zinc-900 dark:text-zinc-300"><WifiOff size={14}/> آفلاین هستید · دیوان‌های دریافت‌شده در دسترس‌اند</div>}
    {view === 'downloads' ? <DownloadManager/> : showReader ? <PoemReader poem={activePoem} poetName={selected.name} verses={verses} onBack={() => setActivePoemId(null)} onToggleTheme={() => setDark((value) => !value)}/> : <main className="mx-auto max-w-6xl px-4 pb-24 pt-9 md:px-8 md:pt-14">
      <section className="relative mb-10 overflow-hidden rounded-[2rem] bg-[#efe4cf] px-6 py-9 dark:bg-[#29251f] md:px-12 md:py-14">
        <div className="relative z-10 max-w-2xl"><span className="text-sm font-medium text-amber">کتابخانهٔ شعر فارسی</span><h1 className="mt-3 text-3xl font-semibold leading-relaxed md:text-5xl">هر بیت، <span className="text-amber">همیشه</span> همراه شما</h1><p className="mt-3 max-w-xl text-sm leading-7 text-stone-600 dark:text-zinc-300 md:text-base">شعرهای ماندگار را بخوانید، نگه دارید و حتی بدون اینترنت با خود ببرید.</p></div>
        <div className="pointer-events-none absolute -left-2 -top-8 select-none text-[12rem] leading-none text-amber/10">ش</div>
      </section>

      <section className="mb-10">
        <div className="mb-4 flex items-end justify-between"><div><p className="text-sm text-amber">سفر در شعر</p><h2 className="mt-1 text-2xl font-semibold">شاعران</h2></div><span className="text-xs text-stone-500">{poets.length} شاعر</span></div>
        <label className="mb-5 flex max-w-xl items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3.5 text-stone-400 shadow-sm dark:border-zinc-800 dark:bg-surface"><Search size={19}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="نام شاعر را جستجو کنید…" className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-stone-400 dark:text-white"/></label>
        {filtered.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{filtered.slice(0, 24).map((poet, index) => <article key={poet.id} className="rounded-2xl border border-stone-200/70 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-paper dark:border-zinc-800 dark:bg-surface md:p-5">
          <button onClick={() => startReading(poet)} className="block w-full text-right"><span className={`mb-4 grid h-10 w-10 place-items-center rounded-xl text-lg ${['bg-amber/10 text-amber','bg-emerald-50 text-emerald-700','bg-sky-50 text-sky-700','bg-violet-50 text-violet-700'][index % 4]}`}><BookOpen size={19}/></span><h3 className="font-semibold">{poet.name}</h3><p className="mt-1 line-clamp-1 text-xs text-stone-500">{poet.description || 'مجموعهٔ شعر و آثار'}</p></button>
          <button onClick={() => void download(poet)} disabled={!online || downloading[poet.id]} className="mt-4 inline-flex items-center gap-1.5 text-xs text-amber hover:underline disabled:opacity-50"><CloudDownload size={14}/>{downloading[poet.id] ? 'در حال دریافت…' : poet.isDownloaded ? 'به‌روزرسانی دیوان' : 'دریافت آفلاین'}</button>
          {downloadProgress[poet.id] && <div className="mt-3"><div className="mb-1 flex justify-between text-[11px] text-stone-500"><span>{downloadProgress[poet.id].message}</span><span>{downloadProgress[poet.id].completed}{downloadProgress[poet.id].total ? ` / ${downloadProgress[poet.id].total}` : ''}</span></div><div className="h-1 overflow-hidden rounded-full bg-stone-100 dark:bg-zinc-800"><div className="h-full bg-amber transition-all" style={{ width: `${downloadProgress[poet.id].total ? downloadProgress[poet.id].completed / downloadProgress[poet.id].total * 100 : 12}%` }}/></div></div>}
          {downloadErrors[poet.id] && <p className="mt-2 text-[11px] text-red-600">{downloadErrors[poet.id]}</p>}
        </article>)}</div> : <div className="rounded-2xl border border-dashed border-stone-300 py-12 text-center text-sm text-stone-500 dark:border-zinc-700">{poets.length ? 'شاعری پیدا نشد.' : 'در حال دریافت فهرست شاعران…'}</div>}
      </section>

      {selected && <section className="scroll-mt-24" id="poems"><div className="mb-4 flex items-end justify-between"><div><p className="text-sm text-amber">مجموعهٔ آثار</p><h2 className="mt-1 text-2xl font-semibold">{selected.name}</h2></div><span className="text-xs text-stone-500">{poems.length} شعر ذخیره‌شده</span></div>
        {poems.length ? <div className="grid gap-3 sm:grid-cols-2">{poems.slice(0, 40).map((poem) => <button key={poem.id} onClick={() => setActivePoemId(poem.id)} className="rounded-2xl border border-stone-200/70 bg-white p-5 text-right transition hover:border-amber/40 dark:border-zinc-800 dark:bg-surface"><span className="text-xs text-amber">{poem.rhythm || 'شعر فارسی'}</span><h3 className="mt-2 font-medium">{poem.title}</h3><span className="mt-3 block text-xs text-stone-400">{poem.verseCount} مصراع ←</span></button>)}</div> : <div className="rounded-2xl border border-dashed border-stone-300 px-6 py-10 text-center dark:border-zinc-700"><p className="font-medium">آثاری برای خواندن ذخیره نشده</p><p className="mt-2 text-sm text-stone-500">برای دریافت کامل دیوان، گزینهٔ «دریافت آفلاین» را روی کارت شاعر بزنید.</p></div>}
      </section>}
    </main>}
    <footer className="border-t border-stone-200/70 py-6 text-center text-xs text-stone-400 dark:border-zinc-800">وزن · برای شعر فارسی، با مهر</footer>
  </div>;
}
