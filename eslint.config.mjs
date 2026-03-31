import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'jest.config.js'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  prettierConfig,
  {
    files: ['src/__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  }
)
