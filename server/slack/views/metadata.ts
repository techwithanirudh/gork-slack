import { z } from 'zod';

type ViewMetadata = Record<string, unknown>;
const viewMetadataSchema = z.record(z.string(), z.unknown());

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function parseViewMetadata(raw: string): ViewMetadata | null {
  try {
    const result = viewMetadataSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function isViewOwner({
  raw,
  userId,
}: {
  raw: string;
  userId: string;
}): boolean {
  return parseViewMetadata(raw)?.openedBy === userId;
}
