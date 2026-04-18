"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = void 0;
const pino_1 = __importDefault(require("pino"));
// In production logs are JSON (machine readable).
// In development they're pretty-printed (human readable).
// The traceId field is what OpenTelemetry uses to link
// log lines to a specific request across all services.
const createLogger = (service) => (0, pino_1.default)({
    name: service,
    level: process.env.LOG_LEVEL ?? 'info',
    ...(process.env.NODE_ENV !== 'production' && {
        transport: {
            target: 'pino-pretty',
            options: { colorize: true },
        },
    }),
});
exports.createLogger = createLogger;
