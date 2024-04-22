const eslint = require('@eslint/js');
const tsEslint = require('typescript-eslint');
const typeScriptEsLint = require('@typescript-eslint/parser');

module.exports = [
  eslint.configs.recommended,
  tsEslint.configs.eslintRecommended,
  ...tsEslint.configs.recommended,
  {
    languageOptions: {
      parser: typeScriptEsLint,
      parserOptions: {
        ecmaVersion: 6,
        sourceType: "module",
        project: "./tsconfig.eslint.json",
        createDefaultProgram: true,
        tsconfigRootDir: __dirname,
      },
      globals: {
        node: true,
      }
    }
  },
  {
    files: ['*.ts'],
    rules: {
      "no-console": "off",
      "@typescript-eslint/indent": ["error", 2],
      "semi": ["error", "never"],
      "import/export": "off" // this errors on multiple exports (overload interfaces)
    }
  },
  {
    "files": ["types/*.d.ts", "types/*.test-d.ts", "test/**/*.d.ts", "test/**/*.test-d.ts"],
    "rules": {
      "@typescript-eslint/no-explicit-any": "off"
    }
  },
  {
    "files": ["types/*.test-d.ts", "test/**/*.test-d.ts"],
    "rules": {
      "no-unused-vars": "off",
      "n/handle-callback-err": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-misused-promises": ["error", {
        "checksVoidReturn": false
      }]
    },
  }
]
