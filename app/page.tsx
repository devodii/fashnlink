// DECISION: the real marketing page (hero, live demo, pricing) is built in M6.
// This placeholder only proves the app boots on token-compliant styling.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 bg-background p-8 text-center">
      <h1 className="text-2xl font-semibold text-foreground">App</h1>
      <p className="text-sm text-muted-foreground">Foundation milestone in progress.</p>
    </main>
  );
}
