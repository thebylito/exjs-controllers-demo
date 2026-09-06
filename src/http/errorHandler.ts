import { logger, type ErrorMiddleware } from 'exjs-controllers'

interface ErrorLike {
  name?: unknown
  message?: unknown
  status?: unknown
  statusCode?: unknown
  issues?: unknown
}

/**
 * Turns every error into a JSON response.
 *
 * Statuses come from the error itself:
 * - `UnauthorizedError` / `ForbiddenError` (exjs-controllers) → `status` 401 / 403
 * - `UseCaseInputValidationError` (exjs-controllers)         → `statusCode` 422 + `issues`
 * - `HttpError` (this app)                                    → `status`
 * - express.json() parse failures                             → `status` 400
 * Anything else is a 500 and gets logged with the request's correlation id.
 */
export const errorHandler: ErrorMiddleware = (error: unknown, _request, response, next) => {
  if (response.headersSent) {
    next(error)
    return
  }

  const details = (typeof error === 'object' && error !== null ? error : {}) as ErrorLike
  const status = resolveStatus(details)

  if (status >= 500) {
    logger.error({ err: error }, 'Unhandled error')
  }

  response.status(status).json({
    error: typeof details.name === 'string' ? details.name : 'Error',
    message:
      status >= 500
        ? 'Internal server error'
        : typeof details.message === 'string'
          ? details.message
          : 'Request failed',
    ...(Array.isArray(details.issues) ? { issues: details.issues } : {}),
  })
}

function resolveStatus(error: ErrorLike): number {
  for (const candidate of [error.status, error.statusCode]) {
    if (typeof candidate === 'number' && candidate >= 400 && candidate <= 599) {
      return candidate
    }
  }

  return 500
}
