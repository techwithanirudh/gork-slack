import { useRuntimeConfig } from '#imports'
import { waitUntil as vercelWaitUntil } from '@vercel/functions'
import { env } from 'process'
import type { H3Event as Event } from 'h3'

export function waitUntil(
  request: Event,
  task: Promise<unknown>
): void {
   const preset = useRuntimeConfig(request).public.preset ?? env.NITRO_PRESET;

  if (preset === 'vercel') {
    vercelWaitUntil(task)
  } else {
    request.waitUntil(task)
  }
}