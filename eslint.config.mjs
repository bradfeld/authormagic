import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Global ignores
  {
    ignores: [
      ".next/**",
      "out/**",
      "node_modules/**",
      ".env*",
      "scripts/**" // Node.js scripts, not Next.js code
    ]
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      // General rules for all files
      "no-console": "warn",
      "prefer-const": "error",
      "no-var": "error",
      "no-unused-expressions": "error",
      
      // Production build failure prevention
      "react/jsx-no-undef": "error",
      "react/prop-types": "off", // We use TypeScript for prop validation
      "react-hooks/exhaustive-deps": "warn",
      
      // Import organization
      "import/order": [
        "error",
        {
          "groups": ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",
          "alphabetize": {
            "order": "asc",
            "caseInsensitive": true
          }
        }
      ]
    }
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // TypeScript-specific rules
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-explicit-any": "warn",
    }
  }
];

export default eslintConfig;
