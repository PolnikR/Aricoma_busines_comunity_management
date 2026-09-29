# Orval Full Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-written API layer (API modules, hooks, query keys, view models, local schemas) with Orval-generated React Query hooks, validated centrally, so a backend change means `npm run api:update` plus `npm run typecheck`.

**Architecture:** An input transformer applies every spec fix from `scripts/orval/specPatches/`. Orval generates React Query hooks per tag into `src/generated/query/` with readable operation names, generated query keys and declared invalidation. A validating mutator checks every response against the generated zod schema through a generated registry. Features call generated hooks directly and use backend field names.

**Tech Stack:** Orval 8.33 (`@orval/query`, `@orval/zod`), TanStack Query 5, zod 4, Vitest, `node --test` for scripts, GitLab CI.

**Spec:** `docs/superpowers/specs/2026-09-29-orval-full-integration-design.md`

## Global Constraints

- Orval version: the installed `orval@8.33.0`; no new dependencies.
- Generated code lives only under `src/generated/`; it is never edited by hand.
- Features use field names exactly as in the spec (snake_case where the API is snake_case).
- A `select` function is allowed only if it spreads the generated object (`{ ...item, ... }`) so no field is dropped, or if it derives data that does not exist on the wire (counts, topology, builder draft). `select` functions are module-level.
- Query keys: only generated `getXQueryKey`. Invalidation: only `mutationInvalidates` in `orval.config.ts`.
- Cache policy stays global in `src/app/providers.tsx` (`STANDARD_QUERY_OPTIONS`); no per-feature timings except the existing active-run polling.
- The old outputs (`src/generated/api/client.gen.ts`, `zod.gen.ts`, `models/`) keep generating until Task 14, so unmigrated features compile at every commit.
- Every task ends with focused tests, `npx tsc -p tsconfig.app.json --noEmit`, focused `npx eslint`, `git diff --check`, and one commit ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 45 UI tests fail on Node 26 because Node's global `localStorage` shadows jsdom's (known, unrelated). Compare failures against `git stash` before treating them as regressions.

## Spike findings this plan relies on

Verified by generating the target config into the scratchpad on 2026-09-29:

- Generated names: `useGetCredentials`, `useSubmitCredential`, `useDeleteCredential`, `getGetCredentialsQueryKey`, `useGetProviders(params)`, `usePutDiscoveryCacheConfig`, `usePostVmsSearch`, etc. 49 operations, no collisions.
- Mutation variables: `{ data }` for bodies, `{ params }` for query parameters (e.g. `deleteCredential.mutate({ params: { credential_id } })`).
- `mutationInvalidates` generates `queryClient.invalidateQueries({ queryKey: getGetCredentialsQueryKey() })`, then calls the caller's `onSuccess`. A key without params prefix-matches keys with params.
- **Orval disables generated runtime validation whenever a custom mutator is used** (`runtimeValidation?.enabled && !verbOptions.mutator`). The mutator is required (Keycloak token, `/api` prefix, `OrvalApiError`). Therefore validation runs in a validating mutator backed by a generated registry (Task 4). This replaces the spec's "runtime validation in the generated client" with the same effect at the same boundary.
- Deviation from spec decision 6: mutations do not `setQueryData`; `mutationInvalidates` refetches the list. One extra request per mutation, no hand-written cache writes.

## File structure

```
scripts/orval/
  operationName.mjs                 route -> operation name (Task 3)
  operationName.test.mjs
  specPatches/
    definePatch.mjs                 patch helper with obsolete detection (Task 1)
    index.mjs                       transformer: applies all patches in order (Task 1)
    omitPubkey.mjs                  moved from scripts/orval/omitPubkey.mjs (Task 1)
    accessLogs.mjs                  + data/accessLogs.json (Task 1)
    powerInventory.mjs              (Task 2)
    flashSystemVolumes.mjs          (Task 2)
    vdisksByVm.mjs                  (Task 2)
    volumeTree.mjs                  (Task 2)
    rollbackReport.mjs              (Task 2)
    recoveryVmMetadata.mjs          (Task 2)
    specPatches.test.mjs            (Tasks 1-2)
  generate-response-registry.mjs    (Task 4)
  generate-response-registry.test.mjs
  check-feature-layout.mjs          (Task 15)
src/generated/query/                generated: <tag>/<tag>.gen.ts, zod/*.gen.ts, responseSchemas.gen.ts
src/shared/api/validatingMutator.ts (Task 4)
src/shared/api/validatingMutator.test.ts
```

Per feature, Tasks 5-13 delete `api/*Api.ts` (except non-API helpers), `api/*QueryKeys.ts`, `api/schemas/`, `hooks/use*` that only wrap API calls, and pure-rename types in `model/`.

---

### Task 1: Spec patch framework, pubkey and access logs

**Files:**
- Create: `scripts/orval/specPatches/definePatch.mjs`, `scripts/orval/specPatches/index.mjs`, `scripts/orval/specPatches/omitPubkey.mjs`, `scripts/orval/specPatches/accessLogs.mjs`, `scripts/orval/specPatches/data/accessLogs.json`, `scripts/orval/specPatches/specPatches.test.mjs`
- Delete: `scripts/orval/omitPubkey.mjs`
- Modify: `orval.config.ts` (input transformer path), `openapi/abco-api.json` (strip the hand-restored access-log schemas so the file is the raw backend spec), `package.json` (`api:pull:test` also runs the patch tests)

**Interfaces:**
- Produces: `definePatch({ name, isObsolete(spec) => string | null, apply(spec) => spec })`; default export of `index.mjs` is the Orval transformer `(spec) => spec`; named export `PATCHES` (ordered array).

- [ ] **Step 1: Extract the access-log schemas into data**

```bash
node -e "
const fs=require('fs');
const s=JSON.parse(fs.readFileSync('openapi/abco-api.json','utf8'));
const pick=n=>s.components.schemas[n];
fs.mkdirSync('scripts/orval/specPatches/data',{recursive:true});
fs.writeFileSync('scripts/orval/specPatches/data/accessLogs.json', JSON.stringify({
  schemas:{AccessLogEntry:pick('AccessLogEntry'),RawAccessLogEntry:pick('RawAccessLogEntry'),AccessLogsResponse:pick('AccessLogsResponse')}
},null,2)+'\n');
for (const n of ['AccessLogEntry','RawAccessLogEntry','AccessLogsResponse']) delete s.components.schemas[n];
s.paths['/get_access_logs'].get.responses['200'].content['application/json'].schema={};
fs.writeFileSync('openapi/abco-api.json', JSON.stringify(s,null,2)+'\n');
"
```

- [ ] **Step 2: Write the failing tests**

`scripts/orval/specPatches/specPatches.test.mjs`:

```js
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
```

- [ ] **Step 3: Run to verify it fails**

Run: `node --test scripts/orval/specPatches/specPatches.test.mjs`
Expected: FAIL, `Cannot find module './index.mjs'`.

- [ ] **Step 4: Implement**

`scripts/orval/specPatches/definePatch.mjs`:

```js
// A spec patch fixes one gap in the backend OpenAPI document. isObsolete returns a
// reason once the backend covers the gap itself; the patch then fails so it gets
// deleted instead of silently overriding the backend.
export function definePatch({ name, isObsolete, apply }) {
  return {
    name,
    run(spec) {
      const reason = isObsolete(spec)
      if (reason) throw new Error(`Spec patch ${name} is obsolete: ${reason}`)
      return apply(spec)
    },
  }
}

export function schemaOf(spec, name) {
  const schema = spec.components?.schemas?.[name]
  if (!schema) throw new Error(`Spec patch target missing: components.schemas.${name}`)
  return schema
}
```

`scripts/orval/specPatches/omitPubkey.mjs`:

```js
import { definePatch } from './definePatch.mjs'

const PUBLIC_KEY_PATH = '/credentials/pubkey'

// The PEM public key endpoint is fetched directly by credentialsCrypto.ts.
export default definePatch({
  name: 'omitPubkey',
  isObsolete: spec => (spec.paths?.[PUBLIC_KEY_PATH] ? null : `${PUBLIC_KEY_PATH} is no longer in the spec`),
  apply: (spec) => {
    const paths = { ...spec.paths }
    delete paths[PUBLIC_KEY_PATH]
    return { ...spec, paths }
  },
})
```

`scripts/orval/specPatches/accessLogs.mjs`:

```js
import { readFileSync } from 'node:fs'
import { definePatch } from './definePatch.mjs'

const data = JSON.parse(readFileSync(new URL('./data/accessLogs.json', import.meta.url), 'utf8'))

// The backend spec returns an untyped schema for /get_access_logs.
export default definePatch({
  name: 'accessLogs',
  isObsolete: spec => (spec.components?.schemas?.AccessLogsResponse ? 'backend publishes AccessLogsResponse' : null),
  apply: (spec) => {
    const path = spec.paths['/get_access_logs']
    const get = path.get
    return {
      ...spec,
      components: { ...spec.components, schemas: { ...spec.components.schemas, ...data.schemas } },
      paths: {
        ...spec.paths,
        '/get_access_logs': {
          ...path,
          get: {
            ...get,
            responses: {
              ...get.responses,
              200: {
                ...get.responses['200'],
                content: { 'application/json': { schema: { $ref: '#/components/schemas/AccessLogsResponse' } } },
              },
            },
          },
        },
      },
    }
  },
})
```

`scripts/orval/specPatches/index.mjs`:

```js
import accessLogs from './accessLogs.mjs'
import omitPubkey from './omitPubkey.mjs'

export const PATCHES = [omitPubkey, accessLogs]

export default function applySpecPatches(spec) {
  const copy = structuredClone(spec)
  return PATCHES.reduce((current, patch) => patch.run(current), copy)
}
```

In `orval.config.ts` change `transformer: './scripts/orval/omitPubkey.mjs'` to `transformer: './scripts/orval/specPatches/index.mjs'`. Delete `scripts/orval/omitPubkey.mjs`. In `package.json` set `"api:pull:test": "node --test scripts/orval/pull-openapi.test.mjs scripts/orval/specPatches/specPatches.test.mjs"`.

- [ ] **Step 5: Verify**

Run: `node --test scripts/orval/specPatches/specPatches.test.mjs` → PASS (4 tests).
Run: `npm run api:generate && git diff --stat src/generated` → no change in `src/generated/api` (old output identical because the patch restores exactly what was in the file).
Run: `npx tsc -p tsconfig.app.json --noEmit` → no errors.

- [ ] **Step 6: Commit**

```bash
git add scripts/orval orval.config.ts openapi/abco-api.json package.json
git commit -m "build(api): apply OpenAPI fixes as self-checking spec patches"
```

---

### Task 2: Spec patches for the documented spec gaps

**Files:**
- Create: `scripts/orval/specPatches/powerInventory.mjs`, `flashSystemVolumes.mjs`, `vdisksByVm.mjs`, `volumeTree.mjs`, `rollbackReport.mjs`, `recoveryVmMetadata.mjs`
- Modify: `scripts/orval/specPatches/index.mjs`, `scripts/orval/specPatches/specPatches.test.mjs`, `docs/api/openapi-spec-gaps.md` (add a "Patched by" column naming the patch)

**Interfaces:**
- Consumes: `definePatch`, `schemaOf` from Task 1.
- Produces: component schemas used by later tasks: `PowerPartition`, `FlashSystemVolume`, `FlashSystemPool`, `FlashSystemHost`, `FlashSystemCluster`, `StorageVolume`, `StorageVolumeMapping`, `StorageVolumeSnapshots`, `VolumeTreePoolDetail`, `VolumeTreeVolumeDetail`, `VolumeTreeFcmapDetail`, `VolumeTreeConsistencyGroupDetail`, `RollbackAirflowSection`, `RollbackIbmSection`; extended `RecoveryVM`, `PowerVmRecord`, `PowerVmsResponse`, `VolumesResponse`, `VdisksByVmResponse`, `VolumeTreeNode`, `RollbackReport`.

Field lists and defaults are copied from the local zod schemas they replace (`.catch(x)` becomes `"default": x`), so the parsed data has the same shape the mappers use today.

- [ ] **Step 1: Write the failing tests** (append to `specPatches.test.mjs`)

```js
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

test('types volume tree node kind and detail', () => {
  const node = schemas().VolumeTreeNode
  assert.deepEqual(node.properties.kind.enum, ['pool', 'volume', 'fcmap', 'consistency_group'])
  assert.equal(node.properties.detail.anyOf.length, 4)
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

for (const name of ['powerInventory', 'flashSystemVolumes', 'vdisksByVm', 'volumeTree', 'rollbackReport', 'recoveryVmMetadata']) {
  test(`${name} fails once already applied`, () => {
    const patch = PATCHES.find(p => p.name === name)
    assert.throws(() => patch.run(transform(rawSpec())), new RegExp(`Spec patch ${name} is obsolete`))
  })
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test scripts/orval/specPatches/specPatches.test.mjs`
Expected: FAIL on the new tests (`Cannot read properties of undefined`).

- [ ] **Step 3: Implement the patches**

Shared helpers go into `definePatch.mjs`:

```js
export const str = (fallback) => (fallback === undefined ? { type: 'string' } : { type: 'string', default: fallback })
export const int = (fallback) => ({ type: 'integer', default: fallback })
export const bool = (fallback) => ({ type: 'boolean', default: fallback })
export const ref = name => ({ $ref: `#/components/schemas/${name}` })
export const loose = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: true })

export function withSchemas(spec, update) {
  return { ...spec, components: { ...spec.components, schemas: { ...spec.components.schemas, ...update } } }
}
```

`powerInventory.mjs`:

```js
import { definePatch, loose, ref, schemaOf, str, withSchemas } from './definePatch.mjs'

const partition = {
  type: 'object',
  properties: {
    PartitionUUID: str(), PartitionName: str(), PartitionType: str(), PartitionState: str(), SystemName: str(),
  },
  additionalProperties: { anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }, { type: 'null' }] },
}

export default definePatch({
  name: 'powerInventory',
  isObsolete: spec => (schemaOf(spec, 'PowerVmRecord').properties.lpar.properties ? 'PowerVmRecord.lpar is typed' : null),
  apply: (spec) => {
    const record = schemaOf(spec, 'PowerVmRecord')
    const response = schemaOf(spec, 'PowerVmsResponse')
    return withSchemas(spec, {
      PowerPartition: partition,
      PowerVmRecord: { ...record, properties: { ...record.properties, lpar: ref('PowerPartition'), vios: ref('PowerPartition') } },
      PowerVmsResponse: {
        ...response,
        properties: {
          ...response.properties,
          provider_id: { type: 'string' },
          counts_by_type: loose(
            { LogicalPartition: { type: 'integer', minimum: 0 }, VirtualIOServer: { type: 'integer', minimum: 0 } },
            ['LogicalPartition', 'VirtualIOServer'],
          ),
        },
      },
    })
  },
})
```

`flashSystemVolumes.mjs`:

```js
import { definePatch, loose, ref, schemaOf, str, withSchemas } from './definePatch.mjs'

const volume = loose({
  provider_id: { anyOf: [{ type: 'string' }, { type: 'null' }] },
  id: str(''), name: { type: 'string', minLength: 1 }, IO_group_id: str(''), IO_group_name: str('-'),
  status: str('unknown'), mdisk_grp_id: str(''), mdisk_grp_name: str('-'), capacity: str('-'), type: str('-'),
  FC_id: str(''), FC_name: str(''), RC_id: str(''), RC_name: str(''), vdisk_UID: str(''),
  fc_map_count: str('0'), copy_count: str('0'), fast_write_state: str('-'), se_copy_count: str('0'),
  RC_change: str(''), compressed_copy_count: str('0'), parent_mdisk_grp_id: str(''), parent_mdisk_grp_name: str(''),
  formatting: str('-'), encrypt: str('-'), volume_id: str(''), volume_name: str(''), function: str('-'), protocol: str('-'),
  host_maps: { type: 'array', default: [], items: loose({ host_id: str(), scsi_id: str() }, ['host_id', 'scsi_id']) },
}, ['name'])

export default definePatch({
  name: 'flashSystemVolumes',
  isObsolete: spec => (schemaOf(spec, 'VolumesResponse').properties.volumes.items.$ref ? 'VolumesResponse.volumes is typed' : null),
  apply: (spec) => {
    const response = schemaOf(spec, 'VolumesResponse')
    const map = name => ({ type: 'object', default: {}, additionalProperties: ref(name) })
    return withSchemas(spec, {
      FlashSystemVolume: volume,
      FlashSystemPool: loose({ name: str('-'), capacity: str('-'), used_capacity: str('-'), free_capacity: str('-') }),
      FlashSystemHost: loose({ name: str('-'), cluster_id: { anyOf: [{ type: 'string' }, { type: 'null' }], default: null }, cluster_name: str('') }),
      FlashSystemCluster: loose({ name: str('-') }),
      VolumesResponse: {
        ...response,
        properties: {
          ...response.properties,
          volumes: { type: 'array', items: ref('FlashSystemVolume') },
          pools: map('FlashSystemPool'),
          hosts: map('FlashSystemHost'),
          clusters: map('FlashSystemCluster'),
        },
      },
    })
  },
})
```

`vdisksByVm.mjs`:

```js
import { bool, definePatch, int, ref, schemaOf, str, withSchemas } from './definePatch.mjs'

const mapping = {
  type: 'object',
  properties: {
    id: str(''), name: str(''), source_vdisk_id: str(''), source_vdisk_name: str(''), target_vdisk_id: str(''),
    target_vdisk_name: str(''), status: str('-'), progress: str('0'), copy_rate: str('0'), clean_progress: str('0'), start_time: str(''),
  },
}

export default definePatch({
  name: 'vdisksByVm',
  isObsolete: spec => (schemaOf(spec, 'VdisksByVmResponse').properties.vdisks.additionalProperties?.$ref ? 'VdisksByVmResponse.vdisks is typed' : null),
  apply: (spec) => {
    const response = schemaOf(spec, 'VdisksByVmResponse')
    return withSchemas(spec, {
      StorageVolumeMapping: mapping,
      StorageVolumeSnapshots: {
        type: 'object',
        properties: {
          has_snapshots: bool(false), snapshot_count: int(0), is_snapshot: bool(false),
          source_mappings: { type: 'array', default: [], items: ref('StorageVolumeMapping') },
          target_mappings: { type: 'array', default: [], items: ref('StorageVolumeMapping') },
        },
      },
      StorageVolume: {
        type: 'object',
        properties: {
          id: str(''), name: str(''), volume_name: str(''), capacity: str('-'), status: str('-'), mdisk_grp_name: str('-'),
          type: str('-'), protocol: str('-'), vdisk_UID: str(''), copy_count: str('0'), fc_map_count: str('0'),
          // Backend field name is misspelled; kept as the wire name.
          sanpshosts: ref('StorageVolumeSnapshots'),
        },
      },
      VdisksByVmResponse: {
        ...response,
        properties: { ...response.properties, vdisks: { type: 'object', default: {}, additionalProperties: ref('StorageVolume') } },
      },
    })
  },
})
```

`volumeTree.mjs`:

```js
import { bool, definePatch, int, loose, ref, schemaOf, str, withSchemas } from './definePatch.mjs'

const strings = (names, fallback) => Object.fromEntries(names.map(n => [n, str(fallback)]))

export default definePatch({
  name: 'volumeTree',
  isObsolete: spec => (schemaOf(spec, 'VolumeTreeNode').properties.kind.enum ? 'VolumeTreeNode.kind is an enum' : null),
  apply: (spec) => {
    const node = schemaOf(spec, 'VolumeTreeNode')
    return withSchemas(spec, {
      VolumeTreePoolDetail: loose({
        ...strings(['id', 'parent_mdisk_grp_id', 'parent_mdisk_grp_name', 'site_id', 'site_name'], ''),
        ...strings(['mdisk_count', 'vdisk_count', 'child_mdisk_grp_count'], '0'),
        ...strings(['name', 'capacity', 'extent_size', 'free_capacity', 'virtual_capacity', 'used_capacity', 'real_capacity',
          'overallocation', 'warning', 'easy_tier', 'easy_tier_status', 'compression_active', 'compression_virtual_capacity',
          'compression_compressed_capacity', 'compression_uncompressed_capacity', 'child_mdisk_grp_capacity', 'type', 'encrypt',
          'owner_type', 'data_reduction', 'used_capacity_before_reduction', 'used_capacity_after_reduction', 'overhead_capacity',
          'deduplication_capacity_saving', 'reclaimable_capacity', 'easy_tier_fcm_over_allocation_max'], '-'),
        status: str('unknown'),
        volume_count: int(0),
      }),
      VolumeTreeVolumeDetail: loose({
        ...strings(['id', 'IO_group_id', 'mdisk_grp_id', 'FC_id', 'FC_name', 'RC_id', 'RC_name', 'vdisk_UID', 'RC_change',
          'parent_mdisk_grp_id', 'parent_mdisk_grp_name', 'volume_id', 'volume_name'], ''),
        ...strings(['fc_map_count', 'copy_count', 'se_copy_count', 'compressed_copy_count'], '0'),
        ...strings(['name', 'IO_group_name', 'mdisk_grp_name', 'capacity', 'type', 'fast_write_state', 'formatting', 'encrypt',
          'function', 'protocol'], '-'),
        status: str('unknown'),
        host_maps: { type: 'array', default: [], items: loose({ host_id: str(''), host_name: str('-'), cluster_name: str(''), scsi_id: str('') }) },
        is_snapshot_target: bool(false), has_snapshots: bool(false), snapshot_count: int(0), resolved: bool(false),
        role: { type: 'string', enum: ['source', 'target'] },
      }),
      VolumeTreeFcmapDetail: loose({
        ...strings(['id', 'source_vdisk_id', 'source_vdisk_name', 'target_vdisk_id', 'target_vdisk_name', 'group_id', 'group_name',
          'partner_FC_id', 'partner_FC_name', 'start_time', 'start_time_iso'], ''),
        ...strings(['progress', 'copy_rate', 'clean_progress'], '0'),
        ...strings(['name', 'incremental', 'restoring', 'rc_controlled'], '-'),
        status: str('unknown'),
      }),
      VolumeTreeConsistencyGroupDetail: loose({
        id: str(''), name: str('-'), status: str('unknown'), start_time: str(''), fc_mapping_count: int(0),
        pool_ids: { type: 'array', default: [], items: { type: 'string' } }, spans_pools: bool(false), is_synthetic: bool(false),
      }),
      VolumeTreeNode: {
        ...node,
        properties: {
          ...node.properties,
          kind: { type: 'string', enum: ['pool', 'volume', 'fcmap', 'consistency_group'] },
          detail: { anyOf: ['VolumeTreePoolDetail', 'VolumeTreeVolumeDetail', 'VolumeTreeFcmapDetail', 'VolumeTreeConsistencyGroupDetail'].map(ref) },
        },
      },
    })
  },
})
```

`rollbackReport.mjs`:

```js
import { definePatch, loose, ref, schemaOf, withSchemas } from './definePatch.mjs'

const list = { type: 'array', items: {} }

export default definePatch({
  name: 'rollbackReport',
  isObsolete: spec => (schemaOf(spec, 'RollbackReport').properties.airflow ? 'RollbackReport.airflow is typed' : null),
  apply: (spec) => {
    const report = schemaOf(spec, 'RollbackReport')
    const optional = name => ({ anyOf: [ref(name), { type: 'null' }] })
    return withSchemas(spec, {
      RollbackAirflowSection: loose({
        status: { type: 'string' }, dag_id: { type: 'string' }, paused: { type: 'string' },
        failed_runs: list, dag_file: { type: 'string' }, dag_record: { type: 'string' },
      }, ['status']),
      RollbackIbmSection: loose({ status: { type: 'string' }, consistency_groups: list, fcmaps: list, volumes: list, errors: list }, ['status']),
      RollbackReport: {
        ...report,
        additionalProperties: true,
        properties: { ...report.properties, airflow: optional('RollbackAirflowSection'), ibm: optional('RollbackIbmSection') },
      },
    })
  },
})
```

`recoveryVmMetadata.mjs`:

```js
import { definePatch, schemaOf, withSchemas } from './definePatch.mjs'

export default definePatch({
  name: 'recoveryVmMetadata',
  isObsolete: spec => (schemaOf(spec, 'RecoveryVM').properties.order ? 'RecoveryVM.order is typed' : null),
  apply: (spec) => {
    const vm = schemaOf(spec, 'RecoveryVM')
    return withSchemas(spec, {
      RecoveryVM: {
        ...vm,
        properties: {
          ...vm.properties,
          order: { type: 'integer' }, hostname: { type: 'string' }, ip_address: { type: 'string' }, os: { type: 'string' },
          cpu: { type: 'number' }, memory_gb: { type: 'number' }, storage_gb: { type: 'number' },
        },
      },
    })
  },
})
```

Update `index.mjs`:

```js
import accessLogs from './accessLogs.mjs'
import flashSystemVolumes from './flashSystemVolumes.mjs'
import omitPubkey from './omitPubkey.mjs'
import powerInventory from './powerInventory.mjs'
import recoveryVmMetadata from './recoveryVmMetadata.mjs'
import rollbackReport from './rollbackReport.mjs'
import vdisksByVm from './vdisksByVm.mjs'
import volumeTree from './volumeTree.mjs'

export const PATCHES = [omitPubkey, accessLogs, powerInventory, flashSystemVolumes, vdisksByVm, volumeTree, rollbackReport, recoveryVmMetadata]
```

- [ ] **Step 4: Verify**

Run: `node --test scripts/orval/specPatches/specPatches.test.mjs` → PASS.
Run: `npm run api:generate && npx tsc -p tsconfig.app.json --noEmit`. The old output now contains the new component schemas; existing local SPEC GAP schemas still compile. If a feature fails to compile because a generated type became stricter, record the file and fix it in its feature task, not here; revert nothing.

- [ ] **Step 5: Commit**

```bash
git add scripts/orval/specPatches docs/api/openapi-spec-gaps.md src/generated/api
git commit -m "build(api): patch documented OpenAPI gaps at generation time"
```

---

### Task 3: Readable operation names

**Files:**
- Create: `scripts/orval/operationName.mjs`, `scripts/orval/operationName.test.mjs`
- Modify: `package.json` (`api:pull:test` adds `scripts/orval/operationName.test.mjs`)

**Interfaces:**
- Produces: `export default function operationName(operation, route, verb): string`.

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test scripts/orval/operationName.test.mjs` → FAIL, module not found.

- [ ] **Step 3: Implement**

```js
// Routes already named after an action keep that action; other routes get the
// HTTP verb as prefix so GET and PUT on the same route stay distinct.
const ACTION_PREFIXES = ['get_', 'submit_', 'delete_', 'test_', 'rollback_']

const camelCase = value => value.replace(/[/_]+([a-z0-9])/g, (_, char) => char.toUpperCase())

export default function operationName(_operation, route, verb) {
  const raw = route.replace(/^\/+/, '')
  const name = camelCase(raw)
  if (ACTION_PREFIXES.some(prefix => raw.startsWith(prefix))) return name
  return verb + name.charAt(0).toUpperCase() + name.slice(1)
}
```

- [ ] **Step 4: Verify**

Run: `node --test scripts/orval/operationName.test.mjs` → PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/orval/operationName.mjs scripts/orval/operationName.test.mjs package.json
git commit -m "build(api): derive readable operation names from routes"
```

---

### Task 4: React Query output, validating mutator and response registry

**Files:**
- Create: `src/shared/api/validatingMutator.ts`, `src/shared/api/validatingMutator.test.ts`, `scripts/orval/generate-response-registry.mjs`, `scripts/orval/generate-response-registry.test.mjs`
- Modify: `orval.config.ts` (add `abcoQuery` project and `hooks.afterAllFilesWrite`), `package.json` (`api:generate` runs the registry script after Orval; `api:pull:test` adds the registry test), `scripts/orval/verify-output.mjs` and `scripts/orval/check-generated.mjs` (include `src/generated/query`)
- Generated: `src/generated/query/**`

**Interfaces:**
- Consumes: `applySpecPatches` (Task 1), `operationName` (Task 3), `orvalMutator`, `OrvalApiError`, `GeneratedResponseContractError` (existing, `src/shared/api`).
- Produces: `validatingMutator<T>(url: string, options?: RequestInit): Promise<T>`; `src/generated/query/responseSchemas.gen.ts` exporting `responseSchemas: Record<string, z.ZodType>` keyed `"GET /get_credentials"`; hooks such as `useGetCredentials` from `@/generated/query/credentials/credentials.gen`.

- [ ] **Step 1: Write the failing registry test**

`scripts/orval/generate-response-registry.test.mjs`:

```js
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
```

- [ ] **Step 2: Implement the registry script**

`scripts/orval/generate-response-registry.mjs`:

```js
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import applySpecPatches from './specPatches/index.mjs'

const OUTPUT = 'src/generated/query/responseSchemas.gen.ts'
const fileName = name => name.charAt(0).toLowerCase() + name.slice(1)

export function buildRegistrySource(spec) {
  const entries = []
  for (const [route, item] of Object.entries(spec.paths)) {
    for (const [verb, operation] of Object.entries(item)) {
      const ref = operation.responses?.['200']?.content?.['application/json']?.schema?.$ref
      if (ref) entries.push([`${verb.toUpperCase()} ${route}`, ref.split('/').pop()])
    }
  }
  const names = [...new Set(entries.map(([, name]) => name))].sort()
  return [
    '// Generated by scripts/orval/generate-response-registry.mjs. Do not edit.',
    "import type { z } from 'zod'",
    ...names.map(name => `import { ${name} } from './zod/${fileName(name)}.gen'`),
    '',
    'export const responseSchemas: Record<string, z.ZodType> = {',
    ...entries.map(([key, name]) => `  '${key}': ${name},`),
    '}',
    '',
  ].join('\n')
}

if (import.meta.url === pathToFileURL(path.resolve(process.argv[1] ?? '')).href) {
  const spec = applySpecPatches(JSON.parse(readFileSync('openapi/abco-api.json', 'utf8')))
  writeFileSync(OUTPUT, buildRegistrySource(spec))
}
```

Run: `node --test scripts/orval/generate-response-registry.test.mjs` → PASS.

- [ ] **Step 3: Write the failing mutator test**

`src/shared/api/validatingMutator.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

vi.mock('@/generated/query/responseSchemas.gen', () => ({
  responseSchemas: { 'GET /get_credentials': z.object({ credentials: z.array(z.object({ id: z.string() })) }) },
}))
vi.mock('./orvalMutator', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./orvalMutator')>()),
  orvalMutator: vi.fn(),
}))

import { orvalMutator } from './orvalMutator'
import { validatingMutator } from './validatingMutator'

describe('validatingMutator', () => {
  afterEach(() => { vi.mocked(orvalMutator).mockReset() })

  it('returns the parsed response when it matches the schema', async () => {
    vi.mocked(orvalMutator).mockResolvedValue({ credentials: [{ id: 'a', extra: 1 }] })
    await expect(validatingMutator('/get_credentials', { method: 'GET' })).resolves.toEqual({ credentials: [{ id: 'a' }] })
  })

  it('ignores the query string when looking up the schema', async () => {
    vi.mocked(orvalMutator).mockResolvedValue({ credentials: [] })
    await expect(validatingMutator('/get_credentials?x=1', { method: 'GET' })).resolves.toEqual({ credentials: [] })
  })

  it('throws a contract error naming the operation', async () => {
    vi.mocked(orvalMutator).mockResolvedValue({ credentials: 'bad' })
    await expect(validatingMutator('/get_credentials', { method: 'GET' }))
      .rejects.toMatchObject({ name: 'GeneratedResponseContractError', operation: 'GET /get_credentials' })
  })

  it('passes unregistered operations through unchanged', async () => {
    vi.mocked(orvalMutator).mockResolvedValue('ok')
    await expect(validatingMutator('/health', { method: 'GET' })).resolves.toBe('ok')
  })
})
```

Run: `npx vitest run src/shared/api/validatingMutator.test.ts` → FAIL (module not found).

- [ ] **Step 4: Implement the mutator**

`src/shared/api/validatingMutator.ts`:

```ts
import { responseSchemas } from '@/generated/query/responseSchemas.gen'
import { parseGeneratedResponse } from './generatedResponse'
import { orvalMutator } from './orvalMutator'

// Orval skips its own runtime validation when a custom mutator is configured, so
// every generated call is validated here against the generated response schema.
export async function validatingMutator<T>(url: string, options?: RequestInit): Promise<T> {
  const payload = await orvalMutator<unknown>(url, options)
  const operation = `${(options?.method ?? 'GET').toUpperCase()} ${url.split('?')[0] ?? url}`
  const schema = responseSchemas[operation]
  return (schema ? parseGeneratedResponse(schema, payload, operation) : payload) as T
}
```

- [ ] **Step 5: Add the Orval project**

In `orval.config.ts` add the import `import operationName from './scripts/orval/operationName.mjs'`, change `input.override.transformer` to the Task 1 path if not done, and add this project next to the existing two:

```ts
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
        query: { version: 5, mutationInvalidates: [] },
        zod: { version: 4, variant: 'classic', exactOptional: true },
      },
    },
  },
```

`mutationInvalidates` is filled per feature in Tasks 5-13. In `package.json` set `"api:generate": "orval --config orval.config.ts && node scripts/orval/generate-response-registry.mjs"`.

- [ ] **Step 6: Generate and verify**

Run: `npm run api:generate`
Expected: `src/generated/query/<tag>/<tag>.gen.ts` for 18 tags, `src/generated/query/zod/*.gen.ts`, `src/generated/query/responseSchemas.gen.ts`.
Run: `npx vitest run src/shared/api/validatingMutator.test.ts` → PASS.
Run: `npx tsc -p tsconfig.app.json --noEmit` → no errors.
Run: `node scripts/orval/check-generated.mjs && node scripts/orval/verify-output.mjs` → pass after including `src/generated/query` in both scripts' checked paths.

- [ ] **Step 7: Commit**

```bash
git add orval.config.ts package.json scripts/orval src/shared/api/validatingMutator.ts src/shared/api/validatingMutator.test.ts src/generated/query
git commit -m "build(api): generate React Query client with central response validation"
```

---

### Task 5: Credentials on generated hooks (reference slice)

**Files:**
- Delete: `credentials/api/credentialsApi.ts`, `credentials/api/credentialQueryKeys.ts`, `credentials/hooks/useCredentials.ts`, `credentials/hooks/useCreateCredential.ts`, `credentials/hooks/useDeleteCredential.ts`, their tests, `credentials/model/credentialTypes.ts` (keep only `CredentialFormData`, moved as below)
- Create: `credentials/model/credentialForm.ts`, `credentials/model/selectCredentials.ts`
- Modify: `credentials/api/credentialsCrypto.ts` (gains `createEncryptedCredentialPayload`), `credentials/components/CredentialCreateModal.tsx`, `credentials/components/CredentialsTable.tsx`, `credentials/pages/CredentialsPage.tsx`, `platform-administration/platform-providers/components/PlatformProvidersModal.tsx`, `providers-connectors/providers/components/ProvidersCreateModal.tsx`, `orval.config.ts`, related tests
- All paths above are under `src/features/providers-connectors/` unless given in full.

**Interfaces:**
- Consumes: `useGetCredentials`, `useSubmitCredential`, `useDeleteCredential`, `getGetCredentialsQueryKey` from `@/generated/query/credentials/credentials.gen`; types `Credential`, `CredentialRecord`, `CredentialsResponse` from `@/generated/query/zod`.
- Produces: `selectCredentials(response: CredentialsResponse): CredentialRecord[]`; `createEncryptedCredentialPayload(form: CredentialFormData): Promise<Credential>`.

- [ ] **Step 1: Declare invalidation**

In `orval.config.ts`, `abcoQuery.output.override.query.mutationInvalidates`:

```ts
          { onMutations: ['submitCredential', 'deleteCredential'], invalidates: ['getCredentials'] },
```

Run: `npm run api:generate`.

- [ ] **Step 2: Write the failing test for the mutation refresh**

`credentials/components/CredentialsTable.test.tsx`, add:

```tsx
it('refetches the credential list after a delete', async () => {
  const fetchMock = stubFetch({ credentials: [{ id: 'c1', name: 'One', username: 'u' }] })
  const user = userEvent.setup()
  renderWithQueryClient(<CredentialsPage />)
  await screen.findByText('One')
  await user.click(screen.getByRole('button', { name: /delete/i }))
  await user.click(screen.getByRole('button', { name: /confirm|delete/i }))
  await waitFor(() => {
    const urls = fetchMock.mock.calls.map(([url]) => String(url))
    expect(urls.filter(url => url.startsWith('/api/get_credentials'))).toHaveLength(2)
  })
})
```

Use the file's existing `stubFetch` and render helpers; if the file has none, copy `stubFetch` from `providers/api/providersApi.test.ts`.

Run: `npx vitest run src/features/providers-connectors/credentials` → the new test FAILS (old hook uses `setQueryData`, no refetch).

- [ ] **Step 3: Replace the data layer**

`credentials/model/selectCredentials.ts`:

```ts
import type { CredentialsResponse } from '@/generated/query/zod'

export const selectCredentials = (response: CredentialsResponse) => response.credentials
```

`credentials/model/credentialForm.ts`:

```ts
export interface CredentialFormData {
  id: string
  name: string
  description: string
  username: string
  password: string
}
```

Append to `credentials/api/credentialsCrypto.ts`:

```ts
import type { Credential } from '@/generated/query/zod'
import type { CredentialFormData } from '../model/credentialForm'

export async function createEncryptedCredentialPayload(form: CredentialFormData): Promise<Credential> {
  return {
    id: form.id.trim(),
    name: form.name.trim(),
    description: form.description.trim(),
    username: form.username.trim(),
    password: await encryptCredentialPassword(form.password),
    password_encrypted: true,
  }
}
```

Call sites:

```tsx
// CredentialsPage.tsx
const { data = [], isLoading, isFetching, error, refetch } = useGetCredentials({ query: { select: selectCredentials } })

// PlatformProvidersModal.tsx and ProvidersCreateModal.tsx
const credentialsQuery = useGetCredentials({ query: { enabled: open, select: selectCredentials } })

// CredentialCreateModal.tsx
const createCredential = useSubmitCredential()
// ...
createCredential.mutate({ data: payload }, { /* existing onSuccess/onError unchanged */ })

// CredentialsTable.tsx
const deleteCredential = useDeleteCredential()
// ...
deleteCredential.mutate({ params: { credential_id: deleteTarget.id } }, { /* existing callbacks unchanged */ })
```

Every `CredentialRecord` import changes to `import type { CredentialRecord } from '@/generated/query/zod'`. `credential.description` is now `string | null | undefined`; render it with `credential.description ?? ''` at each use (find them with `grep -rn "\.description" src/features/providers-connectors/credentials`).

Error display: the components already use `resolveUserFacingErrorMessage` / `extractBackendErrorDetail`, which read `OrvalApiError.body` directly, so backend details still show.

- [ ] **Step 4: Update tests**

Tests that `vi.mock('../api/credentialsApi')` or `vi.mock('../hooks/...')` switch to `stubFetch` against `/api/get_credentials`, `/api/submit_credential`, `/api/delete_credential?credential_id=...`, because the generated hooks call `fetch` through the mutator. Delete tests of deleted files.

- [ ] **Step 5: Verify**

Run: `npx vitest run src/features/providers-connectors/credentials src/features/platform-administration/platform-providers src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx` → PASS, including the new refresh test.
Run: `npx tsc -p tsconfig.app.json --noEmit` → no errors.
Run: `npx eslint src/features/providers-connectors/credentials` → no errors.
Manual: `npm run dev`, open `/providers-connectors/credentials`, create and delete a credential; the list updates.

- [ ] **Step 6: Commit**

```bash
git add -A src/features/providers-connectors/credentials src/features/platform-administration/platform-providers/components/PlatformProvidersModal.tsx src/features/providers-connectors/providers/components/ProvidersCreateModal.tsx orval.config.ts src/generated/query
git commit -m "refactor(credentials): use generated React Query hooks"
```

---

### Tasks 6-13: Remaining feature slices

Each slice follows the same six steps as Task 5, written out in full per slice:

1. Add the slice's `mutationInvalidates` rule to `orval.config.ts`; run `npm run api:generate`.
2. Add a failing test that the list query refetches after one mutation (template in Task 5 Step 2, with the slice's endpoint URL).
3. Delete the files listed; replace each old hook call with the generated hook shown; rename fields at every use with the table (find uses with the given `grep`).
4. Switch tests from mocked API modules to `stubFetch` against the listed URLs.
5. Verify: `npx vitest run <slice folders>`, `npx tsc -p tsconfig.app.json --noEmit`, `npx eslint <slice folders>`, manual check listed.
6. Commit with the message given.

#### Task 6: Policy sets and the three policies

Folder: `src/features/recovery-plans/policy-sets`, `src/features/recovery-plans/recovery-policies/{snapshot,clean-room,application-recovery}`.

Invalidation:

```ts
{ onMutations: ['submitPolicySet', 'deletePolicySet'], invalidates: ['getPolicySets'] },
{ onMutations: ['submitPolicy', 'deletePolicy'], invalidates: ['getPolicies'] },
{ onMutations: ['submitCleanRoomPolicy', 'deleteCleanRoomPolicy'], invalidates: ['getCleanRoomPolicies'] },
{ onMutations: ['submitRecoveryAppPolicy', 'deleteRecoveryAppPolicy'], invalidates: ['getRecoveryAppPolicies'] },
```

Delete per folder: `api/*Api.ts`, `api/*QueryKeys.ts`, `hooks/use*Policies.ts`, `hooks/use*PolicySets.ts`, `hooks/useSubmit*.ts`, `hooks/useDelete*.ts`, the pure-rename interfaces in `model/*Types.ts` (keep the `*_TIME_UNITS` / `*_SELECTION_MODES` constants).

Hooks and selects:

| Old | New |
|---|---|
| `usePolicySets()` | `useGetPolicySets({ query: { select: r => r.policy_sets } })` |
| `useSubmitPolicySet().mutate(x)` | `useSubmitPolicySet().mutate({ data: x })` |
| `useDeletePolicySet().mutate(id)` | `useDeletePolicySet().mutate({ params: { policy_set_id: id } })` |
| `useSnapshotPolicies()` | `useGetPolicies({ query: { select: r => r.snapshot_policies } })` |
| `useSubmitSnapshotPolicy().mutate(x)` | `useSubmitPolicy().mutate({ data: x })` |
| `useDeleteSnapshotPolicy().mutate(id)` | `useDeletePolicy().mutate({ params: { policy_id: id } })` |
| `useCleanRoomPolicies()` | `useGetCleanRoomPolicies({ query: { select: r => r.clean_room_policies } })` |
| `useSubmitCleanRoomPolicy` / `useDeleteCleanRoomPolicy` | generated hooks of the same name, `{ data }` / `{ params: { policy_id } }` |
| `useRecoveryAppPolicies()` | `useGetRecoveryAppPolicies({ query: { select: r => r.recovery_app_policies } })` |
| `useSubmitRecoveryAppPolicy` / `useDeleteRecoveryAppPolicy` | generated hooks of the same name, `{ data }` / `{ params: { policy_id } }` |

Declare each `select` as a module-level constant in the feature's `model/select*.ts`, not inline.

Field renames (`grep -rn "<old>" src/features/recovery-plans`):

| Old UI field | Backend field |
|---|---|
| `snapshotPolicyId` | `snapshot_policy_id` |
| `recoveryAppPolicyId` | `recovery_app_policy_id` |
| `cleanRoomPolicyId` | `clean_room_policy_id` |
| `frequencyValue` / `frequencyUnit` | `frequency_value` / `frequency_unit` |
| `retentionValue` / `retentionUnit` | `retention_value` / `retention_unit` |
| `maxSnapshots` | `max_snapshots` |
| `bootVerify` | `boot_verify` |
| `snapshotSelectionMode` | `snapshot_selection_mode` |
| `snapshotMaxAgeValue` / `snapshotMaxAgeUnit` | `snapshot_max_age_value` / `snapshot_max_age_unit` |
| `snapshotTargetTime` | `snapshot_target_time` |

Nullable fields (`description`, `level`, the three policy ids, `max_snapshots`, the snapshot selection fields) render with `?? ''` or `?? '-'` as the component did before. Form data interfaces (`*FormData`) stay in the modal files; their submit functions now build the backend shape. The recovery-app policy submit keeps sending only the fields of the selected mode (move `toRecoveryAppPolicySubmitPayload` from the deleted API module into `application-recovery/model/recoveryAppPolicySubmit.ts`, typed `(form) => RecoveryAppPolicy`). JSON viewers show the record as received; delete `toPolicySetSubmitPayload`, `toSnapshotPolicySubmitPayload`, `toCleanRoomPolicySubmitPayload`, `toRecoveryAppPolicyReadPayload`.

Test URLs: `/api/get_policy_sets`, `/api/submit_policy_set`, `/api/delete_policy_set?policy_set_id=`, `/api/get_policies`, `/api/submit_policy`, `/api/delete_policy?policy_id=`, `/api/get_clean_room_policies`, `/api/submit_clean_room_policy`, `/api/delete_clean_room_policy?policy_id=`, `/api/get_recovery_app_policies`, `/api/submit_recovery_app_policy`, `/api/delete_recovery_app_policy?policy_id=`.

Manual: create, edit, delete one policy of each kind and one policy set.
Commit: `refactor(policies): use generated React Query hooks and backend field names`.

#### Task 7: Discovery cache

Folder: `src/features/providers-connectors/discovery-settings`.
Invalidation: `{ onMutations: ['putDiscoveryCacheConfig'], invalidates: ['getDiscoveryCacheConfig'] }`.
Delete: `api/discoveryCacheApi.ts`, `api/discoveryCacheQueryKeys.ts`, `hooks/useDiscoveryCacheConfig.ts`, `hooks/useDiscoveryCacheHistory.ts`, `hooks/useUpdateDiscoveryCacheConfig.ts`, pure-rename types in `model/discoveryCacheTypes.ts`.
Hooks: `useGetDiscoveryCacheConfig()`, `useGetDiscoveryCacheHistory(params)`, `usePutDiscoveryCacheConfig().mutate({ data })`. History params always complete through `model/historyParams.ts`: `export const historyParams = (providerId?: string, limit?: number) => ({ ...(providerId ? { provider_id: providerId } : {}), ...(limit ? { limit } : {}) })`.
Renames: `historyRetention` → `history_retention`, `retentionDays` → `retention_days`, `maxRecords` → `max_records`, `providerId` → `provider_id`, `providerType` → `provider_type`, `triggeredBy` → `triggered_by`, `startedAt` → `started_at`, `durationMs` → `duration_ms`, `recordCount` → `record_count`. `useDiscoveryCacheConfigDraft` and `helpers/discoveryCacheConfigDraft.ts` stay (form draft) and build a `CacheConfigUpdate`.
Test URLs: `/api/discovery/cache/config` (GET, PUT), `/api/discovery/cache/history`.
Manual: change a default TTL and retention, save, reload page.
Commit: `refactor(discovery-cache): use generated React Query hooks and backend field names`.

#### Task 8: Providers and platform providers

Folders: `src/features/providers-connectors/providers`, `src/features/platform-administration/platform-providers`.
Invalidation: `{ onMutations: ['submitProvider', 'deleteProvider'], invalidates: ['getProviders'] }`, `{ onMutations: ['submitPlatformProvider', 'deletePlatformProvider'], invalidates: ['getPlatformProviders'] }`.
Delete: `providers/api/providersApi.ts`, `providers/api/providerQueryKeys.ts`, `providers/hooks/useProviders.ts`, `useDeleteProvider.ts`, `useUpsertProvider.ts`, `useTestProviderConnection.ts`; same set in platform-providers (`platformProvidersApi.ts`, `platformProviderQueryKeys.ts`, `usePlatformProviders.ts`, `useDeletePlatformProvider.ts`, `useUpsertPlatformProvider.ts`, `api/schemas/platformProvidersSchema.ts` moves its email rule into `PlatformProvidersModal` validation).
Hooks: `useGetProviders({ role }, { query: { select: selectProviders } })`, `useSubmitProvider().mutate({ data })`, `useDeleteProvider().mutate({ params: { provider_id } })`, `useTestProvider({ provider_id }, { query: { enabled } })`; platform equivalents `useGetPlatformProviders`, `useSubmitPlatformProvider`, `useDeletePlatformProvider`.
Selects (spread, no field loss) in `providers/model/selectProviders.ts`:

```ts
import type { ProvidersResponse } from '@/generated/query/zod'
import { PROVIDER_TYPES, type ProviderType } from './providerTypes'

const isInfrastructureType = (type: string): type is ProviderType => PROVIDER_TYPES.some(known => known === type)

export const selectProviders = (response: ProvidersResponse) => response.providers
  .filter(provider => isInfrastructureType(provider.type))
  .map(provider => ({ ...provider, credentialStatus: provider.credentialStatus ?? 'none' }))
```

Behavior change to note in the commit: an unknown provider type is now skipped instead of failing the whole list.
Params: always call `useGetProviders({ role: 'all' })` or `{ role }` explicitly; never omit params, so one cache entry per role.
Renames: none (the providers API is camelCase already). `ProviderRecord` becomes `ReturnType<typeof selectProviders>[number]`. `rawRecord` is removed; JSON viewers show the provider object.
Test URLs: `/api/get_providers?role=`, `/api/submit_provider`, `/api/delete_provider?provider_id=`, `/api/test_provider?provider_id=`, platform equivalents.
Manual: list, create, edit, delete and connection-test a provider; the same for a platform provider.
Commit: `refactor(providers): use generated React Query hooks`.

#### Task 9: Audit and identity access

Folders: `src/features/platform-administration/audit`, `src/features/platform-administration/identity-access`.
No mutations. Delete `audit/api/accessLogsApi.ts`, `audit/api/accessLogQueryKeys.ts`, `audit/api/schemas/accessLogSchema.ts`, `audit/hooks/useAccessLogs.ts`; in identity access only the backend part: `api/rolesPermissionsQueryKeys.ts`, `hooks/useRolesPermissions.ts`, and `getRolesPermissions*` usage in `api/identityAccessApi.ts` (the Keycloak admin calls in that file stay).
Hooks: `useGetAccessLogs(params, { query: { select: selectAccessLogs } })` where `selectAccessLogs` keeps today's request/raw record derivation from `accessLogsApi.ts`; `useGetRolesPermissions()`.
Test URLs: `/api/get_access_logs`, `/api/get_roles_permissions`.
Manual: open audit with filters; open identity access.
Commit: `refactor(audit,identity-access): use generated React Query hooks`.

#### Task 10: Discovery inventory

Folders: `src/features/discovery-inventory/resources`, `src/features/discovery-inventory/infrastructure`.
No mutations. Delete: `resources/api/{flashSystemInventoryApi,powerInventoryApi,vmStorageVolumesApi,vmwareInventoryApi,vmwareTagsApi,resourceInventoryApi,resourceInventoryQueryKeys}.ts`, `resources/api/schemas/*`, `infrastructure/api/flashSystemVolumeTreeApi.ts`, `infrastructure/api/schemas/*`.
Hooks: `useGetVolumes`, `useGetPowerVm`, `useGetVdisksByVm`, `useGetVmsSearch`-style query for the POST search: Orval generates POST operations as mutations, so add to `abcoQuery.output.override` in `orval.config.ts`: `operations: { vms_search_vms_search_post: { query: { useQuery: true, useMutation: false } } }` (key is the spec `operationId`), regenerate, and use the resulting `usePostVmsSearch(body, { query })` query hook, `useGetTags`, `useGetVolumeTree`.
Mappers stay (real derivations) and move into `select`: `mapFlashSystemInventory`, `mapPowerInventory`, `mapVdisks`, `mapVmwareInventory`, `mapFlashSystemVolumeTreeToTopology`. Their input types change to the generated response types; remove local payload types. `mapFlashSystemVolumeTreeToTopology` narrows `detail` by `kind` with a switch because the patched schema cannot correlate them.
The VM detail keeps not sending `ibm_provider_id` (backend default). `force_refresh` stays a request param.
Test URLs: `/api/get_volumes`, `/api/get_power_vm`, `/api/vdisks_by_vm`, `/api/vms/search`, `/api/tags`, `/api/get_volume_tree`.
Manual: VMware, IBM Power and FlashSystem resources, VM detail snapshots tab, topology view.
Commit: `refactor(discovery-inventory): use generated React Query hooks`.

#### Task 11: Recovery groups

Folder: `src/features/recovery-plans/recovery-groups`.
Invalidation: `{ onMutations: ['submitRecoveryGroup', 'deleteRecoveryGroup', 'rollbackGroupFromOrchestrator'], invalidates: ['getRecoveryGroups'] }`.
Delete: `api/recoveryGroupsApi.ts`, `api/recoveryGroupQueryKeys.ts`, `api/schemas/recoveryGroupsSchema.ts`, `hooks/useRecoveryGroups.ts` (the builder-specific hooks `useRecoveryGroupRelatedVolumes` and `useRecoveryGroupResourceInventory` switch to generated hooks but stay).
Kept derivations: `mapRecoveryGroupApiRecord` (builder/list model: provider resolution, workload type, counts) runs in `select`; `toRecoveryGroupSubmitPayload` returns the generated `RecoveryGroup` (now includes VM metadata via the patch, so no SPEC GAP type). `recoveryGroupsValidation.ts` stays (draft validation). `RollbackReport` comes from `@/generated/query/zod`.
Submit: `useSubmitRecoveryGroup().mutate({ data: toRecoveryGroupSubmitPayload(validated, id), params: { provider_id, push_to_orchestrator } })`; read `orchestration.run_id` from the returned list as today.
Test URLs: `/api/get_recovery_groups`, `/api/submit_recovery_group`, `/api/delete_recovery_group`, `/api/rollback_group_from_orchestrator`, `/api/get_recovery_group_inventory`.
Manual: create a VM group with FlashSystem related storage, edit, delete with rollback.
Commit: `refactor(recovery-groups): use generated React Query hooks`.

#### Task 12: Recovery applications

Folder: `src/features/recovery-plans/recovery-applications`.
Invalidation: `{ onMutations: ['submitRecoveryDag', 'deleteRecoveryApp'], invalidates: ['getRecoveryApps'] }`.
Delete: `api/recoveryApplicationsApi.ts`, `api/recoveryApplicationQueryKeys.ts`, `api/schemas/recoveryApplicationsSchema.ts`, `hooks/useRecoveryApplications.ts`, `hooks/useDeleteRecoveryApplication.ts`.
Kept derivation: `mapRecoveryApplications` in `select`. `requireOrchestratorPush` moves to `model/orchestratorPush.ts` and runs in the submit `onSuccess`.
Inventory: `useGetRecoveryAppInventory({ run_id }, { query: { enabled } })` keeps not sending `compute_provider_id`.
Test URLs: `/api/get_recovery_apps`, `/api/submit_recovery_dag`, `/api/delete_recovery_app`, `/api/get_recovery_app_inventory`.
Manual: create an application, open inventory, delete with rollback.
Commit: `refactor(recovery-applications): use generated React Query hooks`.

#### Task 13: Recovery runs

Folder: `src/features/recovery-plans/recovery-runs`.
No mutations. Delete `api/recoveryRunsQueryKeys.ts` and the `getOrchestratorRuns*` part of `api/recoveryRunsApi.ts` (Airflow DAG link helpers stay).
Hooks: `useGetOrchestratorRuns(params, { query: { select: mapOrchestratorRuns, refetchInterval } })`; the active-run interval (`ACTIVE_RUN_INTERVAL_MS`) and `RECOVERY_RUNS_INTERVAL_MS` pass through `query`.
Test URL: `/api/get_orchestrator_runs`.
Manual: open recovery runs with an active run; it polls.
Commit: `refactor(recovery-runs): use generated React Query hooks`.

---

### Task 14: Remove the old generated output

**Files:**
- Modify: `orval.config.ts` (delete `abcoFetch` and `abcoZod`), `scripts/orval/check-generated.mjs`, `scripts/orval/verify-output.mjs`
- Delete: `src/generated/api/`, `src/shared/api/generatedResponse.ts` only if no import remains (`validatingMutator` uses it, so keep it), any `toOrvalRequestError` export with no importer

- [ ] **Step 1:** `grep -rn "@/generated/api/" src` → no results (every feature migrated). If results remain, migrate them first.
- [ ] **Step 2:** Delete the two Orval projects and `src/generated/api/`; run `npm run api:generate`.
- [ ] **Step 3:** `npx tsc -p tsconfig.app.json --noEmit` → no errors; `npx vitest run src/shared src/features` → only the known Node 26 `localStorage` failures.
- [ ] **Step 4:** Commit `build(api): drop the legacy generated fetch client and zod bundle`.

### Task 15: Guards and CI drift job

**Files:**
- Modify: `eslint.config.js`, `package.json` (`lint` runs the layout check), `.gitlab-ci.yml`
- Create: `scripts/orval/check-feature-layout.mjs`, `scripts/orval/check-feature-layout.test.mjs`

- [ ] **Step 1: ESLint rules** — replace the ADR 0001 block with:

```js
  {
    files: ['src/features/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'zod', message: 'Schemas come from @/generated/query/zod (patch the spec in scripts/orval/specPatches).' },
          { name: '@tanstack/react-query', importNames: ['useQuery', 'useQueries', 'useMutation'], message: 'Use the generated hooks from @/generated/query.' },
        ],
        patterns: [{ group: ['@/generated/api/*'], message: 'The legacy generated client was removed.' }],
      }],
    },
  },
```

`recoveryGroupsValidation.ts` uses `zod` for draft validation: rewrite its `discriminatedUnion` check as a plain lookup table so the rule has no exceptions. Hooks that legitimately combine several generated queries (`useRecoveryGroupRelatedVolumes`) use `useQueries` with `getXQueryOptions`; allow that single file with an `ignores` entry and a comment.

- [ ] **Step 2: Layout check** — `scripts/orval/check-feature-layout.mjs` fails when `src/features/**` contains `*QueryKeys.ts` or an `api/schemas/` folder:

```js
import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'

export function findViolations(root) {
  const violations = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry)
      if (statSync(full).isDirectory()) {
        if (entry === 'schemas' && path.basename(dir) === 'api') violations.push(full)
        else walk(full)
      } else if (/QueryKeys\.tsx?$/.test(entry)) violations.push(full)
    }
  }
  walk(root)
  return violations
}

if (process.argv[1]?.endsWith('check-feature-layout.mjs')) {
  const violations = findViolations('src/features')
  if (violations.length > 0) {
    console.error(`Hand-written API layer files are not allowed:\n${violations.join('\n')}`)
    process.exit(1)
  }
}
```

Test: create a temp dir with `a/api/schemas/x.ts` and `b/fooQueryKeys.ts` and assert both are reported; an empty dir reports nothing.

- [ ] **Step 3: CI drift job** — append to `.gitlab-ci.yml`:

```yaml
api-drift:
  stage: test
  tags: [deploy-abco]
  rules:
    - if: '$CI_PIPELINE_SOURCE == "schedule"'
    - when: manual
      allow_failure: true
  variables:
    BACKEND_URL: http://10.99.99.53:8000
  script:
    - npm ci
    - npm run api:update
    - git diff --exit-code -- openapi/abco-api.json || (echo "Backend OpenAPI changed; run npm run api:update locally." && exit 1)
    - npx tsc -p tsconfig.app.json --noEmit
```

Use the stage name that exists in `.gitlab-ci.yml`; add `stages: [test]` entries only if the file has no matching stage.

- [ ] **Step 4: Verify** — `npm run lint` passes on the migrated code; adding `import { z } from 'zod'` to a feature file fails lint; `node --test scripts/orval/check-feature-layout.test.mjs` passes.
- [ ] **Step 5: Commit** `chore(lint,ci): guard the generated API layer and detect backend spec drift`.

### Task 16: Documentation

**Files:** `docs/adr/0001-orval-single-source-of-api-contract.md` (status: superseded by ADR 0002), create `docs/adr/0002-generated-react-query-api-layer.md`, `docs/api/openapi-spec-gaps.md` (every gap names its patch), `CONTEXT.md` or `README` section "Backend change workflow" with the two commands from the spec.

- [ ] **Step 1:** Write ADR 0002 from the spec's Decisions section, including the mutator-validation finding and the no-`setQueryData` deviation.
- [ ] **Step 2:** `git diff --check`; commit `docs: record the generated React Query API layer`.

---

## Self-review

- Spec coverage: patches (Tasks 1-2), react-query client and tags-split (4), runtime validation (4, via mutator per spike), names (3), backend field names (5-13), caching rules (4, 5-13, Global Constraints), guards and CI (15), migration order and parallel old output (4-14), docs (16). Spec decision 6's `setQueryData` is replaced by invalidation, stated in Spike findings.
- Placeholders: none; slices 6-13 list exact files, hooks, renames, URLs and commit messages.
- Names: `validatingMutator`, `responseSchemas`, `applySpecPatches`/`PATCHES`, `definePatch`, `operationName`, `selectCredentials`, `selectProviders` are defined where first used and used with the same names later.
