const WHITESPACE_PATTERN = /\s+/;

export function splitArgs(text: string): string[] {
  return text.trim().split(WHITESPACE_PATTERN).filter(Boolean);
}

export function stripBroadcastMentions(text: string): string {
  return text
    .replace(/<!subteam\^[^>]+>/g, '')
    .replace(/<!(?:here|channel|everyone)(?:\|[^>]*)?>/g, '');
}
