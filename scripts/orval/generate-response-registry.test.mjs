import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildRegistrySource } from './generate-response-registry.mjs'

test('maps method and route to the 200 response schema', () => {
  const source = buildRegistrySource({
    paths: {
      '/get_credentials': { get: { responses: { 200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/CredentialsResponse' } } } } } } },
      '/health': { get: { responses: { 200: { content: { 'application/json': { schema: {} } } } } } },
    },
  })
  assert.match(source, /import \{ CredentialsResponse \} from '\.\/zod\/credentialsResponse\.gen'/)
  assert.match(source, /'GET \/get_credentials': CredentialsResponse,/)
  assert.doesNotMatch(source, /\/health/)
})
