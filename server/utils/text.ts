const WHITESPACE_PATTERN = /\s+/;

export function splitArgs(text: string): string[] {
  return text.trim().split(WHITESPACE_PATTERN).filter(Boolean);
}

// Gork must never ping user groups, @here, @channel, or @everyone.
export function stripBroadcastMentions(text: string): string {
  return text
    .replace(/<!subteam\^[^>]+>/g, '')
    .replace(/<!here\|?[^>]*>/g, '')
    .replace(/<!channel\|?[^>]*>/g, '')
    .replace(/<!everyone>/g, '');
}
