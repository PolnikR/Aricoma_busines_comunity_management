import { randomUUID } from 'node:crypto'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { EXTERNAL_SERVICES } from '../../src/config/externalServices.ts'

export const DEFAULT_OPENAPI_URL = EXTERNAL_SERVICES.openApi.sourceUrl

const DEFAULT_OUTPUT_PATH = path.resolve('openapi/abco-api.json')
const DEFAULT_TIMEOUT_MS = 30_000

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function validateOpenApiDocument(document) {
  if (!isRecord(document)) {
    throw new Error('Invalid OpenAPI document: root must be an object.')
  }
  if (typeof document.openapi !== 'string' || !document.openapi.startsWith('3.')) {
    throw new Error('Invalid OpenAPI document: openapi must declare version 3.x.')
  }
  if (!isRecord(document.paths) || Object.keys(document.paths).length === 0) {
    throw new Error('Invalid OpenAPI document: paths must be a non-empty object.')
  }
  if (!isRecord(document.info)) {
    throw new Error('Invalid OpenAPI document: info must be an object.')
  }

  return document
}

export function resolveOpenApiUrl(environment = process.env) {
  const configuredUrl = environment.ABCO_OPENAPI_URL?.trim() || DEFAULT_OPENAPI_URL
  let url

  try {
    url = new URL(configuredUrl)
  } catch (error) {
    throw new Error(`Invalid ABCO_OPENAPI_URL: ${configuredUrl}`, { cause: error })
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('ABCO_OPENAPI_URL must use HTTP or HTTPS.')
  }

  return url.toString()
}

async function writeSnapshotAtomically(outputPath, contents) {
  const directory = path.dirname(outputPath)
  const temporaryPath = path.join(directory, `.${path.basename(outputPath)}.${randomUUID()}.tmp`)
  await mkdir(directory, { recursive: true })

  try {
    await writeFile(temporaryPath, contents, 'utf8')
    await rename(temporaryPath, outputPath)
  } finally {
    await rm(temporaryPath, { force: true })
  }
}

export async function pullOpenApiSnapshot({
  sourceUrl = resolveOpenApiUrl(),
  outputPath = DEFAULT_OUTPUT_PATH,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const response = await fetchImpl(sourceUrl, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!response.ok) {
    const statusText = response.statusText ? ` ${response.statusText}` : ''
    throw new Error(`OpenAPI download failed with HTTP ${String(response.status)}${statusText}.`)
  }

  const responseBody = await response.text()
  let document

  try {
    document = JSON.parse(responseBody)
  } catch (error) {
    throw new Error('OpenAPI download did not contain valid JSON.', { cause: error })
  }

  validateOpenApiDocument(document)
  await writeSnapshotAtomically(outputPath, `${JSON.stringify(document, null, 2)}\n`)

  return {
    outputPath,
    pathCount: Object.keys(document.paths).length,
    sourceUrl,
  }
}

function isCommandLineEntryPoint() {
  const entryPoint = process.argv[1]
  return entryPoint !== undefined
    && import.meta.url === pathToFileURL(path.resolve(entryPoint)).href
}

if (isCommandLineEntryPoint()) {
  pullOpenApiSnapshot()
    .then(({ outputPath, pathCount, sourceUrl }) => {
      process.stdout.write(`Updated ${outputPath} from ${sourceUrl} (${String(pathCount)} paths).\n`)
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      process.stderr.write(`OpenAPI pull failed: ${message}\n`)
      process.exitCode = 1
    })
}
