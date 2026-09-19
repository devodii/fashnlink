import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { UploadDropzone } from './upload-dropzone';

const meta: Meta<typeof UploadDropzone> = {
  component: UploadDropzone,
  title: 'components/UploadDropzone',
  tags: ['ai-generated'],
  args: { onFiles: () => {} },
};
export default meta;

type Story = StoryObj<typeof UploadDropzone>;

// The real upload flow talks to UploadThing (no key in Storybook), so these
// stories only exercise the component's own visual states via overridable
// preview/progress/error props, not a live upload.
export const Default: Story = {};
export const WithPreview: Story = {
  args: { preview: 'https://picsum.photos/seed/selfie/300/300' },
};
export const Uploading: Story = { args: { progress: 45 } };
export const Error: Story = { args: { error: 'Upload failed — try again' } };
