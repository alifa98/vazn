import { useState } from 'react';
import { ArrowRight, Minus, Plus, SunMoon } from 'lucide-react';
import type { Poem, Verse } from '../db';
import { PoemRenderer } from './PoemRenderer';

interface Props { poem: Poem; poetName: string; verses: Verse[]; onBack: () => void; onToggleTheme: () => void }

export function PoemReader({ poem, poetName, verses, onBack, onToggleTheme }: Props) {
  const [fontSize, setFontSize] = useState(20);
  return <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-7 md:px-8 md:pt-12">
    <div className="mb-8 flex items-center justify-between">
      <button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-stone-600 hover:bg-white dark:text-zinc-300 dark:hover:bg-surface"><ArrowRight size={17}/> بازگشت به کتابخانه</button>
      <div className="flex items-center gap-1 rounded-xl bg-white/70 p-1 dark:bg-surface">
        <button onClick={() => setFontSize((size) => Math.max(16, size - 1))} className="p-2" title="کوچک‌تر"><Minus size={16}/></button>
        <span className="min-w-9 text-center text-xs">{fontSize}</span>
        <button onClick={() => setFontSize((size) => Math.min(30, size + 1))} className="p-2" title="بزرگ‌تر"><Plus size={16}/></button>
        <span className="mx-1 h-5 w-px bg-stone-200 dark:bg-zinc-700" />
        <button onClick={onToggleTheme} className="p-2" title="تغییر پوسته"><SunMoon size={16}/></button>
      </div>
    </div>
    <section className="overflow-hidden rounded-[2rem] border border-stone-200/70 bg-white/80 shadow-paper dark:border-zinc-800 dark:bg-surface">
      <header className="border-b border-stone-200/70 px-6 py-10 text-center dark:border-zinc-800 md:px-12 md:py-14">
        <span className="text-sm text-amber">{poetName}</span>
        <h1 className="mt-3 text-3xl font-medium leading-relaxed md:text-4xl">{poem.title}</h1>
        {poem.rhythm && <p className="mt-4 text-sm text-stone-500 dark:text-nightMuted">وزن: {poem.rhythm}</p>}
      </header>
      <PoemRenderer poem={poem} poetName={poetName} verses={verses} fontSize={fontSize}/>
      {!verses.length && <p className="p-12 text-center text-stone-500">برای این شعر هنوز بیتی ذخیره نشده است.</p>}
    </section>
  </main>;
}
