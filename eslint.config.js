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
  // ADR 0002: the API layer is generated. Features call the generated hooks and
  // schemas; a backend gap is patched in scripts/orval/specPatches.
  {
    files: ['src/features/**/*.{ts,tsx}'],
    ignores: [
      '**/*.test.{ts,tsx}',
      '**/test/**',
      // Composite hooks: they combine or post-process generated query options
      // (getXQueryOptions, generated fetchers and keys) and cannot be one call
      // of a generated hook.
      'src/features/discovery-inventory/infrastructure/hooks/useInfrastructureInventory.ts',
      'src/features/discovery-inventory/resources/hooks/useResourceInventoryQueries.ts',
      'src/features/discovery-inventory/resources/hooks/useVmStorageVolumes.ts',
      'src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts',
      'src/features/discovery-inventory/resources/hooks/useVmwareTags.ts',
      'src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupRelatedVolumes.ts',
      'src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.ts',
      'src/features/recovery-plans/recovery-runs/hooks/useOrchestratedEntityRuns.ts',
      // Mutation facades: they validate input and reshape the generated
      // response before the page uses it.
      'src/features/recovery-plans/recovery-applications/hooks/useDeleteRecoveryApplication.ts',
      'src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplications.ts',
      // SPEC GAP: the spec leaves the FlashSystem volume tree untyped, so its
      // recursive nodes are parsed locally. Remove once the backend types it.
      'src/features/discovery-inventory/infrastructure/helpers/parseVolumeTreeNodes.ts',
      // Not an API contract: validates node positions read from localStorage.
      'src/features/discovery-inventory/infrastructure/hooks/useTopologyNodePositionOverrides.ts',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: 'zod',
            message: 'Schemas come from @/generated/query/zod (patch the spec in scripts/orval/specPatches). See docs/adr/0002-generated-react-query-api-layer.md.',
          },
          {
            name: '@tanstack/react-query',
            importNames: ['useQuery', 'useQueries', 'useMutation'],
            message: 'Use the generated hooks from @/generated/query. See docs/adr/0002-generated-react-query-api-layer.md.',
          },
        ],
        patterns: [{
          group: ['@/generated/api', '@/generated/api/*'],
          message: 'The legacy generated client was removed; use @/generated/query.',
        }],
      }],
    },
  },
])
