import { z } from 'zod';

const SIZE_PATTERN = /^\d+x\d+$/;
const ASPECT_RATIO_PATTERN = /^\d+:\d+$/;

export const imageInputSchema = z
  .object({
    prompt: z
      .string()
      .min(1)
      .max(1500)
      .describe('Image prompt with the visual details to generate'),
    status: z
      .string()
      .min(1)
      .max(160)
      .describe(
        'Temporary status message shown in Slack while the image is generating. It should match your personality and will be deleted after generation finishes.'
      ),
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
  });
