import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { within } from 'storybook/test';
import { Button } from './ui/button';
import { ConfirmDialog } from './confirm-dialog';

function Demo() {
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

const meta: Meta<typeof Demo> = {
  component: Demo,
  title: 'components/ConfirmDialog',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof Demo>;

export const Closed: Story = {};

export const Open: Story = {
  play: async ({ canvas, userEvent, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: /delete twin/i }));
    await within(canvasElement.ownerDocument.body).findByText(/delete this twin/i);
  },
};
