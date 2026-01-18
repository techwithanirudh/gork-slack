import { execute as banExecute, name as banName } from './ban';
import { execute as reportsExecute, name as reportsName } from './reports';
import { execute as unbanExecute, name as unbanName } from './unban';

export const commands = [
  { name: banName, execute: banExecute },
  { name: unbanName, execute: unbanExecute },
  { name: reportsName, execute: reportsExecute },
] as const;
