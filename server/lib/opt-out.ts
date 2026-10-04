// Stands in for a message from someone who ran `/gork optout`, wherever Gork
// would otherwise have shown it to the model.
export const OPTED_OUT_TEXT =
  '[message hidden: its author opted out of gork reading their messages]';

// Saved chat memories are lines of `name (U123): text`, one message per
// prefixed line, with any extra lines of a multi-line message following
// unprefixed. Bot lines without a user id are written as `(undefined)`.
const MESSAGE_START = /^.*? \(([A-Z0-9]+|undefined)\): /;

// Replaces every message an opted-out person wrote with the placeholder.
// Returns null when their messages were all it held, so a memory that only
// matched because of their words is not surfaced at all. A memory with nothing
// of theirs comes back unchanged.
export function redactMemoryContext(
  context: string,
  optedOut: Set<string>
): string | null {
  const lines: string[] = [];
  let hiding = false;
  let hidden = 0;
  let visible = 0;
  for (const line of context.split('\n')) {
    const start = MESSAGE_START.exec(line);
    if (start) {
      hiding = optedOut.has(start[1] ?? '');
      if (hiding) {
        hidden++;
        lines.push(OPTED_OUT_TEXT);
        continue;
      }
      visible++;
    }
    if (!hiding) {
      lines.push(line);
    }
  }
  if (hidden === 0) {
    return context;
  }
  return visible > 0 ? lines.join('\n') : null;
}
