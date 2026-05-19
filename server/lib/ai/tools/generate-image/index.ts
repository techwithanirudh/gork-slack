import { generateImage, tool } from 'ai';
import { provider } from '~/lib/ai/providers';
import logger from '~/lib/logger';
import type { SlackMessageContext } from '~/types';
import { toLogError } from '~/utils/error';
import type { SlackFile } from '~/utils/images';
import { imageInputSchema } from './schema';
import { sourceImagesFromFiles } from './source-images';

const EXTENSION: Record<string, string> = {
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const generateImageTool = ({
  context,
  files,
}: {
  context: SlackMessageContext;
  files?: SlackFile[];
}) =>
  tool({
    description:
      'Generate one or more AI images and upload them directly to the current Slack thread. If image attachments are present, use them as source images for editing or transformation. A temporary status message is shown in Slack while generation is running and deleted after the images finish or fail.',
    inputSchema: imageInputSchema,
    execute: async ({ prompt, status, n, size, aspectRatio, seed }) => {
      const { channel: channelId, ts: messageTs, thread_ts } = context.event;
      const threadTs = thread_ts ?? messageTs;
      let statusMessageTs: string | undefined;

      if (!(channelId && threadTs)) {
        return {
          success: false,
          error: 'Missing Slack channel or thread timestamp',
        };
      }

      try {
        try {
          const response = await context.client.chat.postMessage({
            channel: channelId,
            text: `${status} :thonk-spin:`,
            thread_ts: threadTs,
          });
          statusMessageTs = response.ts;
        } catch (error) {
          logger.warn(
            { ...toLogError(error), channel: channelId },
            'Failed to post image generation status message'
          );
        }

        const sourceImages = await sourceImagesFromFiles(files);
        const imagePrompt =
          sourceImages.length > 0
            ? { text: prompt, images: sourceImages }
            : prompt;

        const result = await generateImage({
          model: provider.imageModel('image-model'),
          prompt: imagePrompt,
          n,
          ...(size ? { size: size as `${number}x${number}` } : {}),
          ...(aspectRatio
            ? { aspectRatio: aspectRatio as `${number}:${number}` }
            : {}),
          ...(seed === undefined ? {} : { seed }),
        });

        for (const [index, image] of result.images.entries()) {
          const extension = EXTENSION[image.mediaType] ?? 'png';
          await context.client.files.uploadV2({
            channel_id: channelId,
            thread_ts: threadTs,
            file: Buffer.from(image.uint8Array),
            filename: `gork-image-${index + 1}.${extension}`,
            title: `Generated Image ${index + 1}`,
          });
        }

        if (result.warnings.length > 0) {
          logger.warn(
            { channel: channelId, warnings: result.warnings },
            'Image generation returned warnings'
          );
        }

        return {
          success: true,
          content: `Generated ${result.images.length} image(s)${sourceImages.length > 0 ? ' from attachment(s)' : ''}`,
        };
      } catch (error) {
        logger.error(
          { ...toLogError(error), channel: channelId },
          'Failed to generate image'
        );
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      } finally {
        if (statusMessageTs) {
          try {
            await context.client.chat.delete({
              channel: channelId,
              ts: statusMessageTs,
            });
          } catch (error) {
            logger.warn(
              { ...toLogError(error), channel: channelId },
              'Failed to delete image generation status message'
            );
          }
        }
      }
    },
  });
