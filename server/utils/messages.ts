import type { ModelMessage } from 'ai';

export function getMessageText(message: ModelMessage): string {
  const { content } = message;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }
        if (
          typeof part === 'object' &&
          part &&
          'text' in part &&
          typeof part.text === 'string'
        ) {
          return part.text;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  return '';
}

export function buildHistorySnippet({
  messages,
  limit,
}: {
  messages: ModelMessage[];
  limit: number;
}): string {
  return messages
    .slice(-limit)
    .map((msg) => getMessageText(msg))
    .filter(Boolean)
    .join('\n');
}
