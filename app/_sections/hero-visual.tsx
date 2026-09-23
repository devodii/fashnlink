import { Marquee } from '@/components/motion/marquee';
import { MediaTile } from '@/components/media-tile';
import { HeroDemoLoop } from '@/components/hero-demo-loop';
import { MARQUEE_RENDERS } from '@/lib/demo-assets';

// Only 3 distinct real, artifact-free renders exist in the local dev DB right
// now; they're cycled to fill the tile count rather than padded with
// placeholder images.
const TILES = Array.from({ length: 10 }, (_, i) => MARQUEE_RENDERS[i % MARQUEE_RENDERS.length]);
const COLUMN_A = TILES.filter((_, i) => i % 2 === 0);
const COLUMN_B = TILES.filter((_, i) => i % 2 === 1);

export function HeroVisual() {
  return (
    <div className="relative flex justify-center">
      <div className="absolute inset-0 hidden gap-4 md:grid md:grid-cols-2">
        <Marquee vertical durationSeconds={40}>
          {COLUMN_A.map((tile, i) => (
            <MediaTile
              key={`${tile.id}-${i}`}
              src={tile.src}
              alt={tile.alt}
              aspect="3/4"
              className="w-36 opacity-60 grayscale-0"
              cropWatermark
            />
          ))}
        </Marquee>
        <Marquee vertical reverse durationSeconds={40}>
          {COLUMN_B.map((tile, i) => (
            <MediaTile
              key={`${tile.id}-${i}`}
              src={tile.src}
              alt={tile.alt}
              aspect="3/4"
              className="w-36 opacity-60 grayscale-0"
              cropWatermark
            />
          ))}
        </Marquee>
      </div>

      <div className="absolute inset-x-0 top-0 md:hidden">
        <Marquee durationSeconds={40}>
          {TILES.map((tile, i) => (
            <MediaTile
              key={`${tile.id}-${i}`}
              src={tile.src}
              alt={tile.alt}
              aspect="3/4"
              className="w-28 opacity-60 grayscale-0"
              cropWatermark
            />
          ))}
        </Marquee>
      </div>

      <div className="relative z-10">
        <HeroDemoLoop />
      </div>
    </div>
  );
}
