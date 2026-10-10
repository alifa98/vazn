import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bookmark, Check, Copy, Share2 } from 'lucide-react';
import { db, type Poem, type Verse } from '../db';
import { toPersianDigits } from '../utils/persian';

interface Props { poem: Poem; poetName: string; verses: Verse[]; onShare?: (text: string) => void; fontSize?: number; showVerseNumbers?: boolean }

export function PoemRenderer({ poem, poetName, verses, onShare, fontSize = 21, showVerseNumbers = false }: Props) {
  const savedVerses = useLiveQuery(() => db.favorites.where({ targetType: 'verse', poemId: poem.id }).toArray(), [poem.id]) ?? [];
  const couplets = useMemo(() => {
    const rows: { first: Verse; second?: Verse; isPoetry: boolean }[] = [];
    const sameText = (left: string, right: string) => left.normalize('NFKC').replace(/\s+/g, ' ').trim() === right.normalize('NFKC').replace(/\s+/g, ' ').trim();
    for (let i = 0; i < verses.length; i += 1) {
      const first = verses[i];
      const next = verses[i + 1];
      const firstIsPoetry = first.isPoetry ?? first.position !== null;
      const nextIsPoetry = next ? (next.isPoetry ?? next.position !== null) : false;
      const firstPairable = first.isPairable ?? firstIsPoetry;
      const nextPairable = next ? (next.isPairable ?? nextIsPoetry) : false;
      const duplicate = Boolean(next && firstIsPoetry && nextIsPoetry && sameText(first.text, next.text));
      const canPair = Boolean(next && firstPairable && nextPairable && !duplicate);

      // Verse order is the source of truth: pair each adjacent poetic line.
      // Prose and duplicate lines stay single-column and don't consume a
      // different following line.
      rows.push({ first, second: canPair ? next : undefined, isPoetry: firstIsPoetry });
      if (canPair || duplicate) i += 1;
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
    {couplets.map(({ first, second, isPoetry }, rowIndex) => <article key={`${poem.id}-${first.order ?? first.id ?? rowIndex}`} className={`group relative rounded-2xl px-4 transition hover:bg-white/65 dark:hover:bg-zinc-900/70 md:px-8 ${second ? 'py-3 md:py-5' : 'py-6'}`}>
      <div dir="rtl" style={{ fontSize }} className={`grid grid-cols-1 text-right text-stone-900 dark:text-zinc-100 ${second ? 'gap-y-0 leading-[1.2] md:grid-cols-2 md:items-center md:gap-x-10 md:leading-[1.7]' : 'leading-[1.8]'}`}>
        <p>{first.text}</p>
        {second && <p className="text-stone-700 dark:text-zinc-300">{second.text}</p>}
      </div>
      <div className="mt-0 flex items-center justify-between text-xs text-stone-400 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
        <span>{showVerseNumbers ? `${isPoetry ? 'بیت' : 'نثر'} ${toPersianDigits(rowIndex + 1)}` : ''}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => void copy(first, second)} className="rounded-lg p-2 hover:bg-stone-100 hover:text-amber dark:hover:bg-zinc-800" aria-label="رونوشت بیت" title="رونوشت"><Copy size={16}/></button>
          <button onClick={() => void toggleFavorite(first, second)} className="rounded-lg p-2 hover:bg-stone-100 hover:text-amber dark:hover:bg-zinc-800" aria-label={second ? 'ذخیرهٔ بیت' : 'ذخیرهٔ متن'} title={second ? 'ذخیرهٔ بیت' : 'ذخیرهٔ متن'}>{savedVerses.some((favorite) => favorite.targetId === (first.id ?? first.coupletIndex) || favorite.targetId === first.coupletIndex) ? <Check size={16}/> : <Bookmark size={16}/>}</button>
          <button onClick={() => onShare?.([first.text, second?.text].filter(Boolean).join('\n'))} className="rounded-lg p-2 hover:bg-stone-100 hover:text-amber dark:hover:bg-zinc-800" aria-label="ساخت کارت شعر" title="ساخت کارت شعر"><Share2 size={16}/></button>
        </div>
      </div>
    </article>)}
  </div>;
}
