'use client';

import * as React from 'react';
import {
  CopyIcon,
  DownloadIcon,
  WhatsappLogoIcon,
  InstagramLogoIcon,
  XLogoIcon,
  ShareIcon,
} from '@phosphor-icons/react/ssr';
import { cn } from 'cn';
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

const CHANNEL_ICON: Record<ShareChannel, React.ComponentType<{ className?: string }>> = {
  copy: CopyIcon,
  download: DownloadIcon,
  whatsapp: WhatsappLogoIcon,
  instagram: InstagramLogoIcon,
  x: XLogoIcon,
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
        <div className="grid grid-cols-3 gap-3">
          {channels.map((channel) => {
            const Icon = CHANNEL_ICON[channel];
            return (
              <button
                key={channel}
                type="button"
                onClick={() => handleChannel(channel)}
                className={cn(
                  'group flex flex-col items-center gap-2 rounded-lg border border-transparent p-3',
                  'transition-colors hover:border-border hover:bg-accent',
                )}
              >
                <span
                  className={cn(
                    'flex size-12 items-center justify-center rounded-full bg-muted text-foreground',
                    'transition-transform group-hover:scale-105 group-active:scale-95',
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span className="text-xs font-medium text-foreground">
                  {CHANNEL_LABEL[channel]}
                </span>
              </button>
            );
          })}
        </div>
      </ResponsiveDialog>
    </>
  );
}
