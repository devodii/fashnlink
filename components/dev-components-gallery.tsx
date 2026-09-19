'use client';

import * as React from 'react';
import { Suspense } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Package, ShoppingBag } from 'lucide-react';

import { useZodForm } from '@/hooks/use-zod-form';
import { z } from 'zod';

import { AppShell, type NavItem } from '@/components/app-shell';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { PageHeader } from '@/components/page-header';
import { SplitPane } from '@/components/split-pane';
import { ResponsiveDialog } from '@/components/responsive-dialog';

import { DataTable } from '@/components/data-table';
import { KpiRow } from '@/components/kpi-row';
import { StatusBadge } from '@/components/status-badge';
import { Timeline } from '@/components/timeline';
import { MediaGrid } from '@/components/media-grid';
import { ImageReveal } from '@/components/image-reveal';
import { ImageCompare } from '@/components/image-compare';
import { AvatarStack } from '@/components/avatar-stack';
import { PhoneFrame } from '@/components/phone-frame';
import { QrCode } from '@/components/qr-code';
import { CopyField } from '@/components/copy-field';
import { CountUp } from '@/components/count-up';
import { EmptyState } from '@/components/empty-state';
import { InlineAlert } from '@/components/inline-alert';
import { Kbd } from '@/components/kbd';
import { Dot } from '@/components/dot';

import { StepWizard } from '@/components/step-wizard';
import { SearchInput } from '@/components/search-input';
import { FilterBar, type FilterValue } from '@/components/filter-bar';
import { SegmentedControl } from '@/components/segmented-control';
import { SwatchPicker } from '@/components/swatch-picker';
import { UploadDropzone } from '@/components/upload-dropzone';
import { VariantPicker } from '@/components/variant-picker';
import { ShareSheet } from '@/components/share-sheet';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { LoadingButton } from '@/components/loading-button';
import { Stepper } from '@/components/stepper';
import { TagInput } from '@/components/tag-input';
import { Pagination } from '@/components/pagination';
import { ProgressSteps } from '@/components/progress-steps';
import { PollOptions } from '@/components/poll-options';
import { CreditMeter } from '@/components/credit-meter';
import { PricingCard } from '@/components/pricing-card';
import { LanguagePicker } from '@/components/language-picker';

import { Form } from '@/components/forms/form';
import { TextField } from '@/components/forms/text-field';
import { EmailField } from '@/components/forms/email-field';
import { UrlField } from '@/components/forms/url-field';
import { TextareaField } from '@/components/forms/textarea-field';
import { NumberField } from '@/components/forms/number-field';
import { SelectField } from '@/components/forms/select-field';
import { MultiSelectField } from '@/components/forms/multi-select-field';
import { CheckboxField } from '@/components/forms/checkbox-field';
import { SwitchField } from '@/components/forms/switch-field';
import { RadioGroupField } from '@/components/forms/radio-group-field';
import { SwatchField } from '@/components/forms/swatch-field';
import { SegmentedField } from '@/components/forms/segmented-field';
import { TagField } from '@/components/forms/tag-field';
import { DateField } from '@/components/forms/date-field';

import { FadeIn } from '@/components/motion/fade-in';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { SlideSwitch } from '@/components/motion/slide-switch';
import { Pressable } from '@/components/motion/pressable';

import { Button } from '@/components/ui/button';

const BRAND_OPTIONS = [1, 2, 3, 4, 5, 6].map((n) => ({ id: String(n), token: `brand-${n}` }));

const DEMO_STATUS_MAP = {
  queued: { label: 'Queued', tone: 'neutral' as const },
  running: { label: 'Running', tone: 'warning' as const },
  succeeded: { label: 'Succeeded', tone: 'success' as const },
  failed: { label: 'Failed', tone: 'destructive' as const },
};

interface DemoRow {
  id: string;
  title: string;
  status: keyof typeof DEMO_STATUS_MAP;
  renders: number;
}

const DEMO_ROWS: DemoRow[] = [
  { id: '1', title: 'Linen shirt', status: 'succeeded', renders: 42 },
  { id: '2', title: 'Wrap dress', status: 'running', renders: 11 },
  { id: '3', title: 'Suede loafers', status: 'queued', renders: 0 },
  { id: '4', title: 'Denim jacket', status: 'failed', renders: 3 },
];

const DEMO_COLUMNS: ColumnDef<DemoRow>[] = [
  { accessorKey: 'title', header: 'Product' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => <StatusBadge status={getValue<string>()} map={DEMO_STATUS_MAP} />,
  },
  { accessorKey: 'renders', header: 'Renders' },
];

const formSchema = z.object({
  title: z.string().min(1, 'Required'),
  email: z.string().email(),
  url: z.string().min(1),
  description: z.string().optional().default(''),
  price: z.number().optional(),
  category: z.string().min(1, 'Required'),
  tags: z.array(z.string()).default([]),
  consent: z.boolean().refine((v) => v, 'Required'),
  notify: z.boolean().default(false),
  size: z.string().min(1, 'Required'),
  accent: z.string().min(1, 'Required'),
  channel: z.string().min(1, 'Required'),
  labels: z.array(z.string()).default([]),
  releaseDate: z.string().optional().default(''),
});

function FormDemo() {
  const form = useZodForm(formSchema, {
    defaultValues: {
      title: '',
      email: '',
      url: '',
      description: '',
      price: undefined,
      category: '',
      tags: [],
      consent: false,
      notify: false,
      size: '',
      accent: '',
      channel: 'whatsapp',
      labels: [],
      releaseDate: '',
    },
  });

  return (
    <Form
      form={form}
      onSubmit={async () => {
        await new Promise((r) => setTimeout(r, 400));
      }}
      className="grid gap-4 md:grid-cols-2"
    >
      <TextField control={form.control} name="title" label="Title" placeholder="Linen shirt" />
      <EmailField control={form.control} name="email" label="Email" />
      <UrlField control={form.control} name="url" label="Product URL" placeholder="yourshop.com/products/linen-shirt" />
      <NumberField control={form.control} name="price" label="Price" placeholder="48" />
      <SelectField
        control={form.control}
        name="category"
        label="Category"
        options={[
          { value: 'top', label: 'Top' },
          { value: 'bottom', label: 'Bottom' },
          { value: 'shoes', label: 'Shoes' },
        ]}
      />
      <MultiSelectField
        control={form.control}
        name="tags"
        label="Tags"
        options={[
          { value: 'new', label: 'New' },
          { value: 'sale', label: 'Sale' },
          { value: 'bestseller', label: 'Bestseller' },
        ]}
      />
      <TextareaField control={form.control} name="description" label="Description" className="md:col-span-2" />
      <RadioGroupField
        control={form.control}
        name="size"
        label="Size"
        options={[
          { value: 's', label: 'S' },
          { value: 'm', label: 'M' },
          { value: 'l', label: 'L' },
        ]}
      />
      <SwatchField control={form.control} name="accent" label="Accent" options={BRAND_OPTIONS} />
      <SegmentedField
        control={form.control}
        name="channel"
        label="Contact channel"
        options={[
          { value: 'whatsapp', label: 'WhatsApp' },
          { value: 'instagram', label: 'Instagram' },
          { value: 'email', label: 'Email' },
        ]}
      />
      <TagField control={form.control} name="labels" label="Labels" placeholder="Add a label…" />
      <DateField control={form.control} name="releaseDate" label="Release date" />
      <CheckboxField control={form.control} name="consent" label="I am 18 or older and this is a photo of me" className="md:col-span-2" />
      <SwitchField control={form.control} name="notify" label="Send me looks" description="Unsubscribe anytime." className="md:col-span-2" />
      <LoadingButton type="submit" loading={form.formState.isSubmitting} className="md:col-span-2">
        Save
      </LoadingButton>
    </Form>
  );
}

function DataTableDemo() {
  const [loading, setLoading] = React.useState(false);
  return (
    <div className="space-y-3">
      <Button type="button" variant="outline" size="sm" onClick={() => setLoading((v) => !v)}>
        Toggle loading
      </Button>
      <DataTable
        columns={DEMO_COLUMNS}
        data={DEMO_ROWS}
        getRowId={(r) => r.id}
        loading={loading}
        emptyState={<EmptyState icon={Package} title="No products yet" description="Paste a product URL to get started." />}
        mobileCard={(row) => (
          <div className="rounded-md border border-border p-3">
            <p className="text-sm font-medium text-foreground">{row.title}</p>
            <div className="mt-1 flex items-center justify-between">
              <StatusBadge status={row.status} map={DEMO_STATUS_MAP} />
              <span className="text-xs text-muted-foreground">{row.renders} renders</span>
            </div>
          </div>
        )}
      />
      <DataTable columns={DEMO_COLUMNS} data={[]} getRowId={(r: DemoRow) => r.id} emptyState={<EmptyState icon={Package} title="No rows" />} />
    </div>
  );
}

function UploadDropzoneDemo() {
  const [error, setError] = React.useState<string | null>(null);
  return (
    <div className="grid max-w-xs grid-cols-2 gap-3">
      <UploadDropzone onFiles={() => {}} />
      <UploadDropzone onFiles={() => setError('Upload failed — try again')} error={error} />
    </div>
  );
}

function FilterBarDemo() {
  const [value, setValue] = React.useState<FilterValue>({});
  return (
    <FilterBar
      value={value}
      onChange={setValue}
      filters={[
        { type: 'select', key: 'status', label: 'Status', options: [{ value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }] },
        { type: 'toggle', key: 'eligible', label: 'Eligible only' },
      ]}
    />
  );
}

function ConfirmDialogDemo() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
        Delete twin
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this twin?"
        description="This removes the photo and every render made from it."
        confirmLabel="Delete"
        tone="destructive"
        onConfirm={async () => new Promise((r) => setTimeout(r, 400))}
      />
    </>
  );
}

function StepWizardDemo() {
  return (
    <Suspense fallback={null}>
      <StepWizard
        steps={[
          { id: 'product', title: 'Product', render: (api) => (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Step 1 of 3 — paste a product link.</p>
              <Button type="button" onClick={api.next}>Continue</Button>
            </div>
          ) },
          { id: 'brand', title: 'Brand', optional: true, render: (api) => (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Step 2 of 3 — pick an accent.</p>
              <SwatchPicker options={BRAND_OPTIONS} value="1" onChange={() => {}} />
              <Button type="button" onClick={api.next}>Continue</Button>
            </div>
          ) },
          { id: 'done', title: 'Done', render: () => <p className="text-sm text-muted-foreground">Step 3 of 3 — your link is ready.</p> },
        ]}
      />
    </Suspense>
  );
}

function ShareSheetDemo() {
  return <ShareSheet title="See it on you" url="https://example.com/r/abc123" onShare={() => {}} />;
}

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '#', icon: ShoppingBag, active: true },
  { label: 'Products', href: '#', icon: Package },
];

/** Section 12 (M1.5): every component in its default, loading, empty, error,
 * and mobile states — gated behind a production `notFound()` by the server
 * page at `app/dev/components/page.tsx`, which is what actually keeps this
 * out of a production build (a `'use client'` module can't gate itself). */
export function DevComponentsGallery() {
  return (
    <AppShell nav={NAV} footer={<LanguagePicker />}>
      <Container size="lg" className="space-y-12 pb-24">
        <PageHeader title="Component gallery" description="Every reusable component, in its default, loading, empty, error, and mobile states (section 12, M1.5)." />

        <Section title="Layout" description="AppShell, PageHeader, Container, Section, SplitPane, ResponsiveDialog">
          <SplitPane
            ratio="1:1"
            start={<div className="rounded-md border border-border p-4 text-sm text-muted-foreground">Start pane</div>}
            end={<div className="rounded-md border border-border p-4 text-sm text-muted-foreground">End pane</div>}
          />
          <ResponsiveDialogDemo />
        </Section>

        <Section title="Data display">
          <KpiRow
            stats={[
              { label: 'Links', value: 12 },
              { label: 'Renders', value: 384, delta: 12 },
              { label: 'Shares', value: 51, delta: -4 },
              { label: 'Leads', value: 19, loading: true },
            ]}
          />
          <div className="grid gap-6 md:grid-cols-2">
            <DataTableDemo />
            <div className="space-y-4">
              <Timeline
                items={[
                  { at: '2m ago', title: 'Render succeeded', tone: 'success' },
                  { at: '5m ago', title: 'Render queued', tone: 'neutral' },
                  { at: '1h ago', title: 'Render failed', description: 'Provider timeout', tone: 'destructive' },
                ]}
              />
              <div className="flex items-center gap-3">
                <StatusBadge status="succeeded" map={DEMO_STATUS_MAP} />
                <Dot tone="warning" />
                <Kbd>⌘K</Kbd>
                <CountUp value={1284} />
              </div>
            </div>
          </div>
          <MediaGrid
            items={[
              { src: 'https://picsum.photos/seed/1/400/533', alt: 'Product 1' },
              { src: 'https://picsum.photos/seed/2/400/533', alt: 'Product 2', loading: true },
              { src: 'https://picsum.photos/seed/3/400/533', alt: 'Product 3' },
            ]}
          />
          <div className="grid gap-6 md:grid-cols-3">
            <ImageReveal from="https://picsum.photos/seed/4/400/533" to={null} alt="Loading render" />
            <ImageCompare before="https://picsum.photos/seed/5/400/533" after="https://picsum.photos/seed/6/400/533" alt="Before and after" />
            <PhoneFrame>
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Preview</div>
            </PhoneFrame>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <AvatarStack items={[{ alt: 'AB' }, { alt: 'CD' }, { alt: 'EF' }, { alt: 'GH' }]} max={3} />
            <QrCode value="https://example.com/t/abc123" size={96} />
            <CopyField value="https://example.com/t/abc123" label="Link" />
          </div>
          <div className="space-y-2">
            <EmptyState icon={Package} title="No leads yet" description="Leads appear once shoppers save their looks." />
            <InlineAlert tone="destructive" title="Something went wrong">That link could not be created.</InlineAlert>
            <InlineAlert tone="success">Saved.</InlineAlert>
          </div>
        </Section>

        <Section title="Inputs and flows">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <SearchInputDemo />
              <FilterBarDemo />
              <SegmentedControlDemo />
              <SwatchPicker options={BRAND_OPTIONS} value="2" onChange={() => {}} />
              <VariantPicker
                options={[
                  { name: 'Size', values: [{ id: 's', label: 'S', available: true }, { id: 'm', label: 'M', available: true }, { id: 'l', label: 'L', available: false }] },
                ]}
                value={{ Size: 's' }}
                onChange={() => {}}
              />
              <TagInputDemo />
              <StepperDemo />
              <Pagination pageIndex={2} pageCount={8} onPageChange={() => {}} />
              <ProgressSteps
                steps={[
                  { label: 'Detect', state: 'done' },
                  { label: 'Fetch', state: 'active' },
                  { label: 'Images', state: 'pending' },
                  { label: 'Link', state: 'pending' },
                ]}
              />
            </div>
            <div className="space-y-4">
              <UploadDropzoneDemo />
              <div className="flex flex-wrap gap-3">
                <ConfirmDialogDemo />
                <ShareSheetDemo />
                <LoadingButton loading>Loading</LoadingButton>
              </div>
              <PollOptions
                options={[
                  { id: 'a', image: 'https://picsum.photos/seed/7/300/400', label: 'Look A', votes: 6 },
                  { id: 'b', image: 'https://picsum.photos/seed/8/300/400', label: 'Look B', votes: 4 },
                ]}
                results
                onVote={() => {}}
              />
              <CreditMeter balance={840} reserved={60} cap={1000} />
              <PricingCard name="Founder" price="$199" features={['1,000 credits, never expire', 'No watermark']} cta={{ label: 'Buy' }} highlight />
            </div>
          </div>
          <StepWizardDemo />
        </Section>

        <Section title="Forms">
          <FormDemo />
        </Section>

        <Section title="Motion" description="Collapses to instant under prefers-reduced-motion.">
          <FadeIn>
            <p className="text-sm text-muted-foreground">Fades and settles in.</p>
          </FadeIn>
          <Stagger>
            {[1, 2, 3].map((n) => (
              <StaggerItem key={n} index={n}>
                <div className="rounded-md border border-border p-2 text-sm">Item {n}</div>
              </StaggerItem>
            ))}
          </Stagger>
          <SlideSwitchDemo />
          <Pressable className="w-fit rounded-md border border-border p-3 text-sm">Press me</Pressable>
        </Section>

        <Section title="Translation" description="Section 10.7 — cookie-driven Google Translate widget.">
          <LanguagePicker />
        </Section>
      </Container>
    </AppShell>
  );
}

function ResponsiveDialogDemo() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Open dialog
      </Button>
      <ResponsiveDialog open={open} onOpenChange={setOpen} title="Example dialog" description="Dialog on desktop, drawer on mobile.">
        <p className="text-sm text-muted-foreground">Content goes here.</p>
      </ResponsiveDialog>
    </>
  );
}

function SearchInputDemo() {
  const [value, setValue] = React.useState('');
  return <SearchInput value={value} onChange={setValue} />;
}

function SegmentedControlDemo() {
  const [value, setValue] = React.useState('single');
  return (
    <SegmentedControl
      value={value}
      onChange={setValue}
      options={[
        { value: 'single', label: 'Single' },
        { value: 'poll', label: 'Poll' },
        { value: 'group', label: 'Group' },
      ]}
    />
  );
}

function TagInputDemo() {
  const [value, setValue] = React.useState<string[]>(['new']);
  return <TagInput value={value} onChange={setValue} placeholder="Add a tag…" />;
}

function StepperDemo() {
  const [value, setValue] = React.useState(1);
  return <Stepper value={value} onChange={setValue} min={0} max={5} />;
}

function SlideSwitchDemo() {
  const [active, setActive] = React.useState('a');
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setActive('a')}>A</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setActive('b')}>B</Button>
      </div>
      <SlideSwitch activeKey={active}>
        <div className="rounded-md border border-border p-3 text-sm">Panel {active.toUpperCase()}</div>
      </SlideSwitch>
    </div>
  );
}
