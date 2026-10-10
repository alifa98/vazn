import { db, type Category, type Poet, type Poem, type VaznDatabase, type Verse } from '../db';

const API = 'https://api.ganjoor.net/api/ganjoor';
export type DownloadProgress = { completed: number; total: number; message: string };
type ApiRecord = Record<string, any>;
type CategoryTask = { id: number; parentId?: number; title: string };

function verseLayout(value: unknown, hasCoupletIndex: boolean): { position: 0 | 1 | null; isPoetry: boolean; isPairable: boolean } {
  const name = String(value ?? '').trim().toLowerCase().replace(/[ _-]/g, '');
  const numeric = typeof value === 'number' || /^-?\d+$/.test(name) ? Number(value) : Number.NaN;
  if (name === 'right' || name === 'راست' || numeric === 0) return { position: 0, isPoetry: true, isPairable: true };
  if (name === 'left' || name === 'چپ' || numeric === 1) return { position: 1, isPoetry: true, isPairable: true };
  if (name === 'centeredverse1' || name === 'centeredverse2' || numeric === 2 || numeric === 3) {
    return { position: numeric === 3 || name === 'centeredverse2' ? 1 : 0, isPoetry: true, isPairable: true };
  }
  if (name === 'single' || numeric === 4) return { position: null, isPoetry: true, isPairable: false };
  if (name === 'paragraph' || name === 'comment' || name === 'prose' || numeric === -1 || numeric === 5) {
    return { position: null, isPoetry: false, isPairable: false };
  }
  // Some API variants omit position but still provide coupletIndex for verse.
  return { position: null, isPoetry: hasCoupletIndex, isPairable: hasCoupletIndex };
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`);
  if (!response.ok) throw new Error(`Ganjoor API error (${response.status})`);
  return response.json() as Promise<T>;
}

function unwrap<T extends ApiRecord>(record: ApiRecord, key: string): T {
  return (record[key] ?? record) as T;
}

function categoryChildren(cat: ApiRecord): ApiRecord[] {
  const direct = cat.subCats ?? cat.categories ?? cat.children;
  if (direct) return direct;
  return (cat.catItems ?? []).filter((item: ApiRecord) => {
    const type = String(item.type ?? item.itemType ?? '').toLowerCase();
    return Boolean(item.category ?? item.cat ?? item.subCat) || type.includes('cat') || item.isCategory === true;
  });
}

function categoryPoems(cat: ApiRecord): ApiRecord[] {
  const direct = cat.poems ?? cat.poemList;
  if (direct) return direct;
  return (cat.catItems ?? []).filter((item: ApiRecord) => {
    const type = String(item.type ?? item.itemType ?? '').toLowerCase();
    return Boolean(item.poem) || type.includes('poem') || item.isPoem === true;
  });
}

export async function downloadPoet(poet: Poet, onProgress: (progress: DownloadProgress) => void, database: VaznDatabase = db): Promise<void> {
  const profileResponse = await getJson<ApiRecord>(`/poet/${poet.id}`);
  const profile = unwrap<ApiRecord>(profileResponse, 'poet');
  const rootCatId = Number(profile.rootCatId ?? poet.rootCatId);
  if (!rootCatId) throw new Error('شناسهٔ دیوان این شاعر در پاسخ گنجور پیدا نشد.');

  const categories: Category[] = [];
  const poemRefs = new Map<number, number>();
  const seen = new Set<number>();
  let queue: CategoryTask[] = [{ id: rootCatId, title: profile.name ?? poet.name }];
  onProgress({ completed: 0, total: 0, message: 'در حال پیدا کردن بخش‌های دیوان…' });

  while (queue.length) {
    const tasks = queue.splice(0, 6).filter((task) => !seen.has(task.id));
    if (!tasks.length) continue;
    tasks.forEach((task) => seen.add(task.id));
    const resolved = await Promise.all(tasks.map(async (task) => {
      const response = await getJson<ApiRecord>(`/cat/${task.id}?poems=true&mainSections=false`);
      const cat = unwrap<ApiRecord>(response, 'cat');
      return { task, cat };
    }));

    for (const { task, cat } of resolved) {
      categories.push({ id: task.id, poetId: poet.id, parentId: task.parentId, title: cat.title ?? task.title, urlSlug: cat.urlSlug });
      for (const entry of categoryPoems(cat)) {
        const poem = entry.poem ?? entry;
        if (Number.isFinite(Number(poem.id))) poemRefs.set(Number(poem.id), task.id);
      }
      for (const entry of categoryChildren(cat)) {
        const child = entry.category ?? entry;
        const id = Number(child.id);
        if (id && !seen.has(id)) queue.push({ id, parentId: task.id, title: child.title ?? '' });
      }
    }
    onProgress({ completed: 0, total: poemRefs.size, message: `بخش‌ها بررسی شدند · ${poemRefs.size} شعر پیدا شد` });
  }

  const ids = [...poemRefs.keys()];
  onProgress({ completed: 0, total: ids.length, message: 'در حال دریافت شعرها…' });
  const batchSize = 40;
  for (let offset = 0; offset < ids.length; offset += batchSize) {
    const batchIds = ids.slice(offset, offset + batchSize);
    const fetched = await Promise.all(batchIds.map(async (id) => {
      const response = await getJson<ApiRecord>(`/poem/${id}`);
      const rawPoem = unwrap<ApiRecord>(response, 'poem');
      const rawVerses: ApiRecord[] = response.verses ?? rawPoem.verses ?? [];
      let fallbackCoupletIndex = 0;
      let previousFallbackWasRight = false;
      const verses: Verse[] = [...rawVerses]
        .map((verse, index) => ({ verse, index }))
        .sort((left, right) => {
          const leftOrder = Number(left.verse.vOrder ?? left.verse.vorder ?? left.verse.order ?? left.index + 1);
          const rightOrder = Number(right.verse.vOrder ?? right.verse.vorder ?? right.verse.order ?? right.index + 1);
          return leftOrder - rightOrder || left.index - right.index;
        })
        .map(({ verse, index }) => {
          // Ganjoor's JSON uses camelCase (`vOrder`); older mirrors sometimes
          // expose `vorder` or `order`. Keep the source line order in every case.
          const apiOrder = verse.vOrder ?? verse.vorder ?? verse.order;
          const apiPosition = verse.position ?? verse.versePosition;
          const hasCoupletIndex = verse.coupletIndex !== null && verse.coupletIndex !== undefined;
          const layout = verseLayout(apiPosition, hasCoupletIndex);
          const { position } = layout;
          const hasApiOrder = apiOrder !== null && apiOrder !== undefined;
          let coupletIndex: number;
          if (hasCoupletIndex) coupletIndex = Number(verse.coupletIndex);
          else if (hasApiOrder) coupletIndex = Math.ceil(Number(apiOrder) / 2);
          else if (position === 1 && previousFallbackWasRight) coupletIndex = fallbackCoupletIndex;
          else coupletIndex = ++fallbackCoupletIndex;
          previousFallbackWasRight = position === 0;
          fallbackCoupletIndex = Math.max(fallbackCoupletIndex, coupletIndex);
          return {
            poemId: id,
            coupletIndex,
            order: Number(apiOrder ?? index + 1),
            position,
            isPoetry: layout.isPoetry,
            isPairable: layout.isPairable,
            text: String(verse.text ?? verse.plainText ?? ''),
          };
        });
      const poem: Poem = {
        id, poetId: poet.id, categoryId: poemRefs.get(id)!, title: rawPoem.title ?? rawPoem.fullTitle ?? 'بی‌عنوان',
        fullTitle: rawPoem.fullTitle, rhythm: rawPoem.rhythm, rhymeLetters: rawPoem.rhymeLetters,
        verseCount: verses.length, cachedAt: new Date().toISOString(),
      };
      return { poem, verses };
    }));

    await database.transaction('rw', database.poems, database.verses, async () => {
      await database.verses.where('poemId').anyOf(batchIds).delete();
      await database.poems.bulkPut(fetched.map(({ poem }) => poem));
      await database.verses.bulkPut(fetched.flatMap(({ verses }) => verses));
    });
    const completed = offset + batchIds.length;
    onProgress({ completed, total: ids.length, message: 'شعرها ذخیره شدند' });
  }

  await database.transaction('rw', database.poets, database.categories, async () => {
    await database.categories.bulkPut(categories);
    await database.poets.put({ ...poet, rootCatId, isDownloaded: true, downloadDate: new Date().toISOString() });
  });
}

export async function deletePoetDownload(poetId: number): Promise<void> {
  await db.transaction('rw', db.poets, db.categories, db.poems, db.verses, async () => {
    const poems = await db.poems.where('poetId').equals(poetId).primaryKeys();
    if (poems.length) await db.verses.where('poemId').anyOf(poems as number[]).delete();
    await db.poems.where('poetId').equals(poetId).delete();
    await db.categories.where('poetId').equals(poetId).delete();
    const poet = await db.poets.get(poetId);
    if (poet) await db.poets.put({ ...poet, isDownloaded: false, downloadDate: undefined });
  });
}
