import { render, screen, within } from '@testing-library/react'
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
  scope: Pick<ProviderRecord, 'vmPrefix' | 'vmTags'> = {},
): ProviderRecord {
  return {
    id,
    name: `${id} name`,
    description: `${id} description`,
    type,
    role: 'source',
    ipAddress: '10.0.0.1',
    credentialId: credentialStatus === 'ok' ? `${id}-credential` : null,
    credentialStatus,
    ...scope,
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

describe('RecoveryGroupProviderStep provider scope', () => {
  function renderProvider(type: ProviderType, scope: Pick<ProviderRecord, 'vmPrefix' | 'vmTags'>) {
    render(
      <RecoveryGroupProviderStep
        workloadType={type === 'VMWARE' ? 'vmware_virtual_machines' : 'ibm_power_virtual_machines'}
        providers={[provider('p1', type, 'ok', scope)]}
        selectedProviderId={null}
        onSelect={vi.fn()}
      />,
    )
    return screen.getByRole('button', { name: /p1 name/i })
  }

  it('shows the decorative filter icon with VM name prefix and VM tag chips', () => {
    const card = renderProvider('VMWARE', { vmPrefix: 'TEST-', vmTags: ['WEB'] })
    const scope = within(card).getByTestId('provider-scope')

    expect(within(scope).getByText('VM name')).toBeInTheDocument()
    expect(within(scope).getByText('TEST-*')).toBeInTheDocument()
    expect(within(scope).getByText('VM tag')).toBeInTheDocument()
    expect(within(scope).getByText('WEB')).toBeInTheDocument()
    const icon = within(scope).getByTestId('provider-scope-icon')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon.closest('button')).toBe(card)
    expect(within(scope).queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows only the prefix chip when the provider has no tags', () => {
    const card = renderProvider('VMWARE', { vmPrefix: 'TEST-', vmTags: [] })

    expect(within(card).getByText('TEST-*')).toBeInTheDocument()
    expect(within(card).queryByText('VM tag')).not.toBeInTheDocument()
  })

  it('shows only the tag chip when the provider has no prefix', () => {
    const card = renderProvider('VMWARE', { vmPrefix: null, vmTags: ['WEB'] })

    expect(within(card).getByText('WEB')).toBeInTheDocument()
    expect(within(card).queryByText('VM name')).not.toBeInTheDocument()
  })

  it.each([
    ['no scope', { vmPrefix: null, vmTags: [] }],
    ['whitespace-only values', { vmPrefix: '   ', vmTags: ['  ', ''] }],
  ] as const)('renders no supporting content and no icon for %s', (_, scope) => {
    const card = renderProvider('VMWARE', { vmPrefix: scope.vmPrefix, vmTags: [...scope.vmTags] })

    expect(within(card).queryByTestId('provider-scope')).not.toBeInTheDocument()
    expect(within(card).queryByTestId('provider-scope-icon')).not.toBeInTheDocument()
  })

  it('trims whitespace around scope values', () => {
    const card = renderProvider('VMWARE', { vmPrefix: ' TEST- ', vmTags: [' ', ' WEB '] })

    expect(within(card).getByText('TEST-*')).toBeInTheDocument()
    expect(within(card).getByText('WEB')).toBeInTheDocument()
  })

  it('collapses additional tags into +N that explains only the first tag filters VMs', () => {
    const card = renderProvider('VMWARE', { vmTags: ['WEB', ' ', 'DB', 'APP'] })
    const explanation = '2 additional configured tags; only the first tag is used for VM filtering.'

    expect(within(card).getByText('WEB')).toBeInTheDocument()
    expect(within(card).queryByText('DB')).not.toBeInTheDocument()
    expect(within(card).getByText('+2')).toHaveAttribute('aria-hidden', 'true')
    expect(within(card).getByTitle(explanation)).toHaveTextContent('+2')
    expect(card).toHaveAccessibleName(expect.stringContaining(explanation))
  })

  it('shows the IBM Power name prefix but never a tag chip', () => {
    const card = renderProvider('IBM_POWER', { vmPrefix: 'TEST-', vmTags: ['WEB', 'DB'] })

    expect(within(card).getByText('TEST-*')).toBeInTheDocument()
    expect(within(card).queryByText('VM tag')).not.toBeInTheDocument()
    expect(within(card).queryByText('WEB')).not.toBeInTheDocument()
    expect(within(card).queryByText(/\+\d/)).not.toBeInTheDocument()
  })

  it('renders no scope for an IBM Power provider that only has tags', () => {
    const card = renderProvider('IBM_POWER', { vmPrefix: null, vmTags: ['WEB'] })

    expect(within(card).queryByTestId('provider-scope')).not.toBeInTheDocument()
  })
})
