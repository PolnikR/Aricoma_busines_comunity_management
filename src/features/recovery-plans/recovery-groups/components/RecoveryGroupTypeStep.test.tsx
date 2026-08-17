import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type {
  ProviderCredentialStatus,
  ProviderRecord,
  ProviderType,
} from '@/features/providers-connectors/providers/model/providerTypes'
import { RecoveryGroupTypeStep } from './RecoveryGroupTypeStep'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

function provider(
  id: string,
  type: ProviderType,
  credentialStatus: ProviderCredentialStatus = 'ok',
): ProviderRecord {
  return {
    id,
    name: id,
    description: `${id} description`,
    type,
    ipAddress: '10.0.0.1',
    credentialId: credentialStatus === 'ok' ? `${id}-credential` : null,
    credentialStatus,
  }
}

const availableProviders = [
  provider('vmware-1', 'VMWARE'),
  provider('vmware-2', 'VMWARE'),
  provider('power-1', 'IBM_POWER'),
  provider('flash-1', 'FLASHCOPY'),
]

describe('RecoveryGroupTypeStep', () => {
  it('shows one compute card per healthy supported provider type', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <RecoveryGroupTypeStep
        providers={availableProviders}
        isLoadingProviders={false}
        providerError={null}
        onRetryProviders={vi.fn()}
        sourceCategory="backup_system_workload"
        selected={null}
        onCategoryChange={vi.fn()}
        onSelect={onSelect}
      />,
    )

    expect(screen.getAllByRole('button', { name: /VMware virtual machines/i })).toHaveLength(1)
    expect(screen.getByRole('button', { name: /IBM Power virtual machines/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Oracle databases/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /IBM Power virtual machines/i }))
    expect(onSelect).toHaveBeenCalledWith(
      'backup_system_workload',
      'ibm_power_virtual_machines',
      'vm',
    )
  })

  it('does not show a card backed only by a provider with unavailable credentials', () => {
    render(
      <RecoveryGroupTypeStep
        providers={[
          provider('vmware-missing', 'VMWARE', 'missing'),
          provider('power-none', 'IBM_POWER', 'none'),
          provider('flash-1', 'FLASHCOPY'),
        ]}
        isLoadingProviders={false}
        providerError={null}
        onRetryProviders={vi.fn()}
        sourceCategory="backup_system_workload"
        selected={null}
        onCategoryChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: /VMware virtual machines/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /IBM Power virtual machines/i })).not.toBeInTheDocument()
    expect(screen.getByText('No resource types available')).toBeInTheDocument()
  })

  it('opens the first available category when compute providers are unavailable', () => {
    render(
      <RecoveryGroupTypeStep
        providers={[provider('flash-1', 'FLASHCOPY')]}
        isLoadingProviders={false}
        providerError={null}
        onRetryProviders={vi.fn()}
        sourceCategory={null}
        selected={null}
        onCategoryChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByRole('tab', { name: 'Storage systems' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('button', { name: /IBM FlashSystem/i })).toBeInTheDocument()
  })

  it('switches to storage systems and selects IBM FlashSystem volumes', async () => {
    const user = userEvent.setup()
    const onCategoryChange = vi.fn()
    const onSelect = vi.fn()
    const { rerender } = render(
      <RecoveryGroupTypeStep
        providers={availableProviders}
        isLoadingProviders={false}
        providerError={null}
        onRetryProviders={vi.fn()}
        sourceCategory="backup_system_workload"
        selected={null}
        onCategoryChange={onCategoryChange}
        onSelect={onSelect}
      />,
    )

    await user.click(screen.getByRole('tab', { name: 'Storage systems' }))
    expect(onCategoryChange).toHaveBeenCalledWith('storage_system')

    rerender(
      <RecoveryGroupTypeStep
        providers={availableProviders}
        isLoadingProviders={false}
        providerError={null}
        onRetryProviders={vi.fn()}
        sourceCategory="storage_system"
        selected={null}
        onCategoryChange={onCategoryChange}
        onSelect={onSelect}
      />,
    )
    await user.click(screen.getByRole('button', { name: /IBM FlashSystem/i }))

    expect(onSelect).toHaveBeenCalledWith('storage_system', 'ibm_flashsystem', 'volume')
  })
})
