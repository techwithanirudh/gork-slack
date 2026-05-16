type ViewMetadata = Record<string, unknown>;

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function parseViewMetadata(raw: string): ViewMetadata | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as ViewMetadata;
  } catch {
    return null;
  }
}

export function isViewOwner(raw: string, userId: string): boolean {
  return parseViewMetadata(raw)?.openedBy === userId;
}
