import nlp from 'compromise';

const sentenceCache = new Map<string, string[]>();
const normalizeCache = new Map<string, string[]>();

export function sentences(text: string): string[] {
  if (sentenceCache.has(text)) {
    return sentenceCache.get(text)!;
  }
  
  const result = nlp(text)
    .sentences()
    .out('array')
    .map((s: string) => s.trim());
  
  if (sentenceCache.size > 1000) {
    sentenceCache.clear();
  }
  sentenceCache.set(text, result);
  return result;
}

export function normalize(input: string[]): string[] {
  const key = input.join('|');
  if (normalizeCache.has(key)) {
    return normalizeCache.get(key)!;
  }
  
  const result = input.map((s) =>
    s
      .replace(/\b\w+(?:\s*\([^)]+\))*:\s*/gi, '')
      .toLowerCase()
      .trim()
      .replace(/[.,!?]+$/g, ''),
  );
  
  if (normalizeCache.size > 500) {
    normalizeCache.clear();
  }
  normalizeCache.set(key, result);
  return result;
}
