import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import transform, { PATCHES } from './index.mjs'

const rawSpec = () => JSON.parse(readFileSync(new URL('../../../openapi/abco-api.json', import.meta.url), 'utf8'))

test('removes the credentials public key path', () => {
  assert.equal(transform(rawSpec()).paths['/credentials/pubkey'], undefined)
})

test('restores the access-log contract', () => {
  const spec = transform(rawSpec())
  assert.ok(spec.components.schemas.AccessLogsResponse)
  assert.deepEqual(
    spec.paths['/get_access_logs'].get.responses['200'].content['application/json'].schema,
    { $ref: '#/components/schemas/AccessLogsResponse' },
  )
})

test('does not mutate its input', () => {
  const spec = rawSpec()
  const before = JSON.stringify(spec)
  transform(spec)
  assert.equal(JSON.stringify(spec), before)
})

test('fails with the patch name when a patch is obsolete', () => {
  const alreadyFixed = transform(rawSpec())
  const accessLogs = PATCHES.find(patch => patch.name === 'accessLogs')
  assert.throws(() => accessLogs.run(alreadyFixed), /Spec patch accessLogs is obsolete/)
})
