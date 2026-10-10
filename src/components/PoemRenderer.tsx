import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bookmark, Check, Copy, Share2 } from 'lucide-react';
import { db, type Poem, type Verse } from '../db';
import { toPersianDigits } from '../utils/persian';

interface Props { poem: Poem; poetName: string; verses: Verse[]; onShare?: (text: string) => void; fontSize?: number; showVerseNumbers?: boolean }

export function PoemRenderer({ poem, poetName, verses, onShare, fontSize = 21, showVerseNumbers = false }: Props) {
  const savedVerses = useLiveQuery(() => db.favorites.where({ targetType: 'verse', poemId: poem.id }).toArray(), [poem.id]) ?? [];
  const couplets = useMemo(() => {
    const rows: { index: number; first: Verse; second?: Verse; isPoetry: boolean }[] = [];
    const sameText = (left: string, right: string) => left.normalize('NFKC').replace(/\s+/g, ' ').trim() === right.normalize('NFKC').replace(/\s+/g, ' ').trim();
    for (let i = 0; i < verses.length; i += 1) {
      const first = verses[i];
      const next = verses[i + 1];
      const firstIsPoetry = first.isPoetry ?? first.position !== null;
      const nextIsPoetry = next ? (next.isPoetry ?? next.position !== null) : false;
      const canPair = Boolean(next && firstIsPoetry && nextIsPoetry && first.coupletIndex === next.coupletIndex && first.position !== null && next.position !== null && first.position !== next.position && !sameText(first.text, next.text));
      rows.push({ index: first.coupletIndex, first, second: canPair ? next : undefined, isPoetry: firstIsPoetry });
      if (canPair) i += 1;
    }
    return rows;
  }, [verses]);

  const toggleFavorite = async (first: Verse, second?: Verse) => {
    const targetId = first.id ?? first.coupletIndex;
    const existing = savedVerses.find((favorite) => favorite.targetId === targetId || favorite.targetId === first.coupletIndex);
    if (existing?.id !== undefined) {
      await db.favorites.delete(existing.id);
      return;
    }
    await db.favorites.add({ targetType: 'verse', targetId, poemId: poem.id, poetId: poem.poetId, poetName, poemTitle: poem.title, previewText: [first.text, second?.text].filter(Boolean).join('\n'), createdAt: Date.now() });
  };

  const copy = async (first: Verse, second?: Verse) => navigator.clipboard?.writeText([first.text, second?.text].filter(Boolean).join('\n'));
  return <div className="divide-y divide-stone-200/70 dark:divide-zinc-800">
    {couplets.map(({ index, first, second, isPoetry }, rowIndex) => <article key={`${poem.id}-${first.order ?? first.id ?? rowIndex}`} className="group relative rounded-2xl px-4 py-5 transition hover:bg-white/65 dark:hover:bg-zinc-900/70 md:px-8">
      <div style={{ fontSize }} className="flex flex-col gap-1.5 text-right leading-[2.15] text-stone-900 dark:text-zinc-100 md:flex-row md:items-center md:justify-between md:gap-10">
        <p className={second ? 'w-full md:w-1/2' : 'w-full'}>{first.text}</p>
        {second && <p className="w-full ps-5 text-stone-700 dark:text-zinc-300 md:w-1/2 md:ps-0">{second.text}</p>}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-stone-400 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
        <span>{showVerseNumbers ? `${isPoetry ? 'بیت' : 'نثر'} ${toPersianDigits(rowIndex + 1)}` : ''}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => void copy(first, second)} className="rounded-lg p-2 hover:bg-stone-100 hover:text-amber dark:hover:bg-zinc-800" aria-label="رونوشت بیت" title="رونوشت"><Copy size={16}/></button>
          <button onClick={() => void toggleFavorite(first, second)} className="rounded-lg p-2 hover:bg-stone-100 hover:text-amber dark:hover:bg-zinc-800" aria-label="نشان کردن بیت" title="نشان کردن">{savedVerses.some((favorite) => favorite.targetId === (first.id ?? index) || favorite.targetId === index) ? <Check size={16}/> : <Bookmark size={16}/>}</button>
          <button onClick={() => onShare?.([first.text, second?.text].filter(Boolean).join('\n'))} className="rounded-lg p-2 hover:bg-stone-100 hover:text-amber dark:hover:bg-zinc-800" aria-label="ساخت کارت شعر" title="ساخت کارت شعر"><Share2 size={16}/></button>
        </div>
      </div>
    </article>)}
  </div>;
}
