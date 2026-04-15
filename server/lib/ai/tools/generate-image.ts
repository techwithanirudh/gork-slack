import { generateImage, tool } from 'ai';
import { z } from 'zod';
import { provider } from '~/lib/ai/providers';
import logger from '~/lib/logger';
import type { SlackMessageContext } from '~/types';
import { toLogError } from '~/utils/error';
import { processSlackFiles, type SlackFile } from '~/utils/images';

const MIME_TYPE_TO_EXTENSION: Record<string, string> = {
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const SIZE_PATTERN = /^\d+x\d+$/;
const ASPECT_RATIO_PATTERN = /^\d+:\d+$/;

function getFileExtension(mediaType: string): string {
  return MIME_TYPE_TO_EXTENSION[mediaType] ?? 'png';
}

export const generateImageTool = ({
  context,
  files,
}: {
  context: SlackMessageContext;
  files?: SlackFile[];
}) =>
  tool({
    description:
      'Generate one or more AI images and upload them directly to the current Slack thread. If image attachments are present, use them as source images for editing or transformation.',
    inputSchema: z
      .object({
        prompt: z
          .string()
          .min(1)
          .max(1500)
          .describe('Image prompt with the visual details to generate'),
        n: z
          .number()
          .int()
          .min(1)
          .max(4)
          .default(1)
          .describe('Number of images to generate'),
        size: z
          .string()
          .regex(SIZE_PATTERN)
          .optional()
          .describe('Optional image size in {width}x{height} format'),
        aspectRatio: z
          .string()
          .regex(ASPECT_RATIO_PATTERN)
          .optional()
          .describe('Optional aspect ratio in {width}:{height} format'),
        seed: z
          .number()
          .int()
          .optional()
          .describe('Optional seed for reproducible generations'),
      })
      .refine((input) => !(input.size && input.aspectRatio), {
        message: 'Provide either size or aspectRatio, not both',
        path: ['size'],
      }),
    execute: async ({ prompt, n, size, aspectRatio, seed }) => {
      const channelId = context.event.channel;
      const messageTs = context.event.ts;
      const threadTs =
        (context.event as { thread_ts?: string }).thread_ts ?? messageTs;

      if (!(channelId && threadTs)) {
        return {
          success: false,
          error: 'Missing Slack channel or thread timestamp',
        };
      }

      try {
        const inputImages = await processSlackFiles(files);
        const sourceImages = inputImages
          .map((item) => item.image)
          .filter(
            (image): image is string | Uint8Array | ArrayBuffer | Buffer =>
              typeof image === 'string' ||
              image instanceof Uint8Array ||
              image instanceof ArrayBuffer ||
              image instanceof Buffer
          );

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
          ...(seed !== undefined ? { seed } : {}),
        });

        for (const [index, image] of result.images.entries()) {
          const extension = getFileExtension(image.mediaType);
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
      }
    },
  });
