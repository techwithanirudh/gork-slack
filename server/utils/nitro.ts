import * as vercel from '@vercel/functions'
import { env } from 'process'
import type { H3Event as Event } from 'h3'

export function waitUntil(
  request: Event,
  task: Promise<unknown>
): void {
  const isVercel = !!env.VERCEL;

  if (isVercel) {
    vercel.waitUntil(task)
  } else {
    request.waitUntil(task)
  }
}