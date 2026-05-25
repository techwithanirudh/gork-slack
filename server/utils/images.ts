import type { FileShareMessageEvent } from '@slack/types';
import type { ConversationsHistoryResponse } from '@slack/web-api';
import type { ImagePart } from 'ai';
import { env } from '~/env';
import logger from '~/lib/logger';
import { toLogError } from '~/utils/error';

export type SlackFile =
  | NonNullable<
      NonNullable<ConversationsHistoryResponse['messages']>[number]['files']
    >[number]
  | NonNullable<FileShareMessageEvent['files']>[number];

const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

export async function processSlackFiles(
  files: SlackFile[] | undefined
): Promise<ImagePart[]> {
  if (!files?.length) {
    return [];
  }

  const imageFiles = files.filter((f) =>
    SUPPORTED_MIME_TYPES.includes(f.mimetype ?? '')
  );
  if (!imageFiles.length) {
    return [];
  }

  const results = await Promise.all(
    imageFiles.map(async (file): Promise<ImagePart | null> => {
      const url = file.url_private ?? file.url_private_download;
      if (!url) {
        logger.warn({ fileId: file.id }, 'No private URL available for file');
        return null;
      }
      try {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${env.SLACK_BOT_TOKEN}` },
        });
        if (!response.ok) {
          logger.error(
            { status: response.status, fileId: file.id },
            'Failed to fetch Slack image'
          );
          return null;
        }
        const base64 = Buffer.from(await response.arrayBuffer()).toString(
          'base64'
        );
        const mimeType = file.mimetype ?? 'image/jpeg';
        return {
          type: 'image',
          image: `data:${mimeType};base64,${base64}`,
          mediaType: mimeType,
        };
      } catch (error) {
        logger.error(
          { ...toLogError(error), fileId: file.id },
          'Error fetching Slack image'
        );
        return null;
      }
    })
  );

  return results.filter((r): r is ImagePart => r !== null);
}
