/**
 * react-hook-form must always be imported as `import * as RHF from
 * 'react-hook-form'`, never a named import. ESLint core's own
 * `no-restricted-imports` can't express this: it can't statically prove
 * which named exports are accessed through a namespace import, so it would
 * end up flagging the namespace import itself too. This purpose-built rule
 * only disallows named/default specifiers instead.
 */

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
        "Import react-hook-form as `import * as RHF from 'react-hook-form'`, not as a named import.",
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
