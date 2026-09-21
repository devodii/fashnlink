'use client';

import * as React from 'react';
import { CopyIcon, DownloadIcon, ChatCircleIcon, ShareIcon } from '@phosphor-icons/react/ssr';
import { useCopy } from '@/hooks/use-copy';
import { ResponsiveDialog } from '@/components/responsive-dialog';
import { Button } from '@/components/ui/button';

export type ShareChannel = 'copy' | 'download' | 'whatsapp' | 'instagram' | 'x';

export interface ShareSheetProps {
  title: string;
  url: string;
  file?: Blob;
  channels?: ShareChannel[];
  onShare: (channel: ShareChannel) => void;
  trigger?: React.ReactNode;
}

const CHANNEL_LABEL: Record<ShareChannel, string> = {
  copy: 'Copy link',
  download: 'Download image',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  x: 'X',
};

export function ShareSheet({
  title,
  url,
  file,
  channels = ['copy', 'download', 'whatsapp', 'instagram', 'x'],
  onShare,
  trigger,
}: ShareSheetProps) {
  const [open, setOpen] = React.useState(false);
  const { copy } = useCopy();

  async function handleOpen() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      const shareFiles = file ? [new File([file], 'share.png', { type: file.type })] : undefined;
      const canShareFiles =
        !shareFiles || !navigator.canShare || navigator.canShare({ files: shareFiles });
      if (canShareFiles) {
        try {
          await navigator.share({ title, url, files: shareFiles });
          onShare('copy');
          return;
        } catch {
          // user cancelled or share failed; fall through to the channel grid
        }
      }
    }
    setOpen(true);
  }

  function handleChannel(channel: ShareChannel) {
    if (channel === 'copy') copy(url);
    if (channel === 'download' && file) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(file);
      a.download = 'share.png';
      a.click();
      URL.revokeObjectURL(a.href);
    }
    if (channel === 'whatsapp')
      window.open(`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`, '_blank');
    if (channel === 'x')
      window.open(
        `https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
        '_blank',
      );
    if (channel === 'instagram') copy(url);
    onShare(channel);
    setOpen(false);
  }

  return (
    <>
      <span onClick={handleOpen}>
        {trigger ?? (
          <Button type="button">
            <ShareIcon className="size-4" /> Share
          </Button>
        )}
      </span>
      <ResponsiveDialog open={open} onOpenChange={setOpen} title="Share">
        <div className="grid grid-cols-2 gap-2">
          {channels.map((channel) => (
            <Button
              key={channel}
              variant="outline"
              onClick={() => handleChannel(channel)}
              className="justify-start"
            >
              {channel === 'copy' && <CopyIcon className="size-4" />}
              {channel === 'download' && <DownloadIcon className="size-4" />}
              {(channel === 'whatsapp' || channel === 'instagram') && (
                <ChatCircleIcon className="size-4" />
              )}
              {channel === 'x' && <ShareIcon className="size-4" />}
              {CHANNEL_LABEL[channel]}
            </Button>
          ))}
        </div>
      </ResponsiveDialog>
    </>
  );
}
