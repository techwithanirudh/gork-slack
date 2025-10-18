import { constants } from 'node:fs';
import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { type TransportTargetOptions, pino } from 'pino';
import { env } from '~/env';

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

const isProd = process.env.NODE_ENV === 'production';
const isVercel = !!env.VERCEL;
const logDir = env.LOG_DIRECTORY ?? 'logs';
const logLevel = env.LOG_LEVEL ?? 'info';

if (!isVercel && !(await exists(logDir))) {
  await mkdir(logDir, { recursive: true });
}

const targets: TransportTargetOptions[] = [];

if (!isVercel) {
  targets.push({
    target: 'pino/file',
    options: { destination: path.join(logDir, 'app.log') },
    level: logLevel,
  });
}

if (!isProd) {
  targets.push({
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss.l o',
      ignore: 'pid,hostname',
    },
    level: logLevel,
  });
}

const transport = targets.length > 0 ? pino.transport({ targets }) : undefined;

const logger = transport
  ? pino(
      { level: logLevel, timestamp: pino.stdTimeFunctions.isoTime },
      transport,
    )
  : pino({ level: logLevel, timestamp: pino.stdTimeFunctions.isoTime });

export default logger;
