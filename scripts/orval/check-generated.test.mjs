import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, test } from 'node:test'
import {
  assertGeneratedApiIsCurrent,
  findDirectoryDifferences,
} from './check-generated.mjs'

const temporaryDirectories = []

async function createDirectories() {
  const root = await mkdtemp(path.join(tmpdir(), 'abco-orval-check-'))
  temporaryDirectories.push(root)
  const expected = path.join(root, 'expected')
  const actual = path.join(root, 'actual')
  await Promise.all([
    mkdir(path.join(expected, 'models'), { recursive: true }),
    mkdir(path.join(actual, 'models'), { recursive: true }),
  ])
  return { actual, expected }
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => (
    rm(directory, { recursive: true, force: true })
  )))
})

test('findDirectoryDifferences reports added, removed, and modified files', async () => {
  const { actual, expected } = await createDirectories()
  await Promise.all([
    writeFile(path.join(expected, 'stable.ts'), 'same', 'utf8'),
    writeFile(path.join(actual, 'stable.ts'), 'same', 'utf8'),
    writeFile(path.join(expected, 'models', 'changed.ts'), 'before', 'utf8'),
    writeFile(path.join(actual, 'models', 'changed.ts'), 'after', 'utf8'),
    writeFile(path.join(expected, 'removed.ts'), 'removed', 'utf8'),
    writeFile(path.join(actual, 'added.ts'), 'added', 'utf8'),
  ])

  assert.deepEqual(await findDirectoryDifferences(expected, actual), {
    added: ['added.ts'],
    modified: ['models/changed.ts'],
    removed: ['removed.ts'],
  })
})

test('assertGeneratedApiIsCurrent accepts identical generated output', async () => {
  const { actual } = await createDirectories()
  await writeFile(path.join(actual, 'client.ts'), 'generated', 'utf8')

  await assert.doesNotReject(assertGeneratedApiIsCurrent({
    generate: async () => undefined,
    generatedDirectory: actual,
  }))
})

test('assertGeneratedApiIsCurrent rejects output changed by generation', async () => {
  const { actual } = await createDirectories()
  const clientPath = path.join(actual, 'client.ts')
  await writeFile(clientPath, 'before', 'utf8')

  await assert.rejects(
    assertGeneratedApiIsCurrent({
      generate: async () => writeFile(clientPath, 'after', 'utf8'),
      generatedDirectory: actual,
    }),
    /modified: client\.ts/,
  )
})

test('assertGeneratedApiIsCurrent restores the working tree even when it rejects', async () => {
  const { actual } = await createDirectories()
  const clientPath = path.join(actual, 'client.ts')
  await writeFile(clientPath, 'before', 'utf8')

  await assert.rejects(
    assertGeneratedApiIsCurrent({
      generate: async () => writeFile(clientPath, 'after', 'utf8'),
      generatedDirectory: actual,
    }),
  )

  assert.equal(await readFile(clientPath, 'utf8'), 'before')
})

test('assertGeneratedApiIsCurrent restores files added by generation', async () => {
  const { actual } = await createDirectories()
  const stalePath = path.join(actual, 'stale.ts')
  await writeFile(stalePath, 'stale', 'utf8')

  await assert.rejects(
    assertGeneratedApiIsCurrent({
      generate: async () => writeFile(path.join(actual, 'new.ts'), 'new', 'utf8'),
      generatedDirectory: actual,
    }),
  )

  assert.equal(await readFile(stalePath, 'utf8'), 'stale')
  await assert.rejects(readFile(path.join(actual, 'new.ts'), 'utf8'))
})
