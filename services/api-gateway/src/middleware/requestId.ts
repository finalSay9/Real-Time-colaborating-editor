import { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'

// Stamps every request with a traceId.
// Services forward this header so OpenTelemetry
// can link spans across the whole system.
export function requestId(req: Request, res: Response, next: NextFunction) {
  const traceId = (req.headers['x-trace-id'] as string) ?? randomUUID()
  req.headers['x-trace-id'] = traceId
  res.setHeader('x-trace-id', traceId)
  next()
}