import type { App } from '@slack/bolt';
import { banUserAction } from './ban-user';
import { removeReportAction } from './remove-report';
import { unbanUserAction } from './unban-user';

export function registerActions(app: App) {
  app.action('ban_user', banUserAction);
  app.action('unban_user', unbanUserAction);
  app.action('remove_report', removeReportAction);
}
