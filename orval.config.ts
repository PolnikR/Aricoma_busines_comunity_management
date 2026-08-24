import { defineConfig } from 'orval'

const input = {
  target: './openapi/abco-api.json',
  override: {
    transformer: './scripts/orval/omitPubkey.mjs',
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
})
