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

// Every Route Handler in app/api/** is built with apiHandler() instead of a
// bespoke export, so auth, validation, rate limiting, idempotency, and error
// shaping live in one place (section 1.3/4's "one interface, many
// implementations" philosophy applied to routes, not just adapters).

export type AuthScope = 'merchant_session' | 'shopper_session' | 'cron' | 'webhook' | 'public';

export type ResolvedAuth =
  | { type: 'merchant_session'; merchantId: string; email: string }
  | { type: 'shopper_session'; shopperId: string }
  | { type: 'cron' }
  | { type: 'webhook' }
  | { type: 'public' };

export type HandlerConfig<TBody, TParams, TQuery> = {
  /** Unique key in routeRegistry, e.g. "cron.drainJobs". Required so /api/docs and MCP tool listing have a stable id. */
  name: string;
  schema?: {
    body?: z.ZodType<TBody>;
    params?: z.ZodType<TParams>;
    query?: z.ZodType<TQuery>;
  };
  /** Opt-in: only routes that set this appear in mcpToolsRegistry / GET /api/mcp/tools. */
  mcp?: { name: string; description: string };
  /** Scopes tried in order; first that resolves wins. Omitted/empty = public (no auth resolution). */
  auth?: AuthScope[];
  /** Required when `auth` includes 'webhook' — fal and Stripe verify completely differently, so each route supplies its own check rather than the util guessing. */
  webhookVerify?: (req: NextRequest) => Promise<Result<void>> | Result<void>;
  /** Mechanism only — the route supplies its own key/limit/window (section 7.4/13 have the actual numbers, which belong in src/config once the routes using them exist). */
  rateLimit?: {
    key: (args: { auth: ResolvedAuth; req: NextRequest }) => string;
    limit: number;
    windowSeconds: number;
  };
  /** Same-origin by default; only public embeds (e.g. the marketing quick-link demo) need this. */
  cors?: boolean;
  /**
   * DECISION: defaults to false, unlike the reference implementation this
   * pattern is adapted from (which snake_cased every response for a public
   * REST API convention). This codebase is camelCase end to end — Drizzle
   * columns, NormalizedProduct, etc. — so flipping the response shape by
   * default would fight every other module. Opt in per route if a consumer
   * genuinely needs snake_case (e.g. a public API for third parties, Phase 2).
   */
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

// Every route registers here regardless of MCP exposure — GET /api/docs lists all of it.
export const routeRegistry = new Map<string, HandlerConfig<unknown, unknown, unknown>>();
// Opt-in subset (config.mcp set) — GET /api/mcp/tools lists only these.
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
  SCRAPE_FAILED: 502,
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

// The one sanctioned place in this codebase that throws instead of returning
// a Result: apiHandler is the boundary that adapts Result-returning route
// handlers to Next.js's Response-based routing, so throw-and-catch here is
// the mechanism, not a violation of section 1.4's "never throw across module
// boundaries" (which is about application code, not this framework glue).
function appError(
  code: AppError['code'],
  message: string,
  meta?: Record<string, unknown>,
): AppError {
  return { code, message, meta };
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  // DECISION: no origin allowlist yet — every current caller of a cors:true
  // route is our own frontend or an anonymous public visitor (section 8.4's
  // marketing quick-link demo). Tighten to a real allowlist if/when a
  // cross-origin embed with credentials is actually built.
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
      // M4: creates a `shoppers` row + signs the cookie on first visit, per
      // section 3/8.3 — always "succeeds" (there's no such thing as an
      // unauthenticated shopper request, only a not-yet-identified one), so
      // this never falls through to the next scope.
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

// M4: every shopper-scoped route needs this exact narrowing (resolveAuth's
// return type is the union of everything any scope could resolve to, even
// though a route declaring only `['shopper_session']` will in fact always
// get that variant back) — one helper instead of the same runtime check
// copy-pasted into every shopper route.
export function requireShopperSession(
  resolvedAuth: ResolvedAuth,
): Result<{ shopperId: string }, AppError> {
  if (resolvedAuth.type !== 'shopper_session') {
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'shopper session required' } };
  }
  return { ok: true, value: { shopperId: resolvedAuth.shopperId } };
}

// M5: the merchant-scoped equivalent of `requireShopperSession` above — same
// reasoning, one helper instead of copy-pasting the narrowing into every
// dashboard/onboarding route.
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

// M3: extracted to src/lib/rate-limit.ts so module-level code that isn't
// behind a Next.js route (render submission, twin creation) can share the
// same primitive instead of a second implementation.

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
    // Stale lock (handler crashed mid-request) — clear it so the retry can proceed.
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

      // Validation before idempotency (deliberately reordered vs. the
      // reference pattern this is adapted from, which checked idempotency
      // first — that let a request with a malformed body permanently consume
      // the idempotency key, since the early-return on a validation failure
      // never reached the lock-release code in its catch block).
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
