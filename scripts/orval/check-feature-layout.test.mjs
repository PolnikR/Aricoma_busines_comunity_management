import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, test } from 'node:test'
import { findViolations } from './check-feature-layout.mjs'

const temporaryDirectories = []

async function createRoot() {
  const root = await mkdtemp(path.join(tmpdir(), 'abco-feature-layout-'))
  temporaryDirectories.push(root)
  return root
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => (
    rm(directory, { recursive: true, force: true })
  )))
})

test('reports api/schemas folders and query-key files', async () => {
  const root = await createRoot()
  await mkdir(path.join(root, 'a', 'api', 'schemas'), { recursive: true })
  await mkdir(path.join(root, 'b'), { recursive: true })
  await writeFile(path.join(root, 'a', 'api', 'schemas', 'x.ts'), '', 'utf8')
  await writeFile(path.join(root, 'b', 'fooQueryKeys.ts'), '', 'utf8')

  assert.deepEqual(findViolations(root), [
    path.join(root, 'a', 'api', 'schemas'),
    path.join(root, 'b', 'fooQueryKeys.ts'),
  ])
})

test('accepts generated-layer features', async () => {
  const root = await createRoot()
  await mkdir(path.join(root, 'a', 'api'), { recursive: true })
  await mkdir(path.join(root, 'a', 'model', 'schemas'), { recursive: true })
  await writeFile(path.join(root, 'a', 'api', 'recoveryGroupsValidation.ts'), '', 'utf8')
  await writeFile(path.join(root, 'a', 'model', 'selectQueries.ts'), '', 'utf8')

  assert.deepEqual(findViolations(root), [])
})

test('reports nothing for an empty directory', async () => {
  assert.deepEqual(findViolations(await createRoot()), [])
})
