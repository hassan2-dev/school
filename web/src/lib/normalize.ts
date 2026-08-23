/** Arabic name / text normalization for matching — never mutates stored original names. */

const ARABIC_MAP: Record<string, string> = {
  أ: 'ا',
  إ: 'ا',
  آ: 'ا',
  ٱ: 'ا',
  ة: 'ه',
  ى: 'ي',
  ئ: 'ي',
  ؤ: 'و',
  ء: '',
};

export function normalizeArabicText(input: string): string {
  let s = input.trim().replace(/\s+/g, ' ');
  s = s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, ''); // diacritics
  s = s.replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, ' ');
  s = s
    .split('')
    .map((ch) => ARABIC_MAP[ch] ?? ch)
    .join('');
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function similarityRatio(a: string, b: string): number {
  const na = normalizeArabicText(a);
  const nb = normalizeArabicText(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const longer = na.length >= nb.length ? na : nb;
  if (longer.length === 0) return 1;

  const distances = levenshtein(na, nb);
  return 1 - distances / longer.length;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}
