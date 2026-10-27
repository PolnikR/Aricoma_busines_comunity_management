import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { LanguageContext } from '@/contexts/LanguageContext'
import en from '@/locales/en.json'
import sk from '@/locales/sk.json'
import type { RecoveryAppPolicyRecordOutput } from '@/generated/query/zod'
import { RecoveryAppPolicyModal } from './RecoveryAppPolicyModal'
import { RecoveryAppPoliciesTable } from './RecoveryAppPoliciesTable'

vi.mock('react-router', async importOriginal => ({
  ...await importOriginal<typeof import('react-router')>(),
  useBlocker: () => ({ state: 'unblocked' as const }),
}))

const policy: RecoveryAppPolicyRecordOutput = {
  id: 'help-test', name: 'Help test policy', description: 'Recovery help test.', level: 'high',
  frequency_value: 1, frequency_unit: 'days', retention_value: 1, retention_unit: 'days',
  boot_verify: false, enabled: true, snapshot_selection_mode: 'latest',
  snapshot_max_age_value: 2, snapshot_max_age_unit: 'hours', snapshot_target_time: '02:00',
  target_lpar_prefix: 'dr_', manual_zoning: false, manual_wwpn_entry: false,
  source_shutdown_timeout_seconds: 123, zoning_wait_minutes: 7,
}
const commonParameters = ['level', 'frequency', 'retention', 'boot_verify', 'snapshot_selection_mode', 'enabled', 'target_lpar_prefix', 'manual_zoning', 'manual_wwpn_entry', 'source_shutdown_timeout_seconds', 'zoning_wait_minutes']

describe.each(['en', 'sk'] as const)('Recovery App Policy help in %s', language => {
  it.each(['latest', 'time_range', 'exact_time'] as const)('provides the same localized %s help in Create, Edit and Display', async selection => {
    const translations: Record<string, string> = language === 'en' ? en : sk
    const text = (key: string) => {
      const value = translations[key]
      if (value === undefined) throw new Error(`Missing ${language} translation: ${key}`)
      return value
    }
    const keys = [...commonParameters, ...(selection === 'time_range' ? ['snapshot_max_age'] : selection === 'exact_time' ? ['snapshot_target_time'] : [])]
    for (const mode of ['create', 'edit', 'display']) {
      const visibleKeys = mode === 'display' ? keys : keys.filter(key => key !== 'boot_verify')
      const onClose = vi.fn()
      const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
      const { unmount } = render(
        <LanguageContext.Provider value={{ language, translations, setLanguage: vi.fn() }}>
          <QueryClientProvider client={client}>
            {mode === 'display'
              ? <RecoveryAppPoliciesTable policies={[{ ...policy, snapshot_selection_mode: selection }]} isLoading={false} error={null} isRetrying={false} onRetry={vi.fn()} postDeletePhase="idle" onDeleted={async () => { /* No deletion in this test. */ }} />
              : <RecoveryAppPolicyModal open onClose={onClose} existingPolicies={[]} {...(mode === 'edit' ? { policy: { ...policy, snapshot_selection_mode: selection } } : {})} />}
          </QueryClientProvider>
        </LanguageContext.Provider>,
      )
      if (mode === 'display') await userEvent.click(screen.getByText('Help test policy'))
      if (mode === 'create') fireEvent.change(screen.getByLabelText(text('recoveryAppPolicies.form.snapshotSelection')), { target: { value: selection } })
      const parent = screen.getByRole('dialog')
      const triggers = within(parent).getAllByRole('button').filter(button => button.hasAttribute('aria-haspopup'))
      expect(triggers).toHaveLength(visibleKeys.length + (mode === 'display' ? 1 : 0))
      for (const parameter of visibleKeys) {
        const key = `recoveryAppPolicies.fieldHelp.${parameter}`
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
        expect(within(parent).getByRole('button', { name: text('recoveryAppPolicies.help.trigger') })).toBeInTheDocument()
        expect(within(parent).getByText(text(`recoveryAppPolicies.selection.${selection}`))).toBeInTheDocument()
      } else {
        expect(screen.getByLabelText(text('recoveryAppPolicies.form.frequency'))).toHaveValue(1)
        expect(screen.queryByRole('checkbox', { name: text('recoveryAppPolicies.form.bootVerify') })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: text('recoveryAppPolicies.fieldHelp.boot_verify.trigger') })).not.toBeInTheDocument()
        for (const label of ['enabled', 'manualZoning', 'manualWwpnEntry']) {
          expect(screen.getByRole('checkbox', { name: text(`recoveryAppPolicies.form.${label}`) })).toHaveProperty('checked', label === 'enabled')
        }
        // An unchanged edit must close without a dirty confirmation after visiting all helps.
        if (mode === 'edit') {
          await userEvent.click(screen.getByRole('button', { name: text('buttons.cancel') }))
          expect(onClose).toHaveBeenCalledOnce()
        }
      }
      unmount()
    }
  }, 30000)
})
