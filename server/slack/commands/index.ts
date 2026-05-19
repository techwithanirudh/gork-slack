import { handleCommand } from './handler';

export const commands = [
  // biome-ignore lint/performance/useTopLevelRegex: pattern is module-local
  { pattern: /^\/gork(?:-\w+)?$/, execute: handleCommand },
];
