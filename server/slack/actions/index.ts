import { execute as banUserExecute, name as banUserName } from './ban-user';
import {
  execute as moderationInfoExecute,
  name as moderationInfoName,
} from './moderation-info';
import {
  execute as removeReportExecute,
  name as removeReportName,
} from './remove-report';
import {
  execute as unbanUserExecute,
  name as unbanUserName,
} from './unban-user';

export const actions = [
  { name: banUserName, execute: banUserExecute },
  { name: unbanUserName, execute: unbanUserExecute },
  { name: removeReportName, execute: removeReportExecute },
  { name: moderationInfoName, execute: moderationInfoExecute },
] as const;
