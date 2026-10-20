import type { ReactElement } from 'react'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LanguageContext, type Language } from '@/contexts/LanguageContext'
import en from '@/locales/en.json'
import cs from '@/locales/cs.json'
import sk from '@/locales/sk.json'
import type { RollbackReport } from '../model/recoveryApplicationTypes'
import { RecoveryGroupRollbackResultModal } from '../../recovery-groups/components/RecoveryGroupRollbackResultModal'
import { RecoveryApplicationRollbackResultModal } from './RecoveryApplicationRollbackResultModal'

const catalogs: Record<Language, Record<string, string>> = { en, cs, sk }

function renderInLanguage(ui: ReactElement, language: Language) {
  return render(
    <LanguageContext.Provider
      value={{ language, setLanguage: vi.fn(), translations: catalogs[language] }}
    >
      {ui}
    </LanguageContext.Provider>,
  )
}

// Shared by the application and group modals, so it keeps its literal type.
const completeReport = {
  status: 'ok',
  airflow: {
    status: 'ok',
    dag_id: 'dag_260824110551_7a41cafe',
    dag_file: 'removed',
    dag_record: 'deleted',
  },
  ibm: {
    status: 'ok',
    consistency_groups: ['cg_7a41cafe'],
    fcmaps: [],
    volumes: ['recovery-volume-01'],
    errors: [],
  },
  vcenter: {
    errors: [],
  },
} satisfies RollbackReport

describe('RecoveryApplicationRollbackResultModal', () => {
  it('shows known checks and the complete rollback response', () => {
    renderInLanguage(
      <RecoveryApplicationRollbackResultModal
        open
        onClose={vi.fn()}
        applicationName="Finance Recovery"
        report={completeReport}
      />,
      'en',
    )

    const dialog = screen.getByRole('dialog', { name: 'Recovery application deletion result' })
    expect(within(dialog).getByText('Finance Recovery')).toBeInTheDocument()
    expect(within(dialog).getByText('Orchestrator cleanup report')).toBeInTheDocument()
    expect(within(dialog).getByText('Status')).toBeInTheDocument()
    expect(within(dialog).getByText('Airflow')).toBeInTheDocument()
    expect(within(dialog).getByText('IBM FlashCopy')).toBeInTheDocument()
    expect(within(dialog).getByText('4 / 4 passed')).toBeInTheDocument()
    expect(dialog).toHaveTextContent('"vcenter"')
    expect(dialog).toHaveTextContent('"errors"')
  })

  it('marks successful IBM Power cleanup without ibm.status as passed', () => {
    const report: RollbackReport = {
      status: 'ok',
      airflow: { status: 'ok' },
      compute: { errors: [] },
      ibm: { hosts: [{ host: 'h42e616ff_dr_aix2source', removed: true, unmapped: ['0', '1'] }], errors: [] },
    }
    renderInLanguage(
      <RecoveryApplicationRollbackResultModal open onClose={vi.fn()} applicationName="Power Recovery" report={report} />,
      'sk',
    )
    const dialog = screen.getByRole('dialog', { name: 'Výsledok odstránenia aplikácie obnovy' })
    expect(within(dialog).getByText('4 / 4 passed')).toBeInTheDocument()
    expect(within(dialog).getByText('IBM Power LPAR')).toBeInTheDocument()
    expect(within(dialog).getByText('IBM FlashCopy')).toBeInTheDocument()
    expect(dialog).not.toHaveTextContent('undefined')
  })

  it('shows VMware vCenter errors even when nested objects are absent', () => {
    const report: RollbackReport = {
      status: 'partial',
      airflow: { status: 'ok' },
      vcenter: { errors: ['could not remove datastore'] },
      ibm: { status: 'ok', errors: [] },
    }
    renderInLanguage(
      <RecoveryApplicationRollbackResultModal open onClose={vi.fn()} applicationName="VMware Recovery" report={report} />,
      'en',
    )
    const dialog = screen.getByRole('dialog', { name: 'Recovery application deletion result' })
    expect(within(dialog).getByText('VMware vCenter')).toBeInTheDocument()
    expect(within(dialog).getByText('Deletion partially completed')).toBeInTheDocument()
    expect(within(dialog).getByText('2 / 4 passed')).toBeInTheDocument()
  })

  it.each([
    ['en', 'Recovery application deletion result', 'Recovery group rollback result', 'Orchestrator cleanup report'],
    ['cs', 'Výsledek odstranění aplikace obnovy', 'Výsledek vrácení skupiny obnovy', 'Přehled odstranění prostředků orchestrace'],
    ['sk', 'Výsledok odstránenia aplikácie obnovy', 'Výsledok vrátenia skupiny obnovy', 'Prehľad odstránenia zdrojov orchestrácie'],
  ] as const)(
    'resolves application and group result headings in %s',
    (language, applicationTitle, groupTitle, subtitle) => {
      const applicationView = renderInLanguage(
        <RecoveryApplicationRollbackResultModal
          open
          onClose={vi.fn()}
          applicationName="Finance Recovery"
          report={completeReport}
        />,
        language,
      )

      expect(screen.getByRole('dialog', { name: applicationTitle })).toHaveTextContent(subtitle)
      applicationView.unmount()

      renderInLanguage(
        <RecoveryGroupRollbackResultModal
          open
          onClose={vi.fn()}
          groupName="Database Group"
          report={completeReport}
        />,
        language,
      )

      const groupDialog = screen.getByRole('dialog', { name: groupTitle })
      expect(groupDialog).toHaveTextContent(subtitle)
      expect(groupDialog).not.toHaveTextContent('recoveryGroups.rollback.')
    },
  )
})
