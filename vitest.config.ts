import path from 'node:path'
import { defineConfig } from 'vitest/config'

const domTypescriptTests = [
  'src/shared/hooks/useResizablePanel.test.ts',
  'src/shared/hooks/useUnsavedChangesGuard.test.ts',
  'src/shared/components/data-table/useTableState.test.ts',
  'src/features/discovery-inventory/infrastructure/hooks/useTooltipHover.test.ts',
  'src/features/discovery-inventory/infrastructure/hooks/useTopologyNodePositionOverrides.test.ts',
]

const aliases = {
  '@': path.resolve(__dirname, './src'),
  'elkjs-runtime': path.resolve(__dirname, './node_modules/elkjs/lib/elk.bundled.js'),
}

export default defineConfig({
  resolve: {
    alias: aliases,
  },
  test: {
    maxWorkers: 2,
    passWithNoTests: true,
    projects: [
      {
        resolve: { alias: aliases },
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx', ...domTypescriptTests],
          isolate: true,
          maxWorkers: 2,
          setupFiles: ['./src/test-utils/setup.ts'],
        },
      },
      {
        resolve: { alias: aliases },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: domTypescriptTests,
          isolate: false,
          maxWorkers: 2,
        },
      },
    ],
  },
})
