import type {
  AllMiddlewareArgs,
  BlockAction,
  ButtonAction,
  SlackActionMiddlewareArgs,
  SlackEventMiddlewareArgs,
} from '@slack/bolt';
import type {
  FileShareMessageEvent,
  GenericMessageEvent,
  ThreadBroadcastMessageEvent,
} from '@slack/types';
import type { WebClient } from '@slack/web-api';

export type SlackMessageEvent = SlackEventMiddlewareArgs<'message'>['event'];
export type ProcessableSlackMessageEvent =
  | FileShareMessageEvent
  | GenericMessageEvent
  | ThreadBroadcastMessageEvent;

export interface SlackMessageContext {
  botUserId?: string;
  client: WebClient;
  event: ProcessableSlackMessageEvent;
  teamId?: string;
}

export type SlackButtonActionContext = SlackActionMiddlewareArgs<
  BlockAction<ButtonAction>
> &
  AllMiddlewareArgs;
