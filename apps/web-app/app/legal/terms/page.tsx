import { Container } from '@/components/container';

export default function TermsPage() {
  return (
    <Container size="sm" className="flex-1 space-y-6 py-16">
      <h1 className="text-2xl font-medium text-foreground">Terms</h1>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-foreground">Who this is for</h2>
        <p className="text-sm text-muted-foreground">
          Merchants use this to let their shoppers try on products virtually. Shoppers use it to see
          themselves in a product before they buy: free, with no account required.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-foreground">Acceptable use</h2>
        <p className="text-sm text-muted-foreground">
          Only upload a photo of yourself, and only if you are 18 or older. Don&apos;t upload a
          photo of anyone else without their permission. Don&apos;t use this to generate renders of
          products intended for children.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-foreground">Merchant credits</h2>
        <p className="text-sm text-muted-foreground">
          Merchants buy render credits; shoppers never pay. A failed render is automatically
          refunded to the merchant&apos;s balance.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-foreground">Changes</h2>
        <p className="text-sm text-muted-foreground">
          We may update these terms; continued use after a change means you accept the update.
        </p>
      </section>
    </Container>
  );
}
