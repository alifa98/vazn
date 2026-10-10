import { Heart, Trash2 } from 'lucide-react';
import type { Favorite } from '../db';

interface Props {
  favorites: Favorite[];
  onOpen: (favorite: Favorite) => void;
  onRemove: (favorite: Favorite) => void;
}

export function SavedPage({ favorites, onOpen, onRemove }: Props) {
  return <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-9 md:px-8 md:pt-14">
    <div className="mb-8"><p className="text-sm font-medium text-amber">مجموعهٔ شخصی</p><h1 className="mt-2 text-3xl font-semibold">ذخیره‌ها</h1><p className="mt-2 text-sm text-stone-500">شعرها و بیت‌هایی که نشان کرده‌اید، اینجا می‌مانند.</p></div>
    {favorites.length ? <div className="space-y-3">{favorites.map((favorite) => <article key={favorite.id} className="flex items-start gap-3 rounded-2xl border border-stone-200/70 bg-white p-5 dark:border-zinc-800 dark:bg-surface">
      <button onClick={() => onOpen(favorite)} className="min-w-0 flex-1 text-right">
        <span className="text-xs text-amber">{favorite.poetName} · {favorite.targetType === 'poem' ? 'شعر' : 'بیت'}</span>
        <h2 className="mt-1 font-medium">{favorite.poemTitle}</h2>
        {favorite.targetType === 'verse' && <p className="mt-2 whitespace-pre-line text-sm leading-7 text-stone-600 dark:text-zinc-300">{favorite.previewText}</p>}
      </button>
      <button onClick={() => onRemove(favorite)} className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950" title="حذف از ذخیره‌ها" aria-label="حذف از ذخیره‌ها"><Trash2 size={17}/></button>
    </article>)}</div> : <div className="rounded-2xl border border-dashed border-stone-300 px-6 py-14 text-center dark:border-zinc-700"><Heart className="mx-auto text-stone-400"/><p className="mt-3 font-medium">هنوز چیزی ذخیره نکرده‌اید</p><p className="mt-1 text-sm text-stone-500">از صفحهٔ شعر، نشانک کنار شعر یا بیت را بزنید.</p></div>}
  </main>;
}
