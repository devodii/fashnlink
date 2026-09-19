import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { expect, within } from 'storybook/test';
import { Button } from './ui/button';
import { ResponsiveDialog } from './responsive-dialog';

function Demo() {
  const [open, setOpen] = React.useState(false);
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button type="button">Open dialog</Button>}
      title="Example dialog"
      description="Dialog on desktop, drawer on mobile."
    >
      <p className="text-sm text-muted-foreground">Content goes here.</p>
    </ResponsiveDialog>
  );
}

const meta: Meta<typeof Demo> = {
  component: Demo,
  title: 'components/ResponsiveDialog',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof Demo>;

export const Default: Story = {};

export const OpensOnClick: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /open dialog/i }));
    // Dialog/Drawer content portals to document.body, not the story root.
    const body = within(canvasElement.ownerDocument.body);
    await expect(await body.findByText(/dialog on desktop, drawer on mobile/i)).toBeVisible();
  },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
