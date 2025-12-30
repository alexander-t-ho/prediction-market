import * as Sentry from '@sentry/nextjs'

export function captureError(error: Error, context?: Record<string, any>) {
  console.error('Error:', error, context)

  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      extra: context,
    })
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  console.log(`[${level.toUpperCase()}]:`, message)

  if (process.env.NODE_ENV === 'production') {
    Sentry.captureMessage(message, level)
  }
}

export function setUserContext(userId: string, username: string) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.setUser({
      id: userId,
      username: username,
    })
  }
}

export function clearUserContext() {
  if (process.env.NODE_ENV === 'production') {
    Sentry.setUser(null)
  }
}

export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: 'info',
    })
  }
}

export async function monitorApiCall<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  // Using Sentry's modern span API instead of deprecated startTransaction
  return await Sentry.startSpan(
    {
      name: operation,
      op: 'api.call',
    },
    async () => {
      try {
        return await fn()
      } catch (error) {
        captureError(error as Error, { operation })
        throw error
      }
    }
  )
}

export class ErrorBoundary {
  static handleError(error: Error, errorInfo: any) {
    captureError(error, { errorInfo })
  }
}
