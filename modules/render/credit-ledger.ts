import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { creditLedger, renders, type LedgerReason, type RenderVia } from '@/db/schema';
import { newId } from '@/lib/ids';
import { err, ok, type Result } from '@/lib/result';

export type CreateRenderInput = {
  merchantId: string;
  linkId: string;
  productId: string;
  variantId: string | null;
  shopperId: string;
  twinId: string;
  via: RenderVia;
};

/**
 * Balance is derived from the latest ledger row's `refAfter`, not a single
 * mutable balance row, so a plain `SELECT ... FOR UPDATE ORDER BY
 * created_at DESC LIMIT 1` doesn't actually serialize concurrent writers:
 * two transactions racing to reserve/grant/refund for the same merchant can
 * both lock the same pre-existing "latest" row (a concurrent transaction's
 * not-yet-committed INSERT of a newer row is invisible to them), and once
 * the first commits, the second's lock wait is satisfied against that same
 * unchanged row (Postgres only re-checks a locked row's WHERE clause when
 * the row itself was updated, not when a newer sibling row appears), so the
 * second transaction reads a stale balance instead of the true latest one.
 * A session-scoped advisory lock keyed on the merchant id forces every
 * ledger-mutating transaction for that merchant to run one at a time,
 * closing that gap regardless of the row-lock subtlety above.
 */
async function lockMerchantLedger(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  merchantId: string,
): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${merchantId}))`);
}

export async function reserveRenderCredit(
  input: CreateRenderInput,
): Promise<Result<{ renderId: string }>> {
  try {
    const renderId = await db.transaction(async (tx) => {
      await lockMerchantLedger(tx, input.merchantId);

      const [latest] = await tx
        .select({ refAfter: creditLedger.refAfter })
        .from(creditLedger)
        .where(eq(creditLedger.merchantId, input.merchantId))
        .orderBy(desc(creditLedger.createdAt))
        .limit(1)
        .for('update');

      const balance = latest?.refAfter ?? 0;
      if (balance <= 0) {
        throw { code: 'INSUFFICIENT_CREDITS' as const };
      }

      const renderId = newId('render');
      await tx.insert(renders).values({
        id: renderId,
        linkId: input.linkId,
        productId: input.productId,
        variantId: input.variantId,
        shopperId: input.shopperId,
        twinId: input.twinId,
        status: 'queued',
        via: input.via,
      });

      await tx.insert(creditLedger).values({
        id: newId('ledger'),
        merchantId: input.merchantId,
        delta: -1,
        reason: 'render',
        refAfter: balance - 1,
      });

      return renderId;
    });

    return ok({ renderId });
  } catch (cause: unknown) {
    if (
      cause &&
      typeof cause === 'object' &&
      'code' in cause &&
      cause.code === 'INSUFFICIENT_CREDITS'
    ) {
      return err({ code: 'INSUFFICIENT_CREDITS', message: "this shop's try-on is paused" });
    }
    return err({ code: 'INTERNAL', message: 'failed to reserve render credit', cause });
  }
}

export async function refundFailedRender(
  merchantId: string,
  renderId: string,
): Promise<Result<void>> {
  try {
    await db.transaction(async (tx) => {
      await lockMerchantLedger(tx, merchantId);

      const [latest] = await tx
        .select({ refAfter: creditLedger.refAfter })
        .from(creditLedger)
        .where(eq(creditLedger.merchantId, merchantId))
        .orderBy(desc(creditLedger.createdAt))
        .limit(1)
        .for('update');

      const balance = latest?.refAfter ?? 0;
      await tx.insert(creditLedger).values({
        id: newId('ledger'),
        merchantId,
        delta: 1,
        reason: 'refund_failed_render',
        refAfter: balance + 1,
      });
      await tx.update(renders).set({ status: 'failed' }).where(eq(renders.id, renderId));
    });
    return ok(undefined);
  } catch (cause) {
    return err({ code: 'INTERNAL', message: 'failed to refund render credit', cause });
  }
}

export async function currentBalance(merchantId: string): Promise<number> {
  const [row] = await db
    .select({ balance: sql<number>`coalesce(sum(${creditLedger.delta}), 0)::int` })
    .from(creditLedger)
    .where(eq(creditLedger.merchantId, merchantId));
  return row?.balance ?? 0;
}

export async function grantCredits(
  merchantId: string,
  amount: number,
  reason: LedgerReason,
): Promise<Result<{ balance: number }>> {
  try {
    const balance = await db.transaction(async (tx) => {
      await lockMerchantLedger(tx, merchantId);

      const [latest] = await tx
        .select({ refAfter: creditLedger.refAfter })
        .from(creditLedger)
        .where(eq(creditLedger.merchantId, merchantId))
        .orderBy(desc(creditLedger.createdAt))
        .limit(1)
        .for('update');

      const newBalance = (latest?.refAfter ?? 0) + amount;
      await tx.insert(creditLedger).values({
        id: newId('ledger'),
        merchantId,
        delta: amount,
        reason,
        refAfter: newBalance,
      });
      return newBalance;
    });
    return ok({ balance });
  } catch (cause) {
    return err({ code: 'INTERNAL', message: 'failed to grant credits', cause });
  }
}

export async function reserveCredits(
  merchantId: string,
  amount: number,
): Promise<Result<{ balance: number }>> {
  try {
    const balance = await db.transaction(async (tx) => {
      await lockMerchantLedger(tx, merchantId);

      const [latest] = await tx
        .select({ refAfter: creditLedger.refAfter })
        .from(creditLedger)
        .where(eq(creditLedger.merchantId, merchantId))
        .orderBy(desc(creditLedger.createdAt))
        .limit(1)
        .for('update');

      const currentBalance = latest?.refAfter ?? 0;
      if (currentBalance < amount) {
        throw { code: 'INSUFFICIENT_CREDITS' as const };
      }

      const newBalance = currentBalance - amount;
      await tx.insert(creditLedger).values({
        id: newId('ledger'),
        merchantId,
        delta: -amount,
        reason: 'campaign_reserve',
        refAfter: newBalance,
      });
      return newBalance;
    });
    return ok({ balance });
  } catch (cause: unknown) {
    if (
      cause &&
      typeof cause === 'object' &&
      'code' in cause &&
      cause.code === 'INSUFFICIENT_CREDITS'
    ) {
      return err({ code: 'INSUFFICIENT_CREDITS', message: 'not enough credits for this campaign' });
    }
    return err({ code: 'INTERNAL', message: 'failed to reserve campaign credits', cause });
  }
}

export async function releaseCredits(
  merchantId: string,
  amount: number,
): Promise<Result<{ balance: number }>> {
  return grantCredits(merchantId, amount, 'campaign_reserve');
}
