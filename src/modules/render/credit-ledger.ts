import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { creditLedger, renders, renderViaEnum } from '@/db/schema';
import { newId } from '@/lib/ids';
import { err, ok, type Result } from '@/lib/result';

export type CreateRenderInput = {
  merchantId: string;
  linkId: string;
  productId: string;
  variantId: string | null;
  shopperId: string;
  twinId: string;
  via: (typeof renderViaEnum.enumValues)[number];
};

// Section 7.3: "Every submitted render writes a credit_ledger row with
// delta: -1 for the link's merchant, atomically with the insert of the
// render (single transaction). If balance would go below 0, return
// INSUFFICIENT_CREDITS." Balance is computed from the ledger, never cached
// (section 5) — the `SELECT ... FOR UPDATE` on the merchant's latest ledger
// row is what makes the check-then-insert race-free under concurrent
// submissions for the same merchant, not the transaction alone.
export async function reserveRenderCredit(
  input: CreateRenderInput,
): Promise<Result<{ renderId: string }>> {
  try {
    const renderId = await db.transaction(async (tx) => {
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

// Section 7.3: "Failed renders are refunded to the merchant's ledger
// automatically." Append-only — this is a `+1` reversal row, never an edit
// or delete of the original `-1` row.
export async function refundFailedRender(
  merchantId: string,
  renderId: string,
): Promise<Result<void>> {
  try {
    await db.transaction(async (tx) => {
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
