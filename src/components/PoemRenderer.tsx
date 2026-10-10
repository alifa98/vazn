import { useMemo, useState } from 'react';
import { Bookmark, Check, Copy, Share2 } from 'lucide-react';
import { db, type Poem, type Verse } from '../db';
import { toPersianDigits } from '../utils/persian';

interface Props { poem: Poem; poetName: string; verses: Verse[]; onShare?: (text: string) => void; fontSize?: number }

export function PoemRenderer({ poem, poetName, verses, onShare, fontSize = 21 }: Props) {
  const [saved, setSaved] = useState<number[]>([]);
  const couplets = useMemo(() => {
    const grouped = new Map<number, Verse[]>();
    verses.forEach((verse) => grouped.set(verse.coupletIndex, [...(grouped.get(verse.coupletIndex) ?? []), verse]));
    return [...grouped.entries()].sort(([a], [b]) => a - b).map(([index, lines]) => ({ index, first: lines.find((v) => v.position === 0) ?? lines[0], second: lines.find((v) => v.position === 1) }));
  }, [verses]);

  const toggleFavorite = async (first: Verse, second?: Verse) => {
    if (saved.includes(first.coupletIndex)) {
      await db.favorites.where({ targetType: 'verse', targetId: first.id ?? first.coupletIndex, poemId: poem.id }).delete();
      setSaved((current) => current.filter((value) => value !== first.coupletIndex));
      return;
    }
    await db.favorites.add({ targetType: 'verse', targetId: first.id ?? first.coupletIndex, poemId: poem.id, poetName, poemTitle: poem.title, previewText: [first.text, second?.text].filter(Boolean).join('\n'), createdAt: Date.now() });
    setSaved((current) => [...current, first.coupletIndex]);
  };

  const copy = async (first: Verse, second?: Verse) => navigator.clipboard?.writeText([first.text, second?.text].filter(Boolean).join('\n'));
  return <div className="divide-y divide-stone-200/70 dark:divide-zinc-800">
    {couplets.map(({ index, first, second }) => <article key={`${poem.id}-${index}`} className="group relative rounded-2xl px-4 py-5 transition hover:bg-white/65 dark:hover:bg-zinc-900/70 md:px-8">
      <div style={{ fontSize }} className="flex flex-col gap-1.5 text-right leading-[2.15] text-stone-900 dark:text-zinc-100 md:flex-row md:items-center md:justify-between md:gap-10">
        <p className="w-full md:w-1/2">{first.text}</p>
        {second && <p className="w-full ps-5 text-stone-700 dark:text-zinc-300 md:w-1/2 md:ps-0">{second.text}</p>}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-stone-400 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
        <span>بیت {toPersianDigits(index)}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => void copy(first, second)} className="rounded-lg p-2 hover:bg-stone-100 hover:text-amber dark:hover:bg-zinc-800" aria-label="رونوشت بیت" title="رونوشت"><Copy size={16}/></button>
          <button onClick={() => void toggleFavorite(first, second)} className="rounded-lg p-2 hover:bg-stone-100 hover:text-amber dark:hover:bg-zinc-800" aria-label="نشان کردن بیت" title="نشان کردن">{saved.includes(index) ? <Check size={16}/> : <Bookmark size={16}/>}</button>
          <button onClick={() => onShare?.([first.text, second?.text].filter(Boolean).join('\n'))} className="rounded-lg p-2 hover:bg-stone-100 hover:text-amber dark:hover:bg-zinc-800" aria-label="ساخت کارت شعر" title="ساخت کارت شعر"><Share2 size={16}/></button>
        </div>
      </div>
    </article>)}
  </div>;
}
