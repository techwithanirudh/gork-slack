import {
  execute as memberJoinedChannelExecute,
  name as memberJoinedChannelName,
} from './member-joined-channel';
import {
  execute as messageCreateExecute,
  name as messageCreateName,
} from './message-create';

export const events = [
  {
    name: memberJoinedChannelName,
    execute: memberJoinedChannelExecute,
  },
  {
    name: messageCreateName,
    execute: messageCreateExecute,
  },
] as const;
