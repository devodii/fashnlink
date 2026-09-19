import type { Adapter, Ctx } from '@/lib/adapter';
import { err, ok, type Result } from '@/lib/result';
import type { EspPush, EspPushResult } from '../types';

const API_BASE = 'https://a.klaviyo.com/api';
/**
 * DECISION: Klaviyo requires a dated revision header on every request. This
 * is the most recent stable revision known at build time; since no real
 * Klaviyo account exists in this sandbox to verify against live, whoever
 * connects a real account first should confirm this against
 * https://developers.klaviyo.com/en/docs/api_versioning_and_deprecation
 * before relying on it in production, and bump it here (one place) if stale.
 */
const REVISION = '2025-07-15';

function headers(apiKey: string) {
  return {
    Authorization: `Klaviyo-API-Key ${apiKey}`,
    revision: REVISION,
    'content-type': 'application/json',
    accept: 'application/json',
  };
}

async function pushEvent(
  push: Extract<EspPush, { op: 'event' }>,
  ctx: Ctx,
): Promise<Result<EspPushResult>> {
  const res = await ctx.fetch(`${API_BASE}/events/`, {
    method: 'POST',
    headers: headers(push.apiKey),
    body: JSON.stringify({
      data: {
        type: 'event',
        attributes: {
          properties: push.properties,
          metric: { data: { type: 'metric', attributes: { name: push.eventName } } },
          profile: { data: { type: 'profile', attributes: { email: push.email } } },
        },
      },
    }),
  });
  if (!res.ok) {
    return err({ code: 'INTERNAL', message: `klaviyo event push failed: ${res.status}` });
  }
  return ok({ delivered: true });
}

/**
 * Profile properties (including the `unsubscribed_tryon` opt-out signal,
 * section 9.8) upsert by email; Klaviyo's profile-import endpoint
 * creates-or-updates rather than erroring on an existing profile.
 */
async function setProfileProperties(
  push: Extract<EspPush, { op: 'setProfileProperties' }>,
  ctx: Ctx,
): Promise<Result<EspPushResult>> {
  const res = await ctx.fetch(`${API_BASE}/profile-import/`, {
    method: 'POST',
    headers: headers(push.apiKey),
    body: JSON.stringify({
      data: {
        type: 'profile',
        attributes: { email: push.email, properties: push.properties },
      },
    }),
  });
  if (!res.ok) {
    return err({ code: 'INTERNAL', message: `klaviyo profile update failed: ${res.status}` });
  }
  return ok({ delivered: true });
}

async function testConnection(
  push: Extract<EspPush, { op: 'test' }>,
  ctx: Ctx,
): Promise<Result<EspPushResult>> {
  return pushEvent(
    {
      op: 'event',
      apiKey: push.apiKey,
      listId: push.listId,
      email: push.email,
      eventName: 'Tryon Abandoned',
      properties: { test: true },
    },
    ctx,
  );
}

export const klaviyoAdapter: Adapter<EspPush, EspPushResult, 'klaviyo'> = {
  key: 'klaviyo',
  canHandle: () => true,
  async run(push, ctx) {
    switch (push.op) {
      case 'event':
        return pushEvent(push, ctx);
      case 'setProfileProperties':
        return setProfileProperties(push, ctx);
      case 'test':
        return testConnection(push, ctx);
    }
  },
};
