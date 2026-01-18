import type { App } from '@slack/bolt';
import { ban } from './ban';
import { reports } from './reports';
import { unban } from './unban';

export function registerCommands(app: App) {
  app.command('/ban', ban);
  app.command('/unban', unban);
  app.command('/reports', reports);
}
