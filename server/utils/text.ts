export function splitArgs(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}
