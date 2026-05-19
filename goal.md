
› /goal Replaec custom slack types with slack SDK types, if needed alwyas move types to types folder. Use more Libs, than hand writing custom code. follow code refactoring rules in agents.md[Pasted Content 2009 chars]. Go through whole codebase with type fixing simplification, and splitting big files into smaller ones. Do a clean refactoring of the codebase. go oncol


## Coding Guidelines

### Inline over extract
Prefer inlining over creating utility functions. Only extract to a named function when the logic is called in **multiple places** or is genuinely complex. A helper called exactly once is worse than the code it replaced.

```ts
// bad — one-shot helper
function getFileExtension(mime: string) { return MAP[mime] ?? 'png'; }
const ext = getFileExtension(image.mediaType);

// good — just inline it
const ext = EXTENSION[image.mediaType] ?? 'png';
```

### Dict params
Functions with more than one parameter should take a single options object. Prefer this even for one-param functions when that parameter is logically a "config" rather than a plain value.

```ts
// bad
logReply(ctxId, author, result, reason);

// good
logReply({ ctxId, author, result, reason });
```

### No `as const` on type discriminants
When building objects that need a literal type for a discriminant field (e.g. `type: 'text'`), cast the whole expression to the SDK type instead of using `as const` on the property.

```ts
// bad
{ type: 'text' as const, text }

// good — use the SDK's UserContent type
[{ type: 'text', text }, ...images] as UserContent
```

### No comments explaining what code does
Only add a comment when the **why** is non-obvious — a hidden constraint, a workaround for a specific bug, or behaviour that would genuinely surprise a reader. Never describe what the code already says.

### No JSDoc / docstrings
No multi-line block comments on functions. Self-documenting names are enough.

### Config for tuneable values
Anything that could reasonably change per deployment (thresholds, message lists, locale) belongs in `server/config.ts`, not hardcoded at the call site.

### Feature-enclosed architecture
Features live under `server/slack/features/<name>/`. Each feature exports `{ actions, views, commands }` from its `index.ts`. Each command file exports `name`, `help: CommandHelp`, and `execute`. The single registry is `server/slack/commands/subcommands.ts`.
