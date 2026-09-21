# Mobile build: React Native shopper app

Turns TRYON LINK into a pnpm monorepo (`apps/web-app`, `apps/mobile-app`) and ships a native
shopper experience for the ~4 shopper-facing flows, calling the *existing* web app's API with no
duplicate backend logic. This file replaces the pre-launch sprint plan on this branch; the
pre-launch plan's history lives on `main` at the commit this branch forked from.

## Why a monorepo, why now

`pnpm-workspace.yaml` currently only holds an `allowBuilds` block, no `packages:` glob — this is
not a real workspace yet. Moving the existing app into `apps/web-app` is real surgery (every
import path, `tsconfig.json`, CI, Vercel root directory) and has to happen before any mobile code
lands, not alongside it.

## What we're borrowing from the reference project, and what we're not

A teammate shared a mature production Expo app at `/Users/devodii/Downloads/undisturb_zip` to mine
for patterns (read-only reference, not part of this repo, has real slop in it that's specific to
its own domain — do not copy it wholesale).

**Take:**

- `@rn-primitives/*` + `class-variance-authority` + NativeWind `className` as the component
  convention. That repo's `components.json` uses the exact same shadcn schema this repo's own
  `components.json` uses (`style: "new-york"`, same `aliases` shape) — same CLI-registry mental
  model, just targeting RN primitives instead of `radix-ui`. Its `buttonVariants` CVA shape
  (`variant`: default/destructive/outline/secondary/ghost/link, `size`:
  default/xs/sm/lg/icon/icon-xs/icon-sm/icon-lg) is already identical to this repo's
  `components/ui/button.tsx` on web — mirror that exact variant/size API on the RN Button so a
  component built once on web is a known quantity on mobile, even though the JSX differs.
- `cn()` (`clsx` + `tailwind-merge`) verbatim — this repo's web app already imports this exact
  function (from the `cn` package today); `packages/shared` should export one copy both apps
  import.
- The dual-source design-token pattern: a JS/TS constant object kept in sync with the CSS custom
  properties NativeWind reads. Real gap to solve, not copy: the reference app's tokens are plain
  hex; this repo's `app/globals.css` tokens are `oklch(...)`, which React Native's style engine
  cannot parse at all. Convert every `--token` in `app/globals.css` to hex, generated from the
  same source values so the two never drift by hand-editing twice.
- `store/storage.ts`'s split between `expo-secure-store` (tokens, anything sensitive) and
  `@react-native-async-storage/async-storage` (non-sensitive prefs) — same shape, not the same
  code (this repo's shopper identity model is different, see auth below).
- `nativewind/preset` + `nativewind/metro` + `nativewind/babel` wiring — correct NativeWind setup,
  take as-is.
- `lucide-react-native` for icons — this repo already uses `lucide-react` on web, same icon set
  available for RN 1:1 where it matters (check which icons are actually referenced first).

**Leave behind entirely:** RevenueCat, Firebase, Apple Health, home-screen widgets, live-support
sockets, `gt-react-native`, Maestro, the axios client — this repo's web app already standardized
on `fetch` + React Query this quarter, mobile should extend that same pattern, not introduce axios
as a second HTTP client philosophy. Also skip the native SwiftUI-button escape hatch in their
`Button` — unnecessary complexity for v1.

## Auth: reuse what exists, don't build parallel infrastructure

`actions/shoppers.ts`'s `createShoppers()` already mints a stateless, HMAC-signed, 400-day-lived
shopper identity (`shopperId.mac`, verified with `timingSafeEqual`, no DB session-table lookup).
On web this rides in an httpOnly cookie. That's already exactly the shape of a mobile bearer
token — long-lived and self-verifying — so there's no need to build refresh-token rotation
infrastructure (the reference app has that because its JWTs actually expire quickly; this repo's
shopper token doesn't).

Plan:

1. `actions/shoppers.ts`: export a `createShopperToken()` that mints/reuses a shopperId and
   returns `{ shopperId, token: sign(shopperId) }` **without** touching cookies, and an exported
   `verifyShopperToken(token)` wrapping the existing private `verify()`.
2. `lib/api-handler.ts`: broaden `shopper_session` auth resolution (not a new `AuthScope` union
   member — the resolved shape is identical either way, so a new member would just add type
   ceremony for no behavioral gain) to: try the existing cookie path first (web, unchanged), then
   fall back to `Authorization: Bearer <token>` verified via `verifyShopperToken` (mobile). Same
   `{ type: 'shopper_session', shopperId }` downstream — every existing shopper route works for
   mobile with zero per-route changes.
3. New `public` route, `app/api/mobile/session/route.ts`, calling `createShopperToken()`, hit once
   on first app launch; token goes straight into `expo-secure-store`.

No new tables, no refresh flow, no duplicate backend logic — the whole addition is two small
exported functions plus one broadened auth branch and one new route.

## Phase A — Foundation (this agent's scope; stop and open a PR after this lands)

- [ ] `pnpm-workspace.yaml` gets a real `packages: ["apps/*", "packages/*"]`.
- [ ] Move the entire existing app into `apps/web-app/` (git mv, preserve history), fix every
      import path, `tsconfig.json`, root `package.json` scripts, CI workflow paths, and note (in
      the PR description) that Vercel's root-directory setting will need a manual update — do not
      touch Vercel config yourself.
- [ ] `apps/web-app` must typecheck, lint, test, and build clean after the move — this is the gate
      before writing a single line of mobile code.
- [ ] `packages/shared`: pure-TS package with zero server-only imports — constants, zod schemas,
      and DB-derived row *types* (not the `actions/*` functions themselves, those import
      `server-only` and the `pg` driver) that both apps need. Both apps import from it.
- [ ] `apps/mobile-app`: fresh Expo Router (latest SDK) scaffold — NativeWind v4, `@rn-primitives`
      (only the ones actually needed below — avatar, dialog/progress/separator as needed), CVA,
      `expo-secure-store`, `@react-native-async-storage/async-storage`, `@tanstack/react-query`,
      `expo-image`, `expo-image-picker`, `lucide-react-native`.
- [ ] Token conversion: a committed script (not a manual one-off edit) converting every
      `apps/web-app/app/globals.css` `oklch()` token to hex, output as the mobile
      `tailwind.config.js` theme plus a `lib/theme.ts`-equivalent constant object, light and dark.
- [ ] RN component library, matching web's `components/ui/*` API surface only where the shopper
      flows actually need it (not a 1:1 port of all 30 web primitives): `Button` (same
      variant/size scale as web), `Text`, `Input`, `Checkbox`, `Dialog`/bottom-sheet
      (`@gorhom/bottom-sheet` — matches the reference project and is the RN ecosystem standard,
      not `@rn-primitives/dialog`'s plain modal), `Progress`, `Avatar`.
- [ ] Mobile auth wiring per the section above: the two `actions/shoppers.ts` exports, the
      broadened `resolveAuth` branch in `apps/web-app/lib/api-handler.ts`, the new
      `/api/mobile/session` route, and the mobile-side `SecureStore`-backed token client (fetch
      wrapper attaching `Authorization: Bearer <token>`, minting one on first launch if absent —
      no refresh logic needed per the auth section above).
- [ ] A single real screen proving the whole chain end-to-end: app launch → mint/read shopper
      token → fetch a real shopper-scoped endpoint (e.g. `/me`'s closet list) → render it with the
      new `Button`/`Text` components styled from the converted tokens. This is the integration
      proof, not a mocked screen.

Push incrementally to `origin` (each bullet above is its own commit once it's real and passing,
not one giant commit at the end) so progress is visible on GitHub as you go.

## Phase B — First real flow (NOT this agent's scope, do not begin)

Port the core try-on flow (`/t/[slug]` on web): consent screen, selfie capture, twin-creation
polling, render request, result screen with share.

## Phase C — Remaining shopper flows (roadmap only, not started)

`/me` (full closet), `/r/[renderId]`, `/p/[slug]` — same component library, same auth, same API.

## Explicitly out of scope

Merchant dashboard, onboarding, anything merchant-session-scoped. Push notifications,
RevenueCat-equivalent IAP, native widgets are not part of this build unless asked for later.
