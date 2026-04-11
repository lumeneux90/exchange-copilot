export function getErrorMessage(
  error: unknown,
  fallback = "Что-то пошло не так."
) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
