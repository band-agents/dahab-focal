import { mediaStoreProblem } from './media/store.ts';

/**
 * What stops this API from working safely, before it takes a request.
 *
 * `AUTH_SECRET` is read lazily, when a token is signed or verified — so
 * without this check a server with no secret starts happily, answers its
 * health check, and then 500s on every authenticated request. The standalone
 * server refuses to boot on any of these; the serverless handler (see
 * ./http/fetch-handler.ts) refuses every request with a 503 instead, because
 * a function has no boot to refuse.
 */
export function configProblems(env: NodeJS.ProcessEnv = process.env): string[] {
  const isProduction = (env['NODE_ENV'] ?? 'development') === 'production';
  const problems: string[] = [];

  const secret = env['AUTH_SECRET'];
  if (secret === undefined || secret.length < 32) {
    problems.push('AUTH_SECRET must be set and at least 32 characters (openssl rand -base64 48)');
  }
  if (isProduction && secret === 'replace-me-before-running-anywhere-real') {
    problems.push('AUTH_SECRET is still the placeholder from .env.example');
  }
  if (isProduction && env['DATABASE_URL'] === undefined) {
    problems.push('DATABASE_URL must be set in production');
  }
  // The console transport prints one-time codes into the log. It refuses to
  // construct in production on its own; this says so up front instead of at
  // the first sign-in attempt. `disabled` is allowed: it sends nothing.
  if (isProduction && (env['OTP_TRANSPORT'] ?? 'console') === 'console') {
    problems.push('OTP_TRANSPORT=console logs every one-time code; set a real gateway or "disabled"');
  }
  // Uploads on a container's own disk vanish at the next deploy, and a
  // serverless function has no disk worth the name. Online they go to
  // Supabase Storage, and a store that cannot work is refused.
  const storeProblem = mediaStoreProblem(env);
  if (storeProblem !== null) problems.push(storeProblem);
  if (isProduction && (env['MEDIA_STORE'] ?? 'local') !== 'supabase') {
    problems.push('MEDIA_STORE must be supabase in production; a server disk does not keep files');
  }
  return problems;
}
