# Components

Flat, generic, reusable, no feature-scoped folders (section 1/14 of the build spec). Every component below has a co-located `*.stories.tsx` file (e.g. `app-shell.tsx` / `app-shell.stories.tsx`); run `pnpm storybook` to browse them all interactively, or `pnpm build-storybook` for a static build. `pnpm test:storybook` runs every story as a real headless-browser test (default/loading/empty/error/mobile states, `prefers-reduced-motion` variants for motion primitives), which is what `/dev/components` used to do, now co-located instead of a single gallery page.

## Layout (`components/*`)

- **AppShell**: `{ nav: NavItem[], user?, actions?, footer?, children }`. Sidebar on desktop, bottom tab bar on mobile. `<AppShell nav={nav}>{children}</AppShell>`
- **PageHeader**: `{ title, description?, actions?, breadcrumbs? }`. Sticky + compacts on scroll on mobile. `<PageHeader title="Links" actions={<Button>New</Button>} />`
- **Container**: `{ size?: 'sm'|'md'|'lg'|'full' }`. The only place page widths are defined. `<Container size="sm">…</Container>`
- **Section**: `{ title?, description?, aside? }`. Vertical rhythm owner; pages are stacks of these. `<Section title="Recent links">…</Section>`
- **SplitPane**: `{ ratio?: '1:1'|'1:2'|'2:1', start, end }`. Two columns, stacks on mobile. `<SplitPane start={<A/>} end={<B/>} />`
- **ResponsiveDialog**: `{ open, onOpenChange, title, description?, footer?, trigger?, children }`. Dialog on `md+`, Drawer on mobile, every modal in the app. `<ResponsiveDialog title="Confirm" ...>…</ResponsiveDialog>`
- **AuthShowcasePanel**: `{ className? }`. The right-hand panel on `/login`; a `PhoneFrame` cycling between two illustrative screens via `Reveal`. `<AuthShowcasePanel className="hidden md:flex" />`

## Data display

- **DataTable<TData>**: `{ columns, data, getRowId?, sorting?, pagination?, rowActions?, selectable?, onSelectionChange?, onRowClick?, emptyState, loading?, skeletonRowCount?, toolbar?, mobileCard? }` + mixin props `row*`/`checkbox*`/`body*`/`cell*`/`container*` (`src/lib/mixin.ts`) for the underlying shadcn subcomponents. Headless (TanStack Table v8). Renders `mobileCard` under `md` instead of a scrolling table. `<DataTable columns={cols} data={rows} emptyState={<EmptyState .../>} />`
- **StatCard**: `{ label, value, formatter?, delta?, hint?, loading? }`. `<StatCard label="Renders" value={384} delta={12} />`
- **KpiRow**: `{ stats: StatCardProps[] }`. Responsive 2/4-col grid of `StatCard`. `<KpiRow stats={[...]} />`
- **StatusBadge**: `{ status, map: Record<string, { label, tone }> }`. `tone` is the shared `Tone` type from `components/dot.tsx`. `<StatusBadge status={render.status} map={STATUS_MAP} />`
- **Timeline**: `{ items: { at, title, description?, tone? }[] }`. `<Timeline items={events} />`
- **MediaTile**: `{ src, alt, aspect?, overlay?, onClick?, loading? }`. `<MediaTile src={url} alt="Look" />`
- **MediaGrid**: `{ items: MediaTileProps[], columns?, emptyState? }`. `<MediaGrid items={renders} />`
- **ImageReveal**: `{ from, to, alt, aspect? }`. Crossfades product → render via the `Reveal` motion primitive; the shopper-page hero. `<ImageReveal from={productUrl} to={renderUrl} alt="You" />`
- **ImageCompare**: `{ before, after, alt }`. Drag-handle before/after. `<ImageCompare before={a} after={b} alt="Compare" />`
- **AvatarStack**: `{ items: { src?, alt }[], max?, size? }`. Thin wrapper over the generated `AvatarGroup` primitive. `<AvatarStack items={members} />`
- **PhoneFrame**: `{ src?, children? }`. Bezel wrapping an iframe or children, merchant link preview. `<PhoneFrame src={previewUrl} />`
- **QrCode**: `{ value, size? }`. SVG, `fill-background`/`fill-foreground` tokens only (no library default black). `<QrCode value={linkUrl} />`
- **CopyField**: `{ value, label?, truncate? }`. Read-only + copy button; value is `translate="no"`. `<CopyField value={linkUrl} label="Link" />`
- **CountUp**: `{ value, formatter? }`. Thin wrapper over `components/motion/number-ticker.tsx`. `<CountUp value={total} />`
- **EmptyState**: `{ icon, title, description?, action? }`. `<EmptyState icon={Package} title="No products" />`
- **InlineAlert**: `{ tone?, title?, children }`. The only alert style in the app. `<InlineAlert tone="destructive">…</InlineAlert>`
- **Kbd**, **Dot** (`components/kbd.tsx`, `components/dot.tsx`): small tokens; `Tone` (`'neutral'|'success'|'warning'|'destructive'`) is exported from `dot.tsx` and reused by `StatusBadge`/`Timeline` rather than redeclared.

## Inputs and flows

- **StepWizard**: `{ steps: { id, title, optional?, render(api) }[], initialStepId?, onStepChange? }`. Persists the active step in `?step=`; needs a `<Suspense>` boundary around it on a statically-rendered route (it reads `useSearchParams`). `<Suspense><StepWizard steps={steps} /></Suspense>`
- **SearchInput**: `{ value, onChange, placeholder?, debounceMs? }`. Debounced, clearable. `<SearchInput value={q} onChange={setQ} />`
- **FilterBar**: `{ filters: FilterDef[], value, onChange }`. Inline row on desktop, `ResponsiveDialog` on mobile. Filter types: `select`, `multi`, `dateRange`, `toggle`. `<FilterBar filters={defs} value={v} onChange={setV} />`
- **SegmentedControl**: `{ options, value, onChange }`. Animated indicator via a per-instance `layoutId`. `<SegmentedControl options={opts} value={v} onChange={setV} />`
- **SwatchPicker**: `{ options: { id, token }[], value, onChange }`. Fixed `--brand-1..6` tokens only, never a free color input. `<SwatchPicker options={BRAND_OPTIONS} value={v} onChange={setV} />`
- **UploadDropzone**: `{ accept?, maxSizeMb?, capture?, multiple?, onFiles, preview?, progress?, error? }`. Owns the upload itself via `useUploadThing('imageUploader')`; `onFiles` fires with `{ url, key, name }[]`, not raw `File[]`. `<UploadDropzone onFiles={setFile} />`
- **VariantPicker**: `{ options: { name, values: { id, label, available }[] }[], value, onChange }`. `<VariantPicker options={variants} value={v} onChange={setV} />`
- **ShareSheet**: `{ title, url, file?, channels?, onShare, trigger? }`. Web Share API first, falls back to a channel grid in a `ResponsiveDialog`. `<ShareSheet title="See it on you" url={shareUrl} onShare={track} />`
- **ConfirmDialog**: `{ open, onOpenChange, title, description?, confirmLabel?, tone?, onConfirm }`. Async-aware confirm button. `<ConfirmDialog open={open} onOpenChange={setOpen} title="Delete?" onConfirm={del} />`
- **LoadingButton**: `Button` props + `{ loading? }`. Keeps its width while loading. `<LoadingButton loading={pending}>Save</LoadingButton>`
- **Stepper**: `{ value, onChange, min?, max?, step? }`. Numeric +/-. `<Stepper value={n} onChange={setN} />`
- **TagInput**: `{ value: string[], onChange, placeholder? }`. `<TagInput value={tags} onChange={setTags} />`
- **Pagination**: `{ pageIndex, pageCount, onPageChange }`. Numbered pager (`DataTable`'s own footer is Previous/Next only). `<Pagination pageIndex={i} pageCount={n} onPageChange={setI} />`
- **ProgressSteps**: `{ steps: { label, state }[], orientation? }`. Scraper pipeline / twin+render progress. `<ProgressSteps steps={steps} />`
- **PollOptions**: `{ options: { id, image, label, votes? }[], value?, onVote, results? }`. Animated result bars when `results` is set. `<PollOptions options={opts} onVote={vote} />`
- **CreditMeter**: `{ balance, reserved?, cap?, variant? }`. `<CreditMeter balance={840} cap={1000} />`
- **PricingCard**: `{ name, price, period?, features, cta, highlight?, note? }`. `<PricingCard name="Founder" price="$199" features={[...]} cta={{ label: 'Buy' }} />`
- **LanguagePicker**: `{ compact? }`. Globe trigger; `DropdownMenu` on desktop, `ResponsiveDialog` list on mobile. Self-hides if the widget doesn't init within 3s of a pick. `<LanguagePicker compact />`
- **LanguageSuggestBanner**: no props. One-line "Voir en français ?"-style prompt on first visit when the browser language matches a supported one. `<LanguageSuggestBanner />`

## Forms (`components/forms/*`)

RHF is always `import * as RHF from 'react-hook-form'`; every field below is a `<RHF.Controller>`, never `register()`. Shared shape: `FieldProps<TValues, TName> = { control, name, label, description?, className? }` (`components/forms/types.ts`), rendered through the internal `FieldLayout` shell (label + control + description/error, not itself a spec-listed component).

- **useZodForm** (`src/hooks/use-zod-form.ts`): `useZodForm(schema, options?)`, a `zodResolver`-wired `RHF.useForm`. Schema's input and output types must match (no `.transform()`).
- **Form**: `{ form, onSubmit, children }`. Wires `handleSubmit`, disables the fieldset while submitting, maps a server `Result` error to `setError('root')` or, via `error.meta.fieldErrors: Record<string,string>`, to specific fields.
- **TextField, EmailField, UrlField, TextareaField, NumberField**: plain inputs. `UrlField` normalizes (`https://` prefix) on blur.
- **SelectField, MultiSelectField**: `{ options: { value, label }[] }`; `MultiSelectField` is a `Command`+`Popover` checklist with removable chips.
- **CheckboxField, SwitchField**: consent/opt-in style fields; label reads as one sentence beside the control.
- **RadioGroupField**: `{ options }`.
- **FileField**: wraps `UploadDropzone`; field value is `UploadedFile | undefined`.
- **SwatchField, SegmentedField, TagField**: wrap `SwatchPicker`/`SegmentedControl`/`TagInput`.
- **DateField**: native `<input type="date">` (no Calendar primitive in section 10.3's shadcn list; see the `DECISION` comment in the file).

## Motion (`components/motion/*`)

Every primitive reads `useReducedMotion` and collapses to an instant state, never skip this when adding a new one.

- **FadeIn**: `{ delay?, once? }`. Opacity + 8px y, <400ms.
- **Stagger / StaggerItem**: list entrances, 40ms step, capped at 8 children.
- **Presence**: thin `AnimatePresence` wrapper (`mode?`).
- **SlideSwitch**: `{ activeKey, direction? }`. Horizontal slide between keyed children, `StepWizard` steps.
- **Reveal**: `{ revealed, from, to }`. The render reveal: shimmer while `!revealed`, 600ms crossfade + scale settle on completion. `ImageReveal` is the product-facing wrapper.
- **NumberTicker**: `{ value, durationMs?, formatter? }`. Powers `CountUp`; output is `translate="no"` (section 10.7 mitigation).
- **Pressable**: `whileTap: scale 0.98`, typed on `HTMLMotionProps<'div'>` (not `ComponentProps<'div'>`, since framer-motion's drag handlers conflict with the native DOM ones otherwise).

## Translation (`components/translate-provider.tsx`, `components/language-picker.tsx`)

Section 10.7, cookie-driven Google Translate widget, driven entirely by `LanguagePicker`/`LanguageSuggestBanner`, never Google's own UI (hidden globally in `app/globals.css`). `TranslateProvider` is mounted once in `app/layout.tsx`; it lazy-loads the widget script only when the `googtrans` cookie is already set, and contains the one class-component error boundary in the codebase (a `removeChild` mitigation). Cookie/localStorage helpers live in `src/lib/google-translate.ts`; the supported-language list and per-language suggest copy in `src/config/languages.ts`.
