import type { ReactElement } from 'react'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LanguageContext, type Language } from '@/contexts/LanguageContext'
import en from '@/locales/en.json'
import cs from '@/locales/cs.json'
import sk from '@/locales/sk.json'
import type { RollbackReport } from '../api/schemas/recoveryApplicationsSchema'
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

const completeReport: RollbackReport = {
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
  vmware: {
    status: 'ok',
    removed_vms: ['finance-db-01'],
  },
}

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
    expect(within(dialog).getByText('3 / 3 passed')).toBeInTheDocument()
    expect(dialog).toHaveTextContent('"vmware"')
    expect(dialog).toHaveTextContent('"removed_vms"')
    expect(dialog).toHaveTextContent('"finance-db-01"')
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
