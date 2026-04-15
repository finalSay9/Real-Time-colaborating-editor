import pino from 'pino'

// In production logs are JSON (machine readable).
// In development they're pretty-printed (human readable).
// The traceId field is what OpenTelemetry uses to link
// log lines to a specific request across all services.

export const createLogger = (service: string) =>
  pino({
    name: service,
    level: process.env.LOG_LEVEL ?? 'info',
    ...(process.env.NODE_ENV !== 'production' && {
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    }),
  })

// Call this at the start of each request handler:
// const log = logger.child({ traceId, userId })
// log.info('processing edit')  ← includes traceId automatically
export type Logger = ReturnType<typeof createLogger>