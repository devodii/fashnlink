import 'server-only';

import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import type { z } from 'zod';

import { db } from '@/db';
import { idempotencyKeys, merchants } from '@/db/schema';
import { auth } from '@/modules/auth';
import { getOrCreateShopperId } from '@/modules/shoppers';
import { env } from '@/lib/env';
import { childLogger } from '@/lib/log';
import { consumeRateLimit } from '@/lib/rate-limit';
import type { AppError, Result } from '@/lib/result';

export type AuthScope = 'merchant_session' | 'shopper_session' | 'cron' | 'webhook' | 'public';

export type ResolvedAuth =
  | { type: 'merchant_session'; merchantId: string; email: string }
  | { type: 'shopper_session'; shopperId: string }
  | { type: 'cron' }
  | { type: 'webhook' }
  | { type: 'public' };

export type HandlerConfig<TBody, TParams, TQuery> = {
  name: string;
  schema?: {
    body?: z.ZodType<TBody>;
    params?: z.ZodType<TParams>;
    query?: z.ZodType<TQuery>;
  };
  mcp?: { name: string; description: string };
  auth?: AuthScope[];
  webhookVerify?: (req: NextRequest) => Promise<Result<void>> | Result<void>;
  rateLimit?: {
    key: (args: { auth: ResolvedAuth; req: NextRequest }) => string;
    limit: number;
    windowSeconds: number;
  };
  cors?: boolean;
  convertToSnakeCase?: boolean;
  handler: (args: {
    body: TBody;
    params: TParams;
    query: TQuery;
    auth: ResolvedAuth;
    req: NextRequest;
    requestId: string;
  }) => Promise<Result<unknown> | Response> | Result<unknown> | Response;
};

export const routeRegistry = new Map<string, HandlerConfig<unknown, unknown, unknown>>();
export const mcpToolsRegistry = new Map<string, HandlerConfig<unknown, unknown, unknown>>();

const STATUS_BY_CODE: Record<AppError['code'], number> = {
  INVALID_INPUT: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNSUPPORTED_PLATFORM: 422,
  MODERATION_BLOCKED: 422,
  INSUFFICIENT_CREDITS: 402,
  RATE_LIMITED: 429,
  /**
   * Not 5xx: this handler's own catch block replaces every >= 500 message
   * with a generic "an internal error occurred" string, which would hide
   * client-actionable scrape errors (e.g. "Shopify product not found: ...")
   * that onboarding and the dashboard's new-link form need to display.
   */
  SCRAPE_FAILED: 422,
  RENDER_FAILED: 502,
  INTERNAL: 500,
};

function isAppError(value: unknown): value is AppError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    typeof (value as { code: unknown }).code === 'string' &&
    (value as { code: string }).code in STATUS_BY_CODE
  );
}

function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;
  return { code: 'INTERNAL', message: 'An internal error occurred', cause: error };
}

function appError(
  code: AppError['code'],
  message: string,
  meta?: Record<string, unknown>,
): AppError {
  return { code, message, meta };
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key',
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  };
}

export const createOptionsHandler = () => (req: NextRequest) =>
  new NextResponse(null, { status: 204, headers: getCorsHeaders(req.headers.get('origin')) });

async function resolveMerchantSession(req: NextRequest): Promise<ResolvedAuth | null> {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.email) return null;
  const [merchant] = await db
    .select({ id: merchants.id, email: merchants.email })
    .from(merchants)
    .where(eq(merchants.email, session.user.email))
    .limit(1);
  if (!merchant) return null;
  return { type: 'merchant_session', merchantId: merchant.id, email: merchant.email };
}

async function resolveAuth<TBody, TParams, TQuery>(
  scopes: AuthScope[],
  req: NextRequest,
  webhookVerify: HandlerConfig<TBody, TParams, TQuery>['webhookVerify'],
): Promise<ResolvedAuth> {
  if (scopes.length === 0 || scopes.includes('public')) return { type: 'public' };

  for (const scope of scopes) {
    if (scope === 'public') return { type: 'public' };

    if (scope === 'shopper_session') {
      const shopperId = await getOrCreateShopperId();
      return { type: 'shopper_session', shopperId };
    }

    if (scope === 'cron') {
      const header = req.headers.get('authorization');
      if (env.CRON_SECRET && header === `Bearer ${env.CRON_SECRET}`) return { type: 'cron' };
      continue;
    }

    if (scope === 'webhook') {
      if (!webhookVerify) {
        throw appError(
          'INTERNAL',
          "route declares 'webhook' auth but supplied no webhookVerify callback",
        );
      }
      const verified = await webhookVerify(req);
      if (verified.ok) return { type: 'webhook' };
      continue;
    }

    if (scope === 'merchant_session') {
      const resolved = await resolveMerchantSession(req);
      if (resolved) return resolved;
      continue;
    }
  }

  throw appError('UNAUTHORIZED', 'Unauthorized');
}

export function requireShopperSession(
  resolvedAuth: ResolvedAuth,
): Result<{ shopperId: string }, AppError> {
  if (resolvedAuth.type !== 'shopper_session') {
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'shopper session required' } };
  }
  return { ok: true, value: { shopperId: resolvedAuth.shopperId } };
}

export function requireMerchantSession(
  resolvedAuth: ResolvedAuth,
): Result<{ merchantId: string; email: string }, AppError> {
  if (resolvedAuth.type !== 'merchant_session') {
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'merchant session required' } };
  }
  return { ok: true, value: { merchantId: resolvedAuth.merchantId, email: resolvedAuth.email } };
}

function actorIdFor(resolvedAuth: ResolvedAuth): string {
  switch (resolvedAuth.type) {
    case 'merchant_session':
      return resolvedAuth.merchantId;
    case 'shopper_session':
      return resolvedAuth.shopperId;
    case 'cron':
      return 'cron';
    case 'webhook':
      return 'webhook';
    case 'public':
      return 'public';
  }
}

type IdempotencyLookup = { done: true; status: number; body: unknown } | { done: false } | null;

async function getStoredIdempotentResponse(
  key: string,
  actorId: string,
): Promise<IdempotencyLookup> {
  const [row] = await db
    .select()
    .from(idempotencyKeys)
    .where(and(eq(idempotencyKeys.key, key), eq(idempotencyKeys.actorId, actorId)))
    .limit(1);
  if (!row) return null;
  if (row.responseStatus !== null)
    return { done: true, status: row.responseStatus, body: row.responseBody };

  const lockAgeMs = Date.now() - row.lockedAt.getTime();
  if (lockAgeMs > 60_000) {
    await db
      .delete(idempotencyKeys)
      .where(and(eq(idempotencyKeys.key, key), eq(idempotencyKeys.actorId, actorId)));
    return null;
  }
  return { done: false };
}

async function tryAcquireIdempotencyLock(
  key: string,
  actorId: string,
  route: string,
): Promise<boolean> {
  const inserted = await db
    .insert(idempotencyKeys)
    .values({ key, actorId, route })
    .onConflictDoNothing({ target: [idempotencyKeys.key, idempotencyKeys.actorId] })
    .returning({ key: idempotencyKeys.key });
  return inserted.length > 0;
}

async function saveIdempotentResult(
  key: string,
  actorId: string,
  status: number,
  body: unknown,
): Promise<void> {
  await db
    .update(idempotencyKeys)
    .set({ responseStatus: status, responseBody: body as object })
    .where(and(eq(idempotencyKeys.key, key), eq(idempotencyKeys.actorId, actorId)));
}

async function releaseIdempotencyLock(key: string, actorId: string): Promise<void> {
  await db
    .delete(idempotencyKeys)
    .where(and(eq(idempotencyKeys.key, key), eq(idempotencyKeys.actorId, actorId)));
}

function toSnakeCase(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(toSnakeCase);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [
      k.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
      toSnakeCase(v),
    ]),
  );
}

export const apiHandler = <TBody = unknown, TParams = unknown, TQuery = unknown>(
  config: HandlerConfig<TBody, TParams, TQuery>,
) => {
  if (routeRegistry.has(config.name)) {
    throw new Error(`Route "${config.name}" is already registered — route names must be unique`);
  }
  routeRegistry.set(config.name, config as HandlerConfig<unknown, unknown, unknown>);
  if (config.mcp)
    mcpToolsRegistry.set(config.mcp.name, config as HandlerConfig<unknown, unknown, unknown>);

  return async (
    req: NextRequest,
    context: { params: Promise<Record<string, string | string[]>> },
  ) => {
    const requestId = crypto.randomUUID();
    const log = childLogger(requestId, { route: config.name });
    const corsHeaders = config.cors ? getCorsHeaders(req.headers.get('origin')) : {};
    const idempotencyKey = req.headers.get('idempotency-key');

    let resolvedAuth: ResolvedAuth | null = null;
    let idemLocked = false;
    let idemActorId: string | null = null;
    let rateHeaders: Record<string, string> = {};

    try {
      resolvedAuth = await resolveAuth(config.auth ?? ['public'], req, config.webhookVerify);

      if (config.rateLimit) {
        const rateLimitKey = config.rateLimit.key({ auth: resolvedAuth, req });
        const rl = await consumeRateLimit(
          rateLimitKey,
          config.rateLimit.limit,
          config.rateLimit.windowSeconds,
        );
        rateHeaders = {
          'X-RateLimit-Limit': rl.limit.toString(),
          'X-RateLimit-Remaining': rl.remaining.toString(),
          'X-RateLimit-Reset': Math.floor(rl.reset.getTime() / 1000).toString(),
        };
        if (!rl.allowed) throw appError('RATE_LIMITED', 'Too many requests');
      }

      /**
       * Validation must run before the idempotency-lock check: acquiring
       * the lock first and then failing validation would leave the lock
       * permanently held, since the early return never reaches the
       * lock-release code in the catch block below.
       */
      const rawParams = await context.params;
      const { searchParams } = new URL(req.url);
      const rawQuery = Object.fromEntries(searchParams.entries());

      let body = {} as TBody;
      if (config.schema?.body) {
        const json = await req.json().catch(() => ({}));
        const parsed = config.schema.body.safeParse(json);
        if (!parsed.success) {
          return NextResponse.json(
            {
              error: {
                code: 'INVALID_INPUT',
                message: parsed.error.issues[0]?.message ?? 'Invalid body',
              },
            },
            { status: 400, headers: corsHeaders },
          );
        }
        body = parsed.data;
      }

      let params = rawParams as TParams;
      if (config.schema?.params) {
        const parsed = config.schema.params.safeParse(rawParams);
        if (!parsed.success) {
          return NextResponse.json(
            {
              error: {
                code: 'INVALID_INPUT',
                message: parsed.error.issues[0]?.message ?? 'Invalid params',
              },
            },
            { status: 400, headers: corsHeaders },
          );
        }
        params = parsed.data;
      }

      let query = rawQuery as TQuery;
      if (config.schema?.query) {
        const parsed = config.schema.query.safeParse(rawQuery);
        if (!parsed.success) {
          return NextResponse.json(
            {
              error: {
                code: 'INVALID_INPUT',
                message: parsed.error.issues[0]?.message ?? 'Invalid query',
              },
            },
            { status: 400, headers: corsHeaders },
          );
        }
        query = parsed.data;
      }

      if (idempotencyKey && req.method === 'POST' && resolvedAuth.type !== 'public') {
        idemActorId = actorIdFor(resolvedAuth);
        const stored = await getStoredIdempotentResponse(idempotencyKey, idemActorId);
        if (stored?.done) {
          return NextResponse.json(stored.body, { status: stored.status, headers: corsHeaders });
        }
        if (stored && !stored.done) {
          throw appError('CONFLICT', 'Request with this idempotency key is already in progress');
        }
        const locked = await tryAcquireIdempotencyLock(idempotencyKey, idemActorId, config.name);
        if (!locked)
          throw appError('CONFLICT', 'Request with this idempotency key is already in progress');
        idemLocked = true;
      }

      const result = await config.handler({
        body,
        params,
        query,
        auth: resolvedAuth,
        req,
        requestId,
      });

      if (result instanceof Response) return result;
      if (!result.ok) throw result.error;

      const payload = config.convertToSnakeCase ? toSnakeCase(result.value) : result.value;
      const responseHeaders = { ...corsHeaders, ...rateHeaders, 'cache-control': 'no-store' };

      if (idemLocked && idemActorId && idempotencyKey) {
        await saveIdempotentResult(idempotencyKey, idemActorId, 200, payload);
      }

      return NextResponse.json(payload, { headers: responseHeaders });
    } catch (error) {
      if (idemLocked && idemActorId && idempotencyKey) {
        await releaseIdempotencyLock(idempotencyKey, idemActorId).catch((releaseError: unknown) => {
          log.error({ error: releaseError }, 'idempotency lock release failed');
        });
      }

      const appErr = toAppError(error);
      const status = STATUS_BY_CODE[appErr.code];
      const message =
        status >= 500
          ? 'An internal error occurred. Our engineers have been notified.'
          : appErr.message;

      log.error(
        { error: appErr, method: req.method, path: req.nextUrl.pathname },
        'api handler failure',
      );

      return NextResponse.json(
        { error: { code: appErr.code, message } },
        { status, headers: { ...corsHeaders, ...rateHeaders } },
      );
    }
  };
};
