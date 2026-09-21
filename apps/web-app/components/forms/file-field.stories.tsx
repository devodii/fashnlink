import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { z } from 'zod';
import { FieldStory } from './story-utils';
import { FileField } from './file-field';

const meta: Meta = {
  title: 'components/forms/FileField',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj;

// The real upload flow talks to UploadThing (no key in Storybook), so this
// only proves the field mounts and wires a control into UploadDropzone.
export const Default: Story = {
  render: () => (
    <FieldStory schema={z.object({ photo: z.unknown() })} defaultValues={{ photo: undefined }}>
      {(control) => <FileField control={control} name="photo" label="Photo" />}
    </FieldStory>
  ),
};
