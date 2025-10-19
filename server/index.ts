import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseExporter } from 'langfuse-vercel';
import { env } from '~/env';
import logger from '~/lib/logger';
import { createSlackApp } from '~/slack/app';

const sdk = new NodeSDK({
  traceExporter: new LangfuseExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

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

void main().catch(async (error) => {
  logger.error({ error }, 'Failed to start Slack Bolt app');
  await sdk.shutdown();
  process.exitCode = 1;
});
