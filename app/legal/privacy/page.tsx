import { Container } from '@/components/container';

// Section 8.1's exact required disclosures (section 6.7's non-negotiables,
// restated for shoppers): photos are used only for the uploader's own
// renders, deletable any time, never used for training, 90-day retention
// unless the shopper keeps a closet account.
export default function PrivacyPage() {
  return (
    <Container size="sm" className="flex-1 space-y-6 py-16">
      <h1 className="text-2xl font-medium text-foreground">Privacy</h1>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-foreground">Your photo</h2>
        <p className="text-sm text-muted-foreground">
          A photo you upload is used only to generate try-on renders for you, the person who
          uploaded it. It is never used to train any model, never shared with other shoppers, and
          never shown to a merchant.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-foreground">Deleting your photo</h2>
        <p className="text-sm text-muted-foreground">
          You can delete your photo, your twin, and everything associated with them at any time from{' '}
          <a className="underline underline-offset-2" href="/me">
            your closet
          </a>
          . Deletion is immediate and permanent.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-foreground">Retention</h2>
        <p className="text-sm text-muted-foreground">
          If you never save an email address with us, your renders are automatically deleted after
          90 days. If you keep a closet account (by saving your email), your renders are kept until
          you delete them yourself.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-foreground">Merchants</h2>
        <p className="text-sm text-muted-foreground">
          A merchant can see that a render happened and, if you choose to leave your email, that
          email — never your photo or your rendered image.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-foreground">Contact</h2>
        <p className="text-sm text-muted-foreground">
          Questions? Reach us from your account settings.
        </p>
      </section>
    </Container>
  );
}
