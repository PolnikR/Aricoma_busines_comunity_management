import { existsSync, readFileSync } from 'node:fs'

const snapshotPath = 'openapi/abco-api.json'
const generatedFiles = [
  'src/generated/api/client.gen.ts',
  'src/generated/api/zod.gen.ts',
]

const snapshot = readFileSync(snapshotPath, 'utf8')
if (!snapshot.includes('"/credentials/pubkey"')) {
  throw new Error('The OpenAPI snapshot must retain /credentials/pubkey for documentation.')
}

for (const file of generatedFiles) {
  if (!existsSync(file)) {
    throw new Error(`Missing generated Orval output: ${file}`)
  }
}

const client = readFileSync(generatedFiles[0], 'utf8')
if (/pubkey/i.test(client)) {
  throw new Error('The generated client must not contain the excluded /credentials/pubkey operation.')
}
