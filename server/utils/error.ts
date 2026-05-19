export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return String(error);
}

export function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(errorMessage(error), { cause: error });
}

export function toLogError(error: unknown): { err: Error } {
  return { err: toError(error) };
}

export function slackErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) {
    return;
  }

  const { code, data } = error as {
    code?: unknown;
    data?: { error?: unknown };
  };
  if (typeof data?.error === 'string') {
    return data.error;
  }
  return typeof code === 'string' ? code : undefined;
}
