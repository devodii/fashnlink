import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { z } from 'zod';
import { expect, within } from 'storybook/test';
import { FieldStory } from './story-utils';
import { PhoneField } from './phone-field';

const meta: Meta = {
  title: 'components/forms/PhoneField',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <FieldStory schema={z.object({ contact: z.string() })} defaultValues={{ contact: '' }}>
      {(control) => <PhoneField control={control} name="contact" label="Contact detail" />}
    </FieldStory>
  ),
};

export const Prefilled: Story = {
  render: () => (
    <FieldStory
      schema={z.object({ contact: z.string() })}
      defaultValues={{ contact: '+1 415 555 0132' }}
    >
      {(control) => <PhoneField control={control} name="contact" label="Contact detail" />}
    </FieldStory>
  ),
};

export const TypesIntoField: Story = {
  render: () => (
    <FieldStory schema={z.object({ contact: z.string() })} defaultValues={{ contact: '' }}>
      {(control) => <PhoneField control={control} name="contact" label="Contact detail" />}
    </FieldStory>
  ),
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByPlaceholderText('Phone number');
    await userEvent.type(input, '4155550132');
    await expect(input).toHaveValue('(415) 555-0132');
  },
};

export const SwitchesCountry: Story = {
  render: () => (
    <FieldStory schema={z.object({ contact: z.string() })} defaultValues={{ contact: '' }}>
      {(control) => <PhoneField control={control} name="contact" label="Contact detail" />}
    </FieldStory>
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole('combobox'));
    // Popover content portals to document.body, not the story root.
    const body = within(canvasElement.ownerDocument.body);
    const listbox = await body.findByPlaceholderText('Search country...');
    await userEvent.type(listbox, 'United Kingdom');
    await userEvent.click(await body.findByText('United Kingdom'));
    await expect(canvas.getByText('+44')).toBeInTheDocument();
  },
};
