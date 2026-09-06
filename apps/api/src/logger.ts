/**
 * Structured logging.
 *
 * One JSON object per line, with a request id on every line so a single
 * traveler's failing checkout can be pulled out of a day's traffic. No
 * dependency: the only thing a logging library would add here is a
 * configuration file.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Readonly<Record<LogLevel, number>> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/**
 * Anything whose value must never reach a log line, at any depth.
 *
 * Deliberately not on this list: a bare `code`. It reads as "one-time code"
 * in the auth flow and as "error code" everywhere else, and redacting the
 * latter blinds the logs to exactly the field you open them for. The OTP
 * paths name their field `otpCode`, which is on the list.
 */
const REDACTED_KEYS = new Set([
  'otp',
  'otpCode',
  'verificationCode',
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'refreshTokenHash',
  'authorization',
  'accountToken',
  'cardNumber',
  'cvv',
  'phone',
  'email',
  'signature',
]);

export type LogFields = Record<string, unknown>;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[deep]';
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));

  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    output[key] = REDACTED_KEYS.has(key) ? '[redacted]' : redact(nested, depth + 1);
  }
  return output;
}

export interface Logger {
  readonly level: LogLevel;
  child(fields: LogFields): Logger;
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

export function createLogger(
  level: LogLevel = (process.env['LOG_LEVEL'] as LogLevel | undefined) ?? 'info',
  base: LogFields = {},
): Logger {
  const write = (entryLevel: LogLevel, message: string, fields: LogFields = {}): void => {
    if (LEVEL_ORDER[entryLevel] < LEVEL_ORDER[level]) return;
    const line = {
      time: new Date().toISOString(),
      level: entryLevel,
      message,
      ...(redact({ ...base, ...fields }) as LogFields),
    };
    const stream = entryLevel === 'error' || entryLevel === 'warn' ? process.stderr : process.stdout;
    stream.write(`${JSON.stringify(line)}\n`);
  };

  return {
    level,
    child: (fields) => createLogger(level, { ...base, ...fields }),
    debug: (message, fields) => write('debug', message, fields),
    info: (message, fields) => write('info', message, fields),
    warn: (message, fields) => write('warn', message, fields),
    error: (message, fields) => write('error', message, fields),
  };
}

export const logger = createLogger();
