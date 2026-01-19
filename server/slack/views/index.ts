import { execute as banUserExecute, name as banUserName } from './ban-user';
import {
  execute as unbanUserExecute,
  name as unbanUserName,
} from './unban-user';
import {
  execute as viewReportsExecute,
  name as viewReportsName,
} from './view-reports';

export const views = [
  { name: banUserName, execute: banUserExecute },
  { name: unbanUserName, execute: unbanUserExecute },
  { name: viewReportsName, execute: viewReportsExecute },
] as const;
