import js from '@eslint/js'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import { importX } from 'eslint-plugin-import-x'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'tasks', '.worktrees', 'src/generated', 'orval.config.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'import-x': importX,
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          project: 'tsconfig.app.json',
          extensions: [
            '.ts',
            '.tsx',
            '.d.ts',
            '.js',
            '.jsx',
            '.json',
            '.node',
            '.css',
            '.svg',
            '.png',
          ],
        }),
      ],
    },
    rules: {
      'import-x/no-unresolved': 'error',
    },
  },
  // ADR 0001: the Orval-generated schemas are the single source of the API
  // contract. Feature API modules must not hand-write contract object schemas.
  {
    files: ['src/features/**/api/**/*.ts'],
    ignores: [
      '**/*.test.ts',
      // SPEC GAP files: extend a generated schema only for fields the spec leaves
      // untyped. Remove an entry once the backend types the field.
      'src/features/discovery-inventory/infrastructure/api/schemas/flashSystemVolumeTreeSchema.ts',
      'src/features/discovery-inventory/resources/api/schemas/flashSystemInventorySchema.ts',
      'src/features/discovery-inventory/resources/api/schemas/powerInventorySchema.ts',
      'src/features/discovery-inventory/resources/api/schemas/vmStorageVolumesSchema.ts',
      'src/features/recovery-plans/recovery-applications/api/schemas/recoveryApplicationsSchema.ts',
      'src/features/recovery-plans/recovery-groups/api/schemas/recoveryGroupsSchema.ts',
      // Domain validation of the builder draft, not a copy of the API contract.
      'src/features/recovery-plans/recovery-groups/api/recoveryGroupsValidation.ts',
    ],
    rules: {
      'no-restricted-syntax': ['error', {
        selector: "CallExpression[callee.object.name='z'][callee.property.name=/^(object|looseObject|strictObject)$/]",
        message: 'Use the Orval-generated schema from @/generated/api/zod.gen (extend it for SPEC GAP fields). See docs/adr/0001-orval-single-source-of-api-contract.md.',
      }],
    },
  },
  {
    files: ['src/features/**/model/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: 'zod',
          message: 'Model types derive from generated types; do not declare contract schemas in model files. See docs/adr/0001-orval-single-source-of-api-contract.md.',
        }],
      }],
    },
  },
])
