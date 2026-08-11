import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type {
  ProviderCredentialStatus,
  ProviderRecord,
  ProviderType,
} from '@/features/providers-connectors/providers/model/providerTypes'
import { RecoveryGroupProviderStep } from './RecoveryGroupProviderStep'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

function provider(
  id: string,
  type: ProviderType,
  credentialStatus: ProviderCredentialStatus = 'ok',
): ProviderRecord {
  return {
    id,
    name: `${id} name`,
    description: `${id} description`,
    type,
    ipAddress: '10.0.0.1',
    port: 22,
    credentialId: credentialStatus === 'ok' ? `${id}-credential` : null,
    credentialStatus,
  }
}

describe('RecoveryGroupProviderStep', () => {
  it('shows only healthy providers matching the selected workload type', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <RecoveryGroupProviderStep
        workloadType="vmware_virtual_machines"
        providers={[
          provider('vmware-1', 'VMWARE'),
          provider('power-1', 'IBM_POWER'),
          provider('vmware-broken', 'VMWARE', 'missing'),
        ]}
        selectedProviderId={null}
        onSelect={onSelect}
      />,
    )

    expect(screen.getByRole('button', { name: /vmware-1 name/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /power-1 name/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /vmware-broken name/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /vmware-1 name/i }))
    expect(onSelect).toHaveBeenCalledWith('vmware-1')
  })

  it('marks the currently selected provider', () => {
    render(
      <RecoveryGroupProviderStep
        workloadType="ibm_power_virtual_machines"
        providers={[provider('power-1', 'IBM_POWER')]}
        selectedProviderId="power-1"
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /power-1 name/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
