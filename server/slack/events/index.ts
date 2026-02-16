import type { App } from '@slack/bolt';
import {
  execute as memberJoinedChannelExecute,
  name as memberJoinedChannelName,
} from './member-joined-channel';
import {
  execute as messageCreateExecute,
  name as messageCreateName,
} from './message-create';

export function registerEvents(app: App) {
  app.event(memberJoinedChannelName, memberJoinedChannelExecute);
  app.event(messageCreateName, messageCreateExecute);
}
