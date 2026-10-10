import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Bookmark, Check, ListOrdered, Minus, Plus, SunMoon } from 'lucide-react';
import type { Poem, Verse } from '../db';
import { PoemRenderer } from './PoemRenderer';

interface Props {
  poem: Poem; poetName: string; verses: Verse[]; onBack: () => void; onToggleTheme: () => void;
  onPrevious?: () => void; onNext?: () => void; position?: { current: number; total: number };
  poemSaved?: boolean; onTogglePoemSaved?: () => void;
}

export function PoemReader({ poem, poetName, verses, onBack, onToggleTheme, onPrevious, onNext, position, poemSaved = false, onTogglePoemSaved }: Props) {
  const [fontSize, setFontSize] = useState(20);
  const [showVerseNumbers, setShowVerseNumbers] = useState(false);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [poem.id]);
  return <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-7 md:px-8 md:pt-12">
    <div className="mb-8 flex items-center justify-between">
      <button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-stone-600 hover:bg-white dark:text-zinc-300 dark:hover:bg-surface"><ArrowRight size={17}/> بازگشت به کتابخانه</button>
      <div className="flex items-center gap-1 rounded-xl bg-white/70 p-1 dark:bg-surface">
        <button onClick={() => setFontSize((size) => Math.max(16, size - 1))} className="p-2" title="کوچک‌تر"><Minus size={16}/></button>
        <span className="min-w-9 text-center text-xs">{fontSize}</span>
        <button onClick={() => setFontSize((size) => Math.min(30, size + 1))} className="p-2" title="بزرگ‌تر"><Plus size={16}/></button>
        <span className="mx-1 h-5 w-px bg-stone-200 dark:bg-zinc-700" />
        <button onClick={() => setShowVerseNumbers((shown) => !shown)} className={`rounded-lg p-2 ${showVerseNumbers ? 'bg-amber/15 text-amber' : ''}`} title="نمایش شمارهٔ بیت‌ها" aria-label="نمایش شمارهٔ بیت‌ها" aria-pressed={showVerseNumbers}><ListOrdered size={16}/></button>
        <span className="mx-1 h-5 w-px bg-stone-200 dark:bg-zinc-700" />
        <button onClick={onToggleTheme} className="p-2" title="تغییر پوسته"><SunMoon size={16}/></button>
      </div>
    </div>
    <section className="overflow-hidden rounded-[2rem] border border-stone-200/70 bg-white/80 shadow-paper dark:border-zinc-800 dark:bg-surface">
      <header className="border-b border-stone-200/70 px-6 py-10 text-center dark:border-zinc-800 md:px-12 md:py-14">
        <span className="text-sm text-amber">{poetName}</span>
        <h1 className="mt-3 text-3xl font-medium leading-relaxed md:text-4xl">{poem.title}</h1>
        {poem.rhythm && <p className="mt-4 text-sm text-stone-500 dark:text-nightMuted">وزن: {poem.rhythm}</p>}
        {onTogglePoemSaved && <button onClick={onTogglePoemSaved} aria-pressed={poemSaved} className={`mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm ${poemSaved ? 'bg-amber/10 text-amber' : 'bg-stone-100 text-stone-600 hover:text-amber dark:bg-zinc-800 dark:text-zinc-300'}`}><span>{poemSaved ? <Check size={16}/> : <Bookmark size={16}/>}</span>{poemSaved ? 'ذخیره‌شده' : 'ذخیرهٔ شعر'}</button>}
      </header>
      <PoemRenderer poem={poem} poetName={poetName} verses={verses} fontSize={fontSize} showVerseNumbers={showVerseNumbers}/>
      {!verses.length && <p className="p-12 text-center text-stone-500">برای این شعر هنوز بیتی ذخیره نشده است.</p>}
    </section>
    {(onPrevious || onNext || position) && <nav aria-label="حرکت در همین بخش" className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-stone-200/70 bg-white/80 p-3 dark:border-zinc-800 dark:bg-surface">
      <button onClick={onPrevious} disabled={!onPrevious} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-35 dark:text-zinc-200 dark:hover:bg-zinc-800"><ArrowRight size={17}/> شعر قبلی</button>
      <span className="text-xs text-stone-500">{position ? `${position.current} از ${position.total}` : 'این بخش'}</span>
      <button onClick={onNext} disabled={!onNext} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-35 dark:text-zinc-200 dark:hover:bg-zinc-800">شعر بعدی <ArrowLeft size={17}/></button>
    </nav>}
  </main>;
}
