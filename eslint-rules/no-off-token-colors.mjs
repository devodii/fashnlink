// Custom ESLint rule (section 10.2): every color must come from the design tokens
// in app/globals.css. Flags Tailwind arbitrary hex/rgb/hsl colors, gradient
// utilities, and Tailwind's built-in palette color classes wherever they appear
// in a string — className attributes, template literals (cva/cn calls), etc.

const ARBITRARY_COLOR = /\b(?:bg|text|border|ring|from|via|to|fill|stroke|outline|decoration|caret|accent|shadow)-\[(#|rgb|hsl)/;

const PALETTE_COLORS = [
  'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow',
  'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet',
  'purple', 'fuchsia', 'pink', 'rose',
];

// Gradient stop utilities (from-red-500, via-[#fff], to-transparent) and
// bg-gradient-to-*, distinguished from unrelated utilities that happen to
// contain "from"/"via"/"to" as a word, e.g. slide-in-from-top / slide-out-to-left.
const GRADIENT_COLOR_NAME = [...PALETTE_COLORS, 'white', 'black', 'transparent', 'current'].join('|');
const GRADIENT = new RegExp(
  `\\bbg-gradient-to-|\\b(?:from|via|to)-(?:\\[|(?:${GRADIENT_COLOR_NAME})\\b)`
);

const PALETTE_UTILITY = new RegExp(
  `\\b(?:bg|text|border|ring|from|via|to|fill|stroke|outline|decoration|caret|accent)-(?:${PALETTE_COLORS.join('|')})-\\d{2,3}\\b`
);

function findViolation(value) {
  if (typeof value !== 'string') return null;
  if (ARBITRARY_COLOR.test(value)) return 'arbitrary hex/rgb/hsl color utility';
  if (GRADIENT.test(value)) return 'gradient utility';
  if (PALETTE_UTILITY.test(value)) return 'Tailwind palette color class (use a design token)';
  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow off-token colors: no hex/rgb/hsl, no gradients, no Tailwind palette classes',
    },
    schema: [],
    messages: {
      offToken: 'Off-token color found ({{reason}}): "{{value}}". Use a design token utility from app/globals.css instead (section 10.1/10.2).',
    },
  },
  create(context) {
    function check(node, value) {
      const reason = findViolation(value);
      if (reason) {
        context.report({ node, messageId: 'offToken', data: { reason, value } });
      }
    }
    return {
      Literal(node) {
        if (typeof node.value === 'string') check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value.raw);
      },
      JSXText(node) {
        check(node, node.value);
      },
    };
  },
};

const plugin = {
  meta: { name: 'local-design-tokens' },
  rules: {
    'no-off-token-colors': rule,
  },
};

export default plugin;
