export const logAuthError = (operation: string, error: unknown): void => {
  const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    ? error.code : undefined;
  console.error('Auth operation failed', { operation, name: error instanceof Error ? error.name : 'UnknownError', code });
};
