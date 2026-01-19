import type {
  AllMiddlewareArgs,
  SlackCommandMiddlewareArgs,
} from '@slack/bolt';

export async function respondWithPermissionError(
  context: SlackCommandMiddlewareArgs & AllMiddlewareArgs
): Promise<void> {
  await context.respond({
    text: 'You do not have permission for this command.',
    response_type: 'ephemeral',
  });
}
