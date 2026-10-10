import Dexie, { type Table } from 'dexie';

export interface Poet {
  id: number; name: string; description?: string; fullUrl?: string; rootCatId: number;
  birthYear?: number; deathYear?: number; isDownloaded: boolean; downloadDate?: string; sortOrder?: number;
}
export interface Category { id: number; poetId: number; parentId?: number; title: string; urlSlug?: string }
export interface Verse { id?: number; poemId: number; coupletIndex: number; order?: number; position: 0 | 1 | null; isPoetry?: boolean; isPairable?: boolean; text: string }
export interface Poem {
  id: number; poetId: number; categoryId: number; title: string; fullTitle?: string; rhythm?: string;
  rhymeLetters?: string; format?: 'ghazal' | 'masnavi' | 'qasida' | 'robaee' | 'nimaee' | 'general';
  verseCount: number; cachedAt?: string;
}
export interface Favorite {
  id?: number; targetType: 'poem' | 'verse'; targetId: number; poemId: number; poetId?: number; poetName: string;
  poemTitle: string; previewText: string; createdAt: number; note?: string;
}

export class VaznDatabase extends Dexie {
  poets!: Table<Poet, number>;
  categories!: Table<Category, number>;
  poems!: Table<Poem, number>;
  verses!: Table<Verse, number>;
  favorites!: Table<Favorite, number>;

  constructor() {
    super('VaznDB');
    this.version(1).stores({
      poets: 'id, name, isDownloaded',
      categories: 'id, poetId, parentId',
      poems: 'id, poetId, categoryId, title, rhythm',
      verses: '++id, poemId, coupletIndex, [poemId+coupletIndex]',
      favorites: '++id, targetType, targetId, poemId, createdAt',
    });
  }
}

export const db = new VaznDatabase();
