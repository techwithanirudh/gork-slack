import type { SlackEventMiddlewareArgs } from '@slack/bolt';
import type { WebClient } from '@slack/web-api';

export type SlackMessageEvent = SlackEventMiddlewareArgs<'message'>['event'];

/** Optional fields present on plain message events but not on all union members. */
export interface SlackMessageFields {
  blocks?: unknown;
  text?: string;
  thread_ts?: string;
  user?: string;
}

export interface SlackMessageContext {
  botUserId?: string;
  client: WebClient;
  event: SlackMessageEvent & SlackMessageFields;
  teamId?: string;
}
