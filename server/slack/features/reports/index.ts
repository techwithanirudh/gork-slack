import {
  execute as banActionExecute,
  name as banActionName,
} from './actions/ban';
import {
  execute as moderationInfoExecute,
  name as moderationInfoName,
} from './actions/moderation-info';
import { execute as removeExecute, name as removeName } from './actions/remove';
import {
  execute as unbanActionExecute,
  name as unbanActionName,
} from './actions/unban';
import {
  execute as banCmdExecute,
  name as banCmdName,
  help as banHelp,
} from './commands/ban';
import {
  execute as reportsCmdExecute,
  name as reportsCmdName,
  help as reportsHelp,
} from './commands/reports';
import {
  execute as unbanCmdExecute,
  name as unbanCmdName,
  help as unbanHelp,
} from './commands/unban';
import { execute as banViewExecute, name as banViewName } from './views/ban';
import {
  execute as reportsViewExecute,
  name as reportsViewName,
} from './views/reports';
import {
  execute as unbanViewExecute,
  name as unbanViewName,
} from './views/unban';

export const reports = {
  actions: [
    { name: banActionName, execute: banActionExecute },
    { name: unbanActionName, execute: unbanActionExecute },
    { name: removeName, execute: removeExecute },
    { name: moderationInfoName, execute: moderationInfoExecute },
  ],
  views: [
    { name: banViewName, execute: banViewExecute },
    { name: unbanViewName, execute: unbanViewExecute },
    { name: reportsViewName, execute: reportsViewExecute },
  ],
  commands: [
    { name: banCmdName, execute: banCmdExecute },
    { name: unbanCmdName, execute: unbanCmdExecute },
    { name: reportsCmdName, execute: reportsCmdExecute },
  ],
  help: [banHelp, unbanHelp, reportsHelp],
};
