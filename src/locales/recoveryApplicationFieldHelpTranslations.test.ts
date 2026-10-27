import { expect, it } from 'vitest'
import en from './en.json'
import sk from './sk.json'
import cs from './cs.json'

const variants = [
  ...['source', 'target', 'workloads', 'policySet', 'template'].flatMap(field => ['generic', 'vmware', 'ibmPower'].map(platform => `${field}.${platform}`)),
  'tierOrder.generic', 'tierOrder.vmware.v1', 'tierOrder.ibmPower.v1', 'tierOrder.ibmPower.v2', 'email', 'push', 'airflow',
]
const keys = variants.flatMap(variant => ['trigger', 'title', 'intro', 'effect.title', 'effect.text', 'limitations.title', 'limitations.text']
  .map(part => `recoveryApplications.fieldHelp.${variant}.${part}`))

it.each([{ language: 'en', catalog: en }, { language: 'sk', catalog: sk }, { language: 'cs', catalog: cs }])('provides complete application technical help in $language', ({ catalog, language }) => {
  const entries: Record<string, string> = catalog
  const english: Record<string, string> = en
  const sourceTitle = language === 'en' ? 'Source HMC' : 'Zdrojový HMC'
  expect(entries['recoveryApplications.fieldHelp.source.ibmPower.title']).toBe(sourceTitle)
  expect(entries['recoveryApplications.fieldHelp.email.effect.title']).toBe(language === 'en' ? 'Technical effect' : language === 'sk' ? 'Technický účinok' : 'Technický účinek')
  expect(Object.keys(entries).filter(key => key.startsWith('recoveryApplications.fieldHelp.')).sort()).toEqual([...keys].sort())
  for (const key of keys) {
    expect(entries[key]?.trim(), key).toBeTruthy()
    expect(entries[key], key).not.toMatch(/\uFFFD|\p{L}\?\p{L}/u)
    expect(entries[key]?.match(/\{\{[^}]+\}\}/g) ?? [], key).toEqual(english[key]?.match(/\{\{[^}]+\}\}/g) ?? [])
  }
})
