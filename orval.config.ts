import { defineConfig } from 'orval'
import operationName from './scripts/orval/operationName.mjs'

const input = {
  target: './openapi/abco-api.json',
  override: {
    transformer: './scripts/orval/specPatches/index.mjs',
  },
} as const

export default defineConfig({
  abcoQuery: {
    input,
    output: {
      target: './src/generated/query/index.gen.ts',
      schemas: { path: './src/generated/query/zod', type: 'zod' },
      mode: 'tags-split',
      client: 'react-query',
      httpClient: 'fetch',
      indexFiles: true,
      fileExtension: '.gen.ts',
      override: {
        mutator: { path: 'src/shared/api/validatingMutator.ts', name: 'validatingMutator' },
        // POST /vms/search is a read (filtered VM search), so it is generated as a query.
        operations: {
          vms_search_vms_search_post: { query: { useQuery: true, useMutation: false } },
        },
        operationName,
        fetch: { includeHttpResponseReturnType: false },
        query: {
          version: 5,
          mutationInvalidates: [
            { onMutations: ['submitCredential', 'deleteCredential'], invalidates: ['getCredentials'] },
            { onMutations: ['submitPolicySet', 'deletePolicySet'], invalidates: ['getPolicySets'] },
            { onMutations: ['submitPolicy', 'deletePolicy'], invalidates: ['getPolicies'] },
            { onMutations: ['submitCleanRoomPolicy', 'deleteCleanRoomPolicy'], invalidates: ['getCleanRoomPolicies'] },
            { onMutations: ['submitRecoveryAppPolicy', 'deleteRecoveryAppPolicy'], invalidates: ['getRecoveryAppPolicies'] },
            { onMutations: ['putDiscoveryCacheConfig'], invalidates: ['getDiscoveryCacheConfig'] },
            { onMutations: ['submitProvider', 'deleteProvider'], invalidates: ['getProviders'] },
            { onMutations: ['submitPlatformProvider', 'deletePlatformProvider'], invalidates: ['getPlatformProviders'] },
            { onMutations: ['submitRecoveryGroup', 'deleteRecoveryGroup', 'rollbackGroupFromOrchestrator'], invalidates: ['getRecoveryGroups'] },
          ],
        },
        zod: { version: 4, variant: 'classic', exactOptional: true },
      },
    },
  },
})
