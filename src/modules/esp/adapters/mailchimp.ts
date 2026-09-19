import { createHash } from 'node:crypto';
import type { Adapter, Ctx } from '@/lib/adapter';
import { err, ok, type Result } from '@/lib/result';
import type { EspPush, EspPushResult } from '../types';

/**
 * Mailchimp's Marketing API is datacenter-scoped; the datacenter suffix
 * (e.g. "us21") is embedded in the API key itself, after the last hyphen.
 */
function apiBase(apiKey: string): string {
  const dc = apiKey.split('-').pop();
  return `https://${dc}.api.mailchimp.com/3.0`;
}

function headers(apiKey: string) {
  return {
    Authorization: `apikey ${apiKey}`,
    'content-type': 'application/json',
    accept: 'application/json',
  };
}

// Mailchimp addresses list members by the lowercased MD5 of their email,
// not an internal id looked up first.
function subscriberHash(email: string): string {
  return createHash('md5').update(email.trim().toLowerCase()).digest('hex');
}

async function upsertMember(
  push: Extract<EspPush, { op: 'event' | 'setProfileProperties' }>,
  ctx: Ctx,
): Promise<Result<EspPushResult>> {
  if (!push.listId) {
    return err({ code: 'INVALID_INPUT', message: 'mailchimp requires a listId' });
  }
  const hash = subscriberHash(push.email);
  const res = await ctx.fetch(`${apiBase(push.apiKey)}/lists/${push.listId}/members/${hash}`, {
    method: 'PUT', // upsert-by-hash, per Mailchimp's own documented pattern
    headers: headers(push.apiKey),
    body: JSON.stringify({
      email_address: push.email,
      status_if_new: 'subscribed',
      merge_fields: push.properties,
    }),
  });
  if (!res.ok) {
    return err({ code: 'INTERNAL', message: `mailchimp member upsert failed: ${res.status}` });
  }

  if (push.op === 'event') {
    const tag =
      push.eventName === 'Tryon Abandoned' ? 'tryon-abandoned' : `tryon-drop-${Date.now()}`;
    await ctx.fetch(`${apiBase(push.apiKey)}/lists/${push.listId}/members/${hash}/tags`, {
      method: 'POST',
      headers: headers(push.apiKey),
      body: JSON.stringify({ tags: [{ name: tag, status: 'active' }] }),
    });
  }

  return ok({ delivered: true });
}

async function testConnection(
  push: Extract<EspPush, { op: 'test' }>,
  ctx: Ctx,
): Promise<Result<EspPushResult>> {
  return upsertMember(
    {
      op: 'setProfileProperties',
      apiKey: push.apiKey,
      listId: push.listId,
      email: push.email,
      properties: {},
    },
    ctx,
  );
}

export const mailchimpAdapter: Adapter<EspPush, EspPushResult, 'mailchimp'> = {
  key: 'mailchimp',
  canHandle: () => true,
  async run(push, ctx) {
    switch (push.op) {
      case 'event':
      case 'setProfileProperties':
        return upsertMember(push, ctx);
      case 'test':
        return testConnection(push, ctx);
    }
  },
};
