import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/', 'data/', 'datasets/'] },
  js.configs.recommended,
  tseslint.configs.strict,
  {
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['packages/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    extends: [reactHooks.configs.flat.recommended],
  },
  // 書式は Prettier に任せる
  prettier,
);
