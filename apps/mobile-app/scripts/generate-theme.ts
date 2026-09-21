/**
 * Converts every `--token: oklch(...)` custom property in
 * apps/web-app/app/globals.css into hex, since React Native's style engine
 * (and by extension NativeWind's runtime) cannot parse oklch() at all.
 *
 * Regenerates two files from that single source so the web tokens and the
 * mobile theme never drift by hand-editing twice:
 *   - src/global.css   (NativeWind reads this, same `:root` / `.dark` shape
 *                        the web app uses, just with hex instead of oklch)
 *   - src/lib/theme.ts (a plain constant object for native call sites that
 *                        need a real color value rather than a className,
 *                        e.g. the Expo Router navigation theme, StatusBar)
 *
 * Run with `pnpm --filter mobile-app generate-theme` after `app/globals.css`
 * changes on the web side.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WEB_GLOBALS_CSS = path.resolve(__dirname, '../../web-app/app/globals.css');
const OUT_CSS = path.resolve(__dirname, '../src/global.css');
const OUT_THEME_TS = path.resolve(__dirname, '../src/lib/theme.ts');

const BEGIN_MARKER = '/* BEGIN GENERATED TOKENS (scripts/generate-theme.ts) */';
const END_MARKER = '/* END GENERATED TOKENS */';

type TokenMap = Record<string, string>;

/**
 * OKLCH -> sRGB hex, following the CSS Color 4 reference algorithm
 * (Björn Ottosson's OKLab, via linear sRGB). No external color library:
 * this is a small, closed-form conversion and a script dependency here
 * would be one more thing to keep in sync across two package.jsons.
 */
function oklchToHex(l: number, c: number, hDeg: number): string {
  const hRad = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ ** 3;
  const m3 = m_ ** 3;
  const s3 = s_ ** 3;

  const linearR = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const linearG = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const linearB = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  const toSrgb = (channel: number): number => {
    const clamped = Math.min(1, Math.max(0, channel));
    const encoded = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, encoded)) * 255);
  };

  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(toSrgb(linearR))}${toHex(toSrgb(linearG))}${toHex(toSrgb(linearB))}`.toUpperCase();
}

function extractBlock(css: string, selector: string): string {
  const pattern = new RegExp(`${selector}\\s*\\{([^}]*)\\}`, 'm');
  const match = css.match(pattern);
  if (!match) throw new Error(`Could not find ${selector} block in ${WEB_GLOBALS_CSS}`);
  return match[1];
}

function parseOklchTokens(block: string): TokenMap {
  const tokens: TokenMap = {};
  const tokenPattern = /--([\w-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = tokenPattern.exec(block))) {
    const [, name, l, c, h] = match;
    tokens[name] = oklchToHex(Number(l), Number(c), Number(h));
  }
  return tokens;
}

function parseRadius(block: string): string {
  const match = block.match(/--radius:\s*([^;]+);/);
  return match ? match[1].trim() : '0.5rem';
}

function toCssBlock(selector: string, tokens: TokenMap, radius?: string): string {
  const lines = Object.entries(tokens).map(([name, hex]) => `  --${name}: ${hex};`);
  if (radius) lines.push(`  --radius: ${radius};`);
  return `${selector} {\n${lines.join('\n')}\n}`;
}

function toThemeObjectLiteral(tokens: TokenMap): string {
  // Quoted keys (not camelCased identifiers): a handful of tokens end in a
  // digit (chart-1, chart-2, ...), which isn't a valid bare identifier
  // segment after camelCasing, and quoting sidesteps that entirely.
  return Object.entries(tokens)
    .map(([name, hex]) => `    '${name}': '${hex}',`)
    .join('\n');
}

function main() {
  const webCss = readFileSync(WEB_GLOBALS_CSS, 'utf8');

  const lightBlock = extractBlock(webCss, ':root');
  const darkBlock = extractBlock(webCss, '\\.dark');

  const lightTokens = parseOklchTokens(lightBlock);
  const darkTokens = parseOklchTokens(darkBlock);
  const radius = parseRadius(lightBlock);

  const existingCss = readFileSync(OUT_CSS, 'utf8');
  const beginIdx = existingCss.indexOf(BEGIN_MARKER);
  const endIdx = existingCss.indexOf(END_MARKER);
  const preamble =
    beginIdx === -1 ? existingCss.trimEnd() + '\n\n' : existingCss.slice(0, beginIdx);
  const generatedCss = [
    BEGIN_MARKER,
    '/* Generated from apps/web-app/app/globals.css — do not hand-edit. */',
    toCssBlock(':root', lightTokens, radius),
    '',
    toCssBlock('.dark', darkTokens),
    END_MARKER,
    '',
  ].join('\n');

  writeFileSync(OUT_CSS, preamble + generatedCss);

  const themeTs = `/**
 * Generated by scripts/generate-theme.ts from apps/web-app/app/globals.css.
 * Do not hand-edit — run \`pnpm --filter mobile-app generate-theme\` instead.
 */

export const THEME = {
  light: {
${toThemeObjectLiteral(lightTokens)}
    radius: '${radius}',
  },
  dark: {
${toThemeObjectLiteral(darkTokens)}
    radius: '${radius}',
  },
} as const;

export type ThemeMode = keyof typeof THEME;
export type ThemeColors = (typeof THEME)[ThemeMode];
`;

  writeFileSync(OUT_THEME_TS, themeTs);

  console.log(
    `generated ${Object.keys(lightTokens).length} light + ${Object.keys(darkTokens).length} dark tokens -> src/global.css, src/lib/theme.ts`,
  );
}

main();
