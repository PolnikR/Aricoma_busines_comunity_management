import { spawn } from 'node:child_process'
import { cp, mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const DEFAULT_GENERATED_DIRECTORY = path.resolve('src/generated/api')

async function listFiles(directory, relativeDirectory = '') {
  const entries = await readdir(path.join(directory, relativeDirectory), {
    withFileTypes: true,
  })
  const files = []

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relativePath = path.join(relativeDirectory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await listFiles(directory, relativePath))
    } else if (entry.isFile()) {
      files.push(relativePath.split(path.sep).join('/'))
    }
  }

  return files
}

export async function findDirectoryDifferences(expectedDirectory, actualDirectory) {
  const [expectedFiles, actualFiles] = await Promise.all([
    listFiles(expectedDirectory),
    listFiles(actualDirectory),
  ])
  const expectedSet = new Set(expectedFiles)
  const actualSet = new Set(actualFiles)
  const sharedFiles = expectedFiles.filter(file => actualSet.has(file))
  const modified = []

  for (const file of sharedFiles) {
    const [expected, actual] = await Promise.all([
      readFile(path.join(expectedDirectory, file)),
      readFile(path.join(actualDirectory, file)),
    ])
    if (!expected.equals(actual)) modified.push(file)
  }

  return {
    added: actualFiles.filter(file => !expectedSet.has(file)),
    modified,
    removed: expectedFiles.filter(file => !actualSet.has(file)),
  }
}

function runApiGenerate() {
  const npmEntryPoint = process.env.npm_execpath
  const command = npmEntryPoint ? process.execPath : process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const args = npmEntryPoint
    ? [npmEntryPoint, 'run', 'api:generate']
    : ['run', 'api:generate']

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: !npmEntryPoint && process.platform === 'win32',
      stdio: 'inherit',
    })
    child.once('error', reject)
    child.once('exit', (exitCode) => {
      if (exitCode === 0) resolve()
      else reject(new Error(`API generation exited with code ${String(exitCode)}.`))
    })
  })
}

function formatDifferences(differences) {
  return Object.entries(differences)
    .flatMap(([kind, files]) => files.map(file => `${kind}: ${file}`))
    .join('\n')
}

export async function assertGeneratedApiIsCurrent({
  generate = runApiGenerate,
  generatedDirectory = DEFAULT_GENERATED_DIRECTORY,
} = {}) {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'abco-orval-generated-'))
  const expectedDirectory = path.join(temporaryDirectory, 'api')

  try {
    await cp(generatedDirectory, expectedDirectory, { recursive: true })
    await generate()
    const differences = await findDirectoryDifferences(expectedDirectory, generatedDirectory)
    const details = formatDifferences(differences)
    if (details) {
      throw new Error(
        `Generated API is not synchronized with the OpenAPI snapshot:\n${details}`,
      )
    }
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
}

function isCommandLineEntryPoint() {
  const entryPoint = process.argv[1]
  return entryPoint !== undefined
    && import.meta.url === pathToFileURL(path.resolve(entryPoint)).href
}

if (isCommandLineEntryPoint()) {
  assertGeneratedApiIsCurrent().catch((error) => {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  })
}
