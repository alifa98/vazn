export function normalizePersian(text: string): string {
  if (!text) return '';
  return text
    .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک')
    .replace(/[0-9]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)])
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u200C/g, ' ').trim().toLowerCase();
}

export function toPersianDigits(value: number | string): string {
  return String(value).replace(/[0-9]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
}
