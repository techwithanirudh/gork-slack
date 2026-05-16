const WHITESPACE_PATTERN = /\s+/;

export function splitArgs(text: string): string[] {
  return text.trim().split(WHITESPACE_PATTERN).filter(Boolean);
}
