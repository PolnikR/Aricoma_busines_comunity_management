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

const schemas = () => transform(rawSpec()).components.schemas

test('types power LPAR and VIOS records', () => {
  const s = schemas()
  assert.equal(s.PowerVmRecord.properties.lpar.$ref, '#/components/schemas/PowerPartition')
  assert.deepEqual(s.PowerVmsResponse.properties.counts_by_type.required, ['LogicalPartition', 'VirtualIOServer'])
  assert.equal(s.PowerVmsResponse.properties.provider_id.type, 'string')
})

test('types FlashSystem inventory collections', () => {
  const s = schemas()
  assert.equal(s.VolumesResponse.properties.volumes.items.$ref, '#/components/schemas/FlashSystemVolume')
  assert.equal(s.VolumesResponse.properties.pools.additionalProperties.$ref, '#/components/schemas/FlashSystemPool')
})

test('types vdisks by VM', () => {
  assert.equal(schemas().VdisksByVmResponse.properties.vdisks.additionalProperties.$ref, '#/components/schemas/StorageVolume')
})


test('types rollback report sections', () => {
  const report = schemas().RollbackReport
  assert.equal(report.properties.airflow.anyOf[0].$ref, '#/components/schemas/RollbackAirflowSection')
  assert.equal(report.additionalProperties, true)
})

test('adds recovery VM metadata', () => {
  assert.deepEqual(Object.keys(schemas().RecoveryVM.properties).sort(),
    ['cpu', 'hostname', 'ip_address', 'memory_gb', 'name', 'order', 'os', 'storage_gb'])
})

for (const name of ['powerInventory', 'flashSystemVolumes', 'vdisksByVm', 'rollbackReport', 'recoveryVmMetadata']) {
  test(`${name} fails once already applied`, () => {
    const patch = PATCHES.find(p => p.name === name)
    assert.throws(() => patch.run(transform(rawSpec())), new RegExp(`Spec patch ${name} is obsolete`))
  })
}
