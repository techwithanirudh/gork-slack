import { env } from '~/env';
import logger from '~/lib/logger';
import { createSlackApp } from '~/slack/app';

async function main() {
  const { app, socketMode } = createSlackApp();

  if (socketMode) {
    await app.start();
    logger.info('Slack Bolt app connected via Socket Mode');
    return;
  }

  await app.start(env.PORT);
  logger.info({ port: env.PORT }, 'Slack Bolt app listening for events');
}

void main().catch((error) => {
  logger.error({ error }, 'Failed to start Slack Bolt app');
  process.exitCode = 1;
});
