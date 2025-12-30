import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: process.env.NODE_ENV === 'production',

  tracesSampleRate: 1.0,

  debug: false,

  beforeSend(event) {
    if (event.request) {
      delete event.request.cookies
    }
    return event
  },

  integrations: [
    Sentry.captureConsoleIntegration({
      levels: ['error'],
    }),
  ],
})
