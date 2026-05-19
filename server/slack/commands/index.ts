import { handleCommand } from './handler';

export const commands = [
  { pattern: /^\/gork(?:-\w+)?$/, execute: handleCommand },
];
