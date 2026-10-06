import { describe, expect, it } from 'vitest'
import en from './en.json'
import cs from './cs.json'
import sk from './sk.json'

const catalogs: Record<string, Record<string, string>> = { en, cs, sk }

// Labels of the Recovery Application JSON checklist (RecoveryApplicationsTable).
const checklistKeys = [
  'recovery.modal.applicationId',
  'recovery.modal.airflowRunId',
  'recovery.modal.pushToOrchestrator',
]

describe('recovery modal translations', () => {
  it('provides the JSON checklist labels in every locale', () => {
    for (const [locale, catalog] of Object.entries(catalogs)) {
      for (const key of checklistKeys) {
        expect(catalog[key]?.trim(), `${locale}: ${key}`).toBeTruthy()
      }
    }
  })
})
