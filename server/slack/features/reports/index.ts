import * as banAction from './actions/ban';
import * as moderationInfo from './actions/moderation-info';
import * as removeAction from './actions/remove';
import * as unbanAction from './actions/unban';
import * as banCmd from './commands/ban';
import * as reportsCmd from './commands/reports';
import * as unbanCmd from './commands/unban';
import * as banView from './views/ban';
import * as reportsView from './views/reports';
import * as unbanView from './views/unban';

export const reports = {
  actions: [
    { name: banAction.name, execute: banAction.execute },
    { name: unbanAction.name, execute: unbanAction.execute },
    { name: removeAction.name, execute: removeAction.execute },
    { name: moderationInfo.name, execute: moderationInfo.execute },
  ],
  views: [
    { name: banView.name, execute: banView.execute },
    { name: unbanView.name, execute: unbanView.execute },
    { name: reportsView.name, execute: reportsView.execute },
  ],
  commands: [
    { name: banCmd.name, execute: banCmd.execute, help: banCmd.help },
    { name: unbanCmd.name, execute: unbanCmd.execute, help: unbanCmd.help },
    {
      name: reportsCmd.name,
      execute: reportsCmd.execute,
      help: reportsCmd.help,
    },
  ],
};
