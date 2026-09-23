'use client';

import * as React from 'react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { cn } from 'cn';

export interface QrCodeProps {
  value: string;
  size?: number;
  className?: string;
  /** Click copies a rendered PNG of the code to the clipboard. */
  copyable?: boolean;
}

// Rasterized at a fixed resolution for the copied image regardless of the
// on-screen `size`, so a QR code displayed small still copies crisp.
const COPY_RESOLUTION = 512;

// fill="currentColor" on a text-foreground root overrides the library's
// default black modules so it themes with the page.
export function QrCode({ value, size = 160, className, copyable }: QrCodeProps) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const { modules, moduleCount } = React.useMemo(() => {
    const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
    return { modules: qr.modules.data, moduleCount: qr.modules.size };
  }, [value]);

  async function handleCopy() {
    const svg = svgRef.current;
    if (!svg) return;

    try {
      const svgText = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = svgUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = COPY_RESOLUTION;
      canvas.height = COPY_RESOLUTION;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas unsupported');
      ctx.fillStyle = getComputedStyle(svg).getPropertyValue('background-color') || '#ffffff';
      ctx.fillRect(0, 0, COPY_RESOLUTION, COPY_RESOLUTION);
      ctx.drawImage(image, 0, 0, COPY_RESOLUTION, COPY_RESOLUTION);
      URL.revokeObjectURL(svgUrl);

      const pngBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png'),
      );
      if (!pngBlob) throw new Error('failed to rasterize');

      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
      toast.success('QR code copied');
    } catch {
      toast.error("Couldn't copy the QR code");
    }
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${moduleCount} ${moduleCount}`}
      width={size}
      height={size}
      className={cn(copyable && 'cursor-pointer', className)}
      role="img"
      aria-label="QR code"
      onClick={copyable ? handleCopy : undefined}
    >
      <rect width={moduleCount} height={moduleCount} className="fill-background" />
      <g className="fill-foreground">
        {Array.from(modules).map((dark, i) =>
          dark ? (
            <rect
              key={i}
              x={i % moduleCount}
              y={Math.floor(i / moduleCount)}
              width={1}
              height={1}
            />
          ) : null,
        )}
      </g>
    </svg>
  );
}
