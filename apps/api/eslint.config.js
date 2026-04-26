import tseslint from 'typescript-eslint'
import unusedImports from 'eslint-plugin-unused-imports'

export default tseslint.config(
  { ignores: ['dist', '.wrangler'] },
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommended],
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      // Flag unused imports and vars; auto-fixable with --fix
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
      ],
    },
  },
)
