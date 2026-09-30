export function isMissingColumnError(error: unknown) {
  const message =
    typeof error === 'string'
      ? error
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: unknown }).message ?? '')
        : '';
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';

  return /column .* does not exist/i.test(message) ||
    /could not find the .* column/i.test(message) ||
    /^PGRST(?:204|205)$/i.test(code);
}
