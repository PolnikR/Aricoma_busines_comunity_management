import { defineConfig } from 'orval'
import operationName from './scripts/orval/operationName.mjs'

const input = {
  target: './openapi/abco-api.json',
  override: {
    transformer: './scripts/orval/specPatches/index.mjs',
  },
} as const

const mutator = {
  path: 'src/shared/api/orvalMutator.ts',
  name: 'orvalMutator',
} as const

export default defineConfig({
  abcoFetch: {
    input,
    output: {
      target: './src/generated/api/client.gen.ts',
      schemas: './src/generated/api/models',
      mode: 'single',
      client: 'fetch',
      httpClient: 'fetch',
      indexFiles: true,
      fileExtension: '.gen.ts',
      override: {
        mutator,
        fetch: {
          includeHttpResponseReturnType: false,
        },
      },
    },
  },
  abcoZod: {
    input,
    output: {
      target: './src/generated/api/zod.gen.ts',
      mode: 'single',
      client: 'zod',
      indexFiles: true,
      fileExtension: '.gen.ts',
      override: {
        zod: {
          version: 4,
          variant: 'classic',
          generateReusableSchemas: true,
          exactOptional: true,
        },
      },
    },
  },
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
          ],
        },
        zod: { version: 4, variant: 'classic', exactOptional: true },
      },
    },
  },
})
