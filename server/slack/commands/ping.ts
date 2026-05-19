import type {
  AllMiddlewareArgs,
  SlackCommandMiddlewareArgs,
} from '@slack/bolt';
import { Actions, Button, Section } from 'slack-block-builder';
import { asBlocks } from '~/lib/slack/blocks';

export async function execute({
  ack,
  client,
  respond,
}: SlackCommandMiddlewareArgs & AllMiddlewareArgs) {
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
    response_type: 'ephemeral',
  });
}
