// Section 10.5: react-hook-form is always imported as `import * as RHF from
// 'react-hook-form'`, never a named import. Built on top of ESLint core's
// `no-restricted-imports` this also flags the namespace import itself (it
// can't statically prove which named exports are accessed through it), which
// would ban the exact pattern the spec requires — so this is a small purpose
// -built rule instead: only named/default specifiers are disallowed.

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'require react-hook-form to be imported as `import * as RHF from "react-hook-form"`',
    },
    schema: [],
    messages: {
      namedImport:
        "Import react-hook-form as `import * as RHF from 'react-hook-form'` (section 10.5), not as a named import.",
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        if (node.source.value !== 'react-hook-form') return;
        for (const specifier of node.specifiers) {
          if (specifier.type === 'ImportSpecifier' || specifier.type === 'ImportDefaultSpecifier') {
            context.report({ node: specifier, messageId: 'namedImport' });
          }
        }
      },
    };
  },
};

const plugin = {
  meta: { name: 'local-rhf-imports' },
  rules: {
    'no-named-rhf-imports': rule,
  },
};

export default plugin;
