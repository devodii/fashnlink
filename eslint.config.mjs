import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import designTokens from "./eslint-rules/no-off-token-colors.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    plugins: {
      "local-design-tokens": designTokens,
    },
    rules: {
      // section 10.2: every color comes from app/globals.css design tokens.
      "local-design-tokens/no-off-token-colors": "error",
      // section 10.5: react-hook-form is always used via `import * as RHF`,
      // fields are Controller-based, never register().
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react-hook-form",
              importNames: [
                "useForm",
                "Controller",
                "useController",
                "useFormContext",
                "FormProvider",
                "useFieldArray",
                "useWatch",
              ],
              message: "Import react-hook-form as `import * as RHF from 'react-hook-form'` (section 10.5), not as named imports.",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
