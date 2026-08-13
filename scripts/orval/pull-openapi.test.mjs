import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, test } from 'node:test'
import {
  DEFAULT_OPENAPI_URL,
  pullOpenApiSnapshot,
  resolveOpenApiUrl,
} from './pull-openapi.mjs'

const temporaryDirectories = []

async function createSnapshotPath() {
  const directory = await mkdtemp(path.join(tmpdir(), 'abco-openapi-'))
  temporaryDirectories.push(directory)
  return path.join(directory, 'abco-api.json')
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => (
    rm(directory, { recursive: true, force: true })
  )))
})

test('pullOpenApiSnapshot writes a validated and formatted OpenAPI document', async () => {
  const outputPath = await createSnapshotPath()
  const document = {
    openapi: '3.1.0',
    info: { title: 'ABCo API', version: '0.2.0' },
    paths: { '/health': { get: { responses: { 200: { description: 'OK' } } } } },
  }

  const result = await pullOpenApiSnapshot({
    outputPath,
    sourceUrl: 'https://backend.example.test/openapi.json',
    fetchImpl: async () => new Response(JSON.stringify(document), { status: 200 }),
  })

  assert.deepEqual(JSON.parse(await readFile(outputPath, 'utf8')), document)
  assert.equal((await readFile(outputPath, 'utf8')).endsWith('\n'), true)
  assert.deepEqual(result, {
    outputPath,
    pathCount: 1,
    sourceUrl: 'https://backend.example.test/openapi.json',
  })
})

test('pullOpenApiSnapshot preserves the existing snapshot when validation fails', async () => {
  const outputPath = await createSnapshotPath()
  const originalSnapshot = '{"openapi":"3.1.0","paths":{"/existing":{}}}\n'
  await writeFile(outputPath, originalSnapshot, 'utf8')

  await assert.rejects(
    pullOpenApiSnapshot({
      outputPath,
      sourceUrl: 'https://backend.example.test/openapi.json',
      fetchImpl: async () => new Response(JSON.stringify({ openapi: '3.1.0', paths: [] }), { status: 200 }),
    }),
    /paths must be a non-empty object/,
  )

  assert.equal(await readFile(outputPath, 'utf8'), originalSnapshot)
})

test('pullOpenApiSnapshot preserves the existing snapshot after an HTTP failure', async () => {
  const outputPath = await createSnapshotPath()
  const originalSnapshot = '{"openapi":"3.1.0","paths":{"/existing":{}}}\n'
  await writeFile(outputPath, originalSnapshot, 'utf8')

  await assert.rejects(
    pullOpenApiSnapshot({
      outputPath,
      sourceUrl: 'https://backend.example.test/openapi.json',
      fetchImpl: async () => new Response('unavailable', { status: 503, statusText: 'Service Unavailable' }),
    }),
    /OpenAPI download failed with HTTP 503 Service Unavailable/,
  )

  assert.equal(await readFile(outputPath, 'utf8'), originalSnapshot)
})

test('resolveOpenApiUrl uses an environment override and rejects non-HTTP protocols', () => {
  assert.equal(
    resolveOpenApiUrl({ ABCO_OPENAPI_URL: 'https://backend.example.test/openapi.json' }),
    'https://backend.example.test/openapi.json',
  )
  assert.equal(resolveOpenApiUrl({}), DEFAULT_OPENAPI_URL)
  assert.throws(
    () => resolveOpenApiUrl({ ABCO_OPENAPI_URL: 'file:///tmp/openapi.json' }),
    /must use HTTP or HTTPS/,
  )
})
