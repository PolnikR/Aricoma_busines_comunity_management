import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import operationName from './operationName.mjs'

for (const [route, verb, expected] of [
  ['/get_providers', 'get', 'getProviders'],
  ['/delete_recovery_app', 'delete', 'deleteRecoveryApp'],
  ['/rollback_group_from_orchestrator', 'post', 'rollbackGroupFromOrchestrator'],
  ['/vms', 'get', 'getVms'],
  ['/vms/search', 'post', 'postVmsSearch'],
  ['/discovery/cache/config', 'put', 'putDiscoveryCacheConfig'],
  ['/health', 'get', 'getHealth'],
]) {
  test(`${verb} ${route} -> ${expected}`, () => {
    assert.equal(operationName({}, route, verb), expected)
  })
}

test('every operation in the spec gets a unique name', () => {
  const spec = JSON.parse(readFileSync(new URL('../../openapi/abco-api.json', import.meta.url), 'utf8'))
  const names = Object.entries(spec.paths).flatMap(([route, item]) => Object.keys(item).map(verb => operationName({}, route, verb)))
  assert.equal(new Set(names).size, names.length)
})
