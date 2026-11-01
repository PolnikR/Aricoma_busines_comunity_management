import { expect, it } from 'vitest'
import en from './en.json'
import sk from './sk.json'
import cs from './cs.json'

const fields = ['templateLabel', 'templateDefault', 'templateDefaultUnavailable', 'templateSelectPlatform',
  'templateUnavailable', 'templateEmpty', 'templateInvalidDefault', 'templateLoading', 'templateUnverified',
  'templateUnknown', 'configured', 'deployed', 'backendDefault', 'unknown', 'notDeployed']
it.each([{ language: 'en', catalog: en }, { language: 'sk', catalog: sk }, { language: 'cs', catalog: cs }])(
  'provides complete DAG version UI and help in $language', ({ catalog }) => {
    const entries: Record<string, string> = catalog
    for (const field of fields) expect(entries[`recoveryGroups.dagTemplate.${field}`]?.trim(), field).toBeTruthy()
    for (const [key, value] of Object.entries(entries).filter(([key]) => key.startsWith('recoveryGroups.dagTemplate.') || key.startsWith('recoveryGroups.fieldHelp.template.'))) {
      expect(value, key).not.toMatch(/[?\uFFFD]/)
    }
    for (const part of ['trigger', 'title', 'intro', 'effect.title', 'effect.text', 'limitations.title', 'limitations.text']) {
      expect(entries[`recoveryGroups.fieldHelp.template.${part}`]?.trim(), part).toBeTruthy()
    }
    for (const field of ['templateDefault', 'templateUnknown']) {
      expect(entries[`recoveryGroups.dagTemplate.${field}`]).toContain('{{version}}')
    }
  },
)
