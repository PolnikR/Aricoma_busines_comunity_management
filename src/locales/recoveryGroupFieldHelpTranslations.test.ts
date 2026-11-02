import { expect, it } from 'vitest'
import en from './en.json'
import sk from './sk.json'
import cs from './cs.json'

const keys = Object.keys(en).filter(key => key.startsWith('recoveryGroups.fieldHelp.'))
it.each([{ language: 'en', catalog: en }, { language: 'sk', catalog: sk }, { language: 'cs', catalog: cs }])('provides complete technical field help in $language', ({ catalog }) => {
  const entries: Record<string, string> = catalog
  expect(Object.keys(entries).filter(key => key.startsWith('recoveryGroups.fieldHelp.')).sort()).toEqual([...keys].sort())
  for (const key of keys) expect(entries[key]?.trim(), key).toBeTruthy()
  for (const field of ['email', 'targetPool', 'topology', 'volumes', 'policySet', 'orchestration', 'compute.generic', 'compute.vmware', 'compute.ibmPower']) {
    for (const part of ['trigger', 'title', 'intro']) expect(entries[`recoveryGroups.fieldHelp.${field}.${part}`]).toBeTruthy()
  }
  expect(keys.some(key => /\.(id|name|description)\./i.test(key))).toBe(false)
})
