import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { LanguageContext } from '@/contexts/LanguageContext'
import en from '@/locales/en.json'
import sk from '@/locales/sk.json'
import type { SnapshotPolicyRecordOutput } from '@/generated/query/zod'
import { SnapshotPolicyModal } from './SnapshotPolicyModal'
import { SnapshotPoliciesTable } from './SnapshotPoliciesTable'

vi.mock('react-router', async importOriginal => ({
  ...await importOriginal<typeof import('react-router')>(),
  useBlocker: () => ({ state: 'unblocked' as const }),
}))

const policy: SnapshotPolicyRecordOutput = {
  id: 'help-test', name: 'Help test policy', description: 'A policy for help tests.', level: 'high',
  frequency_value: 15, frequency_unit: 'minutes', retention_value: 1, retention_unit: 'days',
  max_snapshots: null, flashcopy_copy_rate: 0, enabled: true,
}
const parameters = ['level', 'frequency', 'maxSnapshots', 'retention', 'flashcopyCopyRate', 'enabled']

describe.each(['en', 'sk'] as const)('Snapshot Policy parameter help in %s', language => {
  it.each(['create', 'edit', 'display'] as const)('opens the same six localized explanations in %s', async mode => {
    const translations: Record<string, string> = language === 'en' ? en : sk
    const text = (key: string) => {
      const value = translations[key]
      if (value === undefined) throw new Error(`Missing ${language} translation: ${key}`)
      return value
    }
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    render(
      <LanguageContext.Provider value={{ language, translations, setLanguage: vi.fn() }}>
        <QueryClientProvider client={client}>
          {mode === 'display'
            ? <SnapshotPoliciesTable policies={[policy]} isLoading={false} error={null} isRetrying={false} onRetry={vi.fn()} postDeletePhase="idle" onDeleted={async () => { /* No deletion in this test. */ }} />
            : <SnapshotPolicyModal open onClose={vi.fn()} existingPolicies={[]} {...(mode === 'edit' ? { policy } : {})} />}
        </QueryClientProvider>
      </LanguageContext.Provider>,
    )
    if (mode === 'display') await userEvent.click(screen.getByText('Help test policy'))
    const parent = screen.getByRole('dialog')
    const helpTriggers = within(parent).getAllByRole('button').filter(button => button.hasAttribute('aria-haspopup'))
    expect(helpTriggers).toHaveLength(mode === 'display' ? 7 : 6)
    for (const parameter of parameters) {
      const key = `snapshotPolicies.fieldHelp.${parameter}`
      const trigger = within(parent).getByRole('button', { name: text(`${key}.trigger`) })
      expect(trigger.closest('label')).toBeNull()
      if (mode === 'display') expect(trigger.closest('dt')).not.toBeNull()
      await userEvent.click(trigger)
      const help = screen.getByRole('dialog', { name: text(`${key}.title`) })
      expect(help).toHaveTextContent(text(`${key}.intro`))
      expect(help).not.toHaveTextContent(/default|predvolen/i)
      await userEvent.keyboard('{Escape}')
      expect(parent).toBeInTheDocument()
      expect(trigger).toHaveFocus()
    }
    if (mode === 'display') {
      expect(within(parent).getByRole('button', { name: text('snapshotPolicies.help.trigger') })).toBeInTheDocument()
    } else {
      expect(screen.getByLabelText(text('snapshotPolicies.form.frequency'))).toHaveValue(15)
      fireEvent.change(screen.getByLabelText(text('snapshotPolicies.form.frequencyUnit')), { target: { value: 'hours' } })
      expect(screen.getByLabelText(text('snapshotPolicies.form.frequency'))).toHaveValue(null)
    }
  })
})
