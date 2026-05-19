import type {
  AllMiddlewareArgs,
  BlockAction,
  ButtonAction,
  SlackActionMiddlewareArgs,
} from '@slack/bolt';
import { Actions, Button, Section } from 'slack-block-builder';
import { asBlocks } from '~/lib/slack/blocks';

export const name = 'retry_ping';

export async function execute({
  ack,
  client,
  respond,
}: SlackActionMiddlewareArgs<BlockAction<ButtonAction>> & AllMiddlewareArgs) {
  await ack();
  const start = Date.now();
  await client.auth.test();
  const ms = Date.now() - start;
  await respond({
    text: `pong ${ms}ms`,
    blocks: asBlocks(
      Section({ text: `pong *${ms}ms*` }),
      Actions().elements(Button({ text: 'Retry', actionId: 'retry_ping' }))
    ),
    replace_original: true,
  });
}
