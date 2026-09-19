import * as React from 'react';
import QRCode from 'qrcode';

export interface QrCodeProps {
  value: string;
  size?: number;
  className?: string;
}

// fill="currentColor" on a text-foreground root overrides the library's
// default black modules so it themes with the page.
export function QrCode({ value, size = 160, className }: QrCodeProps) {
  const { modules, moduleCount } = React.useMemo(() => {
    const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
    return { modules: qr.modules.data, moduleCount: qr.modules.size };
  }, [value]);

  return (
    <svg
      viewBox={`0 0 ${moduleCount} ${moduleCount}`}
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="QR code"
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
