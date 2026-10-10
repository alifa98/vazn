import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowUp, BookOpen, CloudDownload, Feather, Heart, Library, Moon, Search, Sun, WifiOff } from 'lucide-react';
import { db, type Category, type Favorite, type Poet } from './db';
import { normalizePersian } from './utils/persian';
import { DownloadManager } from './components/DownloadManager';
import { PoemReader } from './components/PoemReader';
import { downloadPoet } from './services/downloader';
import { InstallLanding } from './components/InstallLanding';
import { SavedPage } from './components/SavedPage';

type View = 'library' | 'downloads' | 'saved';
const API = 'https://api.ganjoor.net/api/ganjoor';

function isInstalledLaunch(): boolean {
  return new URLSearchParams(window.location.search).get('app') === '1'
    || window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: minimal-ui)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
    || localStorage.getItem('vazn-installed') === 'true';
}

export default function App() {
  const [showApplication, setShowApplication] = useState(isInstalledLaunch);
  const poets = useLiveQuery(() => db.poets.toArray(), []) ?? [];
  const favorites = useLiveQuery(() => db.favorites.orderBy('createdAt').reverse().toArray(), []) ?? [];
  const [view, setView] = useState<View>('library');
  const [query, setQuery] = useState('');
  const [downloadedOnly, setDownloadedOnly] = useState(false);
  const [selected, setSelected] = useState<Poet | null>(null);
  const [categoryTrail, setCategoryTrail] = useState<Category[]>([]);
  const [activePoemId, setActivePoemId] = useState<number | null>(null);
  const [dark, setDark] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [downloadProgress, setDownloadProgress] = useState<Record<number, { completed: number; total: number; message: string }>>({});
  const [downloadErrors, setDownloadErrors] = useState<Record<number, string>>({});
  const [downloading, setDownloading] = useState<Record<number, boolean>>({});
  const categories = useLiveQuery(() => selected ? db.categories.where('poetId').equals(selected.id).toArray() : [], [selected?.id]) ?? [];
  const currentCategoryId = categoryTrail[categoryTrail.length - 1]?.id ?? selected?.rootCatId;
  const currentCategory = categories.find((category) => category.id === currentCategoryId);
  const childCategories = categories.filter((category) => category.parentId === currentCategoryId).sort((a, b) => a.title.localeCompare(b.title, 'fa'));
  const bookPoems = useLiveQuery(() => currentCategoryId === undefined ? [] : db.poems.where('categoryId').equals(currentCategoryId).sortBy('id'), [currentCategoryId]) ?? [];
  const activePoem = useLiveQuery(() => activePoemId === null ? undefined : db.poems.get(activePoemId), [activePoemId]);
  const verses = useLiveQuery(async () => {
    if (activePoemId === null) return [];
    const rows = await db.verses.where('poemId').equals(activePoemId).toArray();
    return rows.sort((a, b) => (a.order ?? a.id ?? 0) - (b.order ?? b.id ?? 0));
  }, [activePoemId]) ?? [];
  const filtered = useMemo(() => {
    const needle = normalizePersian(query);
    return poets.filter((poet) => (!downloadedOnly || poet.isDownloaded) && (!needle || normalizePersian(poet.name).includes(needle)))
      .sort((a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name, 'fa'));
  }, [poets, query, downloadedOnly]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  useEffect(() => {
    const handleBack = (event: PopStateEvent) => {
      const state = event.state as { vaznReader?: boolean; poemId?: number } | null;
      setActivePoemId(state?.vaznReader && typeof state.poemId === 'number' ? state.poemId : null);
    };
    window.addEventListener('popstate', handleBack);
    return () => window.removeEventListener('popstate', handleBack);
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
        await db.poets.bulkPut(records.map((poet) => ({ ...poet, isDownloaded: existing.get(poet.id)?.isDownloaded ?? false, downloadDate: existing.get(poet.id)?.downloadDate, sortOrder: existing.get(poet.id)?.sortOrder })));
      });
    }).catch(() => undefined);
  }, []);

  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);
  useEffect(() => {
    const appInstalled = () => {
      localStorage.setItem('vazn-installed', 'true');
      setShowApplication(true);
    };
    const displayMode = window.matchMedia('(display-mode: standalone)');
    const displayChanged = () => { if (displayMode.matches) setShowApplication(true); };
    window.addEventListener('appinstalled', appInstalled);
    displayMode.addEventListener('change', displayChanged);
    return () => {
      window.removeEventListener('appinstalled', appInstalled);
      displayMode.removeEventListener('change', displayChanged);
    };
  }, []);

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

  const leaveReader = () => {
    if (history.state?.vaznReader) history.replaceState({ ...history.state, vaznReader: false, poemId: undefined }, '');
    setActivePoemId(null);
  };

  const openPoem = (poemId: number) => {
    history.pushState({ ...(history.state ?? {}), vaznReader: true, poemId }, '');
    setActivePoemId(poemId);
  };

  const changeReaderPoem = (poemId: number) => {
    history.replaceState({ ...(history.state ?? {}), vaznReader: true, poemId }, '');
    setActivePoemId(poemId);
  };

  const backFromReader = () => {
    if (history.state?.vaznReader) history.back();
    else setActivePoemId(null);
  };

  const startReading = (poet: Poet) => {
    leaveReader();
    setSelected(poet);
    setCategoryTrail([]);
    setView('library');
  };

  const movePoet = async (poetId: number, direction: -1 | 1) => {
    const ordered = poets.filter((poet) => poet.isDownloaded).sort((a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name, 'fa'));
    const index = ordered.findIndex((poet) => poet.id === poetId);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= ordered.length) return;
    [ordered[index], ordered[next]] = [ordered[next], ordered[index]];
    await db.poets.bulkPut(ordered.map((poet, sortOrder) => ({ ...poet, sortOrder })));
  };

  const togglePoemFavorite = async (poemId: number, poet: Poet, poemTitle: string) => {
    const existing = await db.favorites.where({ targetType: 'poem', targetId: poemId, poemId }).first();
    if (existing?.id !== undefined) await db.favorites.delete(existing.id);
    else await db.favorites.add({ targetType: 'poem', targetId: poemId, poemId, poetId: poet.id, poetName: poet.name, poemTitle, previewText: poemTitle, createdAt: Date.now() });
  };

  const openFavorite = async (favorite: Favorite) => {
    const poem = await db.poems.get(favorite.poemId);
    const poet = poem ? await db.poets.get(poem.poetId) : undefined;
    if (!poem || !poet) return;
    const categories = await db.categories.where('poetId').equals(poet.id).toArray();
    const trail: Category[] = [];
    let current = categories.find((category) => category.id === poem.categoryId);
    while (current?.parentId !== undefined) {
      trail.unshift(current);
      current = categories.find((category) => category.id === current?.parentId);
    }
    setSelected(poet);
    setCategoryTrail(trail);
    openPoem(poem.id);
    setView('library');
  };
  const showReader = activePoem && selected;
  const activePoemIndex = activePoem ? bookPoems.findIndex((poem) => poem.id === activePoem.id) : -1;

  if (!showApplication) return <InstallLanding onOpenWebApp={() => setShowApplication(true)}/>;

  return <div className="min-h-screen bg-paper text-ink transition-colors dark:bg-night dark:text-nightText">
    <header className="sticky top-0 z-20 border-b border-stone-200/70 bg-paper/90 backdrop-blur-xl dark:border-zinc-800 dark:bg-night/90">
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between px-4 md:px-8">
        <button onClick={() => { leaveReader(); setView('library'); setSelected(null); setCategoryTrail([]); }} className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-amber text-white"><Feather size={19}/></span><span className="text-xl font-bold">وزن</span><span className="hidden text-xs text-stone-500 sm:inline">گنجینهٔ شعر فارسی</span></button>
        <nav className="flex items-center gap-1">
          <button onClick={() => { leaveReader(); setView('library'); }} className={`rounded-xl px-2 py-2 text-sm sm:px-3 ${view === 'library' ? 'bg-white text-amber shadow-sm dark:bg-surface' : 'text-stone-500'}`} aria-label="کتابخانه" title="کتابخانه"><span className="inline-flex items-center gap-2"><Library size={18}/><span className="hidden sm:inline">کتابخانه</span></span></button>
          <button onClick={() => { leaveReader(); setView('saved'); }} className={`rounded-xl px-2 py-2 text-sm sm:px-3 ${view === 'saved' ? 'bg-white text-amber shadow-sm dark:bg-surface' : 'text-stone-500'}`} aria-label="ذخیره‌ها" title="ذخیره‌ها"><span className="inline-flex items-center gap-2"><Heart size={18}/><span className="hidden sm:inline">ذخیره‌ها</span></span></button>
          <button onClick={() => { leaveReader(); setView('downloads'); }} className={`rounded-xl px-2 py-2 text-sm sm:px-3 ${view === 'downloads' ? 'bg-white text-amber shadow-sm dark:bg-surface' : 'text-stone-500'}`} aria-label="دانلودها" title="دانلودها"><span className="inline-flex items-center gap-2"><CloudDownload size={18}/><span className="hidden sm:inline">دانلودها</span></span></button>
          <button onClick={() => setDark((value) => !value)} className="ms-1 rounded-xl p-2.5 text-stone-500 hover:bg-white dark:hover:bg-surface" title="تغییر پوسته">{dark ? <Sun size={17}/> : <Moon size={17}/>}</button>
        </nav>
      </div>
    </header>

    {!online && <div className="flex items-center justify-center gap-2 bg-stone-200/70 py-2 text-xs text-stone-600 dark:bg-zinc-900 dark:text-zinc-300"><WifiOff size={14}/> آفلاین هستید · دیوان‌های دریافت‌شده در دسترس‌اند</div>}
    {view === 'downloads' ? <DownloadManager/> : view === 'saved' ? <SavedPage favorites={favorites} onOpen={(favorite) => void openFavorite(favorite)} onRemove={(favorite) => { if (favorite.id !== undefined) void db.favorites.delete(favorite.id); }}/> : showReader ? <PoemReader poem={activePoem} poetName={selected.name} verses={verses} poemSaved={favorites.some((favorite) => favorite.targetType === 'poem' && favorite.poemId === activePoem.id)} onTogglePoemSaved={() => void togglePoemFavorite(activePoem.id, selected, activePoem.title)} onBack={backFromReader} onPrevious={activePoemIndex > 0 ? () => changeReaderPoem(bookPoems[activePoemIndex - 1].id) : undefined} onNext={activePoemIndex >= 0 && activePoemIndex < bookPoems.length - 1 ? () => changeReaderPoem(bookPoems[activePoemIndex + 1].id) : undefined} position={activePoemIndex >= 0 ? { current: activePoemIndex + 1, total: bookPoems.length } : undefined} onToggleTheme={() => setDark((value) => !value)}/> : <main className="mx-auto max-w-6xl px-4 pb-24 pt-9 md:px-8 md:pt-14">
      {!selected && <>
      <section className="relative mb-10 overflow-hidden rounded-[2rem] bg-[#efe4cf] px-6 py-9 dark:bg-[#29251f] md:px-12 md:py-14">
        <div className="relative z-10 max-w-2xl"><span className="text-sm font-medium text-amber">کتابخانهٔ شعر فارسی</span><h1 className="mt-3 text-3xl font-semibold leading-relaxed md:text-5xl">هر بیت، <span className="text-amber">همیشه</span> همراه شما</h1><p className="mt-3 max-w-xl text-sm leading-7 text-stone-600 dark:text-zinc-300 md:text-base">شعرهای ماندگار را بخوانید، نگه دارید و حتی بدون اینترنت با خود ببرید.</p></div>
        <div className="pointer-events-none absolute -left-2 -top-8 select-none text-[12rem] leading-none text-amber/10">ش</div>
      </section>

      <section className="mb-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm text-amber">سفر در شعر</p><h2 className="mt-1 text-2xl font-semibold">شاعران</h2></div><div className="flex items-center gap-3"><button onClick={() => setDownloadedOnly((value) => !value)} aria-pressed={downloadedOnly} className={`rounded-xl border px-3 py-2 text-xs ${downloadedOnly ? 'border-amber bg-amber/10 text-amber' : 'border-stone-200 text-stone-500 dark:border-zinc-700'}`}>{downloadedOnly ? 'فقط دریافت‌شده‌ها' : 'نمایش همهٔ شاعران'}</button><span className="text-xs text-stone-500">{filtered.length} شاعر</span></div></div>
        <label className="mb-5 flex max-w-xl items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3.5 text-stone-400 shadow-sm dark:border-zinc-800 dark:bg-surface"><Search size={19}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="نام شاعر را جستجو کنید…" className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-stone-400 dark:text-white"/></label>
        {filtered.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{filtered.slice(0, downloadedOnly ? filtered.length : 24).map((poet, index) => <article key={poet.id} className="rounded-2xl border border-stone-200/70 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-paper dark:border-zinc-800 dark:bg-surface md:p-5">
          <div className="flex items-start justify-between gap-2"><button onClick={() => startReading(poet)} className="block min-w-0 flex-1 text-right"><span className={`mb-4 grid h-10 w-10 place-items-center rounded-xl text-lg ${['bg-amber/10 text-amber','bg-emerald-50 text-emerald-700','bg-sky-50 text-sky-700','bg-violet-50 text-violet-700'][index % 4]}`}><BookOpen size={19}/></span><h3 className="font-semibold">{poet.name}</h3><p className="mt-1 line-clamp-1 text-xs text-stone-500">{poet.description || 'مجموعهٔ شعر و آثار'}</p></button>{downloadedOnly && poet.isDownloaded && <div className="flex shrink-0 flex-col"><button onClick={() => void movePoet(poet.id, -1)} disabled={index === 0} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-amber disabled:opacity-30 dark:hover:bg-zinc-800" aria-label="انتقال شاعر به ابتدا"><ArrowUp size={16}/></button><button onClick={() => void movePoet(poet.id, 1)} disabled={index === filtered.length - 1} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-amber disabled:opacity-30 dark:hover:bg-zinc-800" aria-label="انتقال شاعر به انتها"><ArrowDown size={16}/></button></div>}</div>
          <button onClick={() => void download(poet)} disabled={!online || downloading[poet.id]} className="mt-4 inline-flex items-center gap-1.5 text-xs text-amber hover:underline disabled:opacity-50"><CloudDownload size={14}/>{downloading[poet.id] ? 'در حال دریافت…' : poet.isDownloaded ? 'به‌روزرسانی دیوان' : 'دریافت آفلاین'}</button>
          {downloadProgress[poet.id] && <div className="mt-3"><div className="mb-1 flex justify-between text-[11px] text-stone-500"><span>{downloadProgress[poet.id].message}</span><span>{downloadProgress[poet.id].completed}{downloadProgress[poet.id].total ? ` / ${downloadProgress[poet.id].total}` : ''}</span></div><div className="h-1 overflow-hidden rounded-full bg-stone-100 dark:bg-zinc-800"><div className="h-full bg-amber transition-all" style={{ width: `${downloadProgress[poet.id].total ? downloadProgress[poet.id].completed / downloadProgress[poet.id].total * 100 : 12}%` }}/></div></div>}
          {downloadErrors[poet.id] && <p className="mt-2 text-[11px] text-red-600">{downloadErrors[poet.id]}</p>}
        </article>)}</div> : <div className="rounded-2xl border border-dashed border-stone-300 py-12 text-center text-sm text-stone-500 dark:border-zinc-700">{poets.length ? 'شاعری پیدا نشد.' : 'در حال دریافت فهرست شاعران…'}</div>}
      </section>
      </>}

      {selected && <section className="scroll-mt-24" id="poems">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm text-amber">کتابخانهٔ شاعر</p><h2 className="mt-1 text-2xl font-semibold">{selected.name}</h2></div><button onClick={() => { setSelected(null); setCategoryTrail([]); setActivePoemId(null); }} className="text-sm text-stone-500 hover:text-amber">بازگشت به شاعران</button></div>
        <nav aria-label="مسیر دیوان" className="mb-5 flex flex-wrap items-center gap-2 text-sm text-stone-500"><button onClick={() => setCategoryTrail([])} className="hover:text-amber">{selected.name}</button>{categoryTrail.map((category, index) => <span key={category.id} className="inline-flex items-center gap-2"><span>/</span><button onClick={() => setCategoryTrail(categoryTrail.slice(0, index + 1))} className="hover:text-amber">{category.title}</button></span>)}</nav>
        <div className="mb-4 flex items-end justify-between"><h3 className="text-lg font-medium">{currentCategory?.title ?? 'کتاب‌ها و بخش‌ها'}</h3><span className="text-xs text-stone-500">{childCategories.length} بخش · {bookPoems.length} شعر</span></div>
        {childCategories.length > 0 && <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{childCategories.map((category) => <button key={category.id} onClick={() => setCategoryTrail((trail) => [...trail, category])} className="flex items-center gap-4 rounded-2xl border border-stone-200/70 bg-white p-5 text-right transition hover:border-amber/40 hover:shadow-paper dark:border-zinc-800 dark:bg-surface"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber/10 text-amber"><BookOpen size={20}/></span><span className="min-w-0 flex-1"><span className="block font-medium">{category.title}</span><span className="mt-1 block text-xs text-stone-500">کتاب / بخش شعر</span></span><span className="text-stone-400">←</span></button>)}</div>}
        {bookPoems.length > 0 && <><h3 className="mb-3 mt-7 text-sm font-semibold text-stone-500">شعرهای این بخش</h3><div className="grid gap-3 sm:grid-cols-2">{bookPoems.map((poem, index) => <button key={poem.id} onClick={() => openPoem(poem.id)} className="rounded-2xl border border-stone-200/70 bg-white p-5 text-right transition hover:border-amber/40 dark:border-zinc-800 dark:bg-surface"><span className="text-xs text-amber">{poem.rhythm || 'شعر فارسی'} · {index + 1}</span><h3 className="mt-2 font-medium">{poem.title}</h3><span className="mt-3 block text-xs text-stone-400">{poem.verseCount} مصراع ←</span></button>)}</div></>}
        {!childCategories.length && !bookPoems.length && <div className="rounded-2xl border border-dashed border-stone-300 px-6 py-10 text-center dark:border-zinc-700"><p className="font-medium">محتوای ذخیره‌شده‌ای در این بخش نیست</p><p className="mt-2 text-sm text-stone-500">برای دیدن کتاب‌ها و شعرها، دریافت آفلاین شاعر را کامل کنید.</p></div>}
      </section>}
    </main>}
    <footer className="border-t border-stone-200/70 py-6 text-center text-xs text-stone-400 dark:border-zinc-800">وزن · برای شعر فارسی، با مهر</footer>
  </div>;
}
