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

  const fallbackPort = Number(process.env.PORT ?? 3000);
  const port = env.PORT ?? fallbackPort;

  await app.start(port);
  logger.info({ port }, 'Slack Bolt app listening for events');
}

void main().catch((error) => {
  logger.error({ error }, 'Failed to start Slack Bolt app');
  process.exitCode = 1;
});
