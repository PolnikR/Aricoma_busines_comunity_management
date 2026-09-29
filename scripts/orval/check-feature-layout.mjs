import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// The API layer is generated (ADR 0002): features must not grow hand-written
// query-key files or contract schema folders again.
export function findViolations(root) {
  const violations = []
  const walk = (directory) => {
    for (const entry of readdirSync(directory).sort()) {
      const fullPath = path.join(directory, entry)
      if (statSync(fullPath).isDirectory()) {
        if (entry === 'schemas' && path.basename(directory) === 'api') violations.push(fullPath)
        else walk(fullPath)
      } else if (/QueryKeys\.tsx?$/.test(entry)) {
        violations.push(fullPath)
      }
    }
  }
  walk(root)
  return violations
}

const entryPoint = process.argv[1]
if (entryPoint && import.meta.url === pathToFileURL(path.resolve(entryPoint)).href) {
  const violations = findViolations('src/features')
  if (violations.length > 0) {
    process.stderr.write(`Hand-written API layer files are not allowed (see docs/adr/0002-generated-react-query-api-layer.md):\n${violations.join('\n')}\n`)
    process.exitCode = 1
  }
}
