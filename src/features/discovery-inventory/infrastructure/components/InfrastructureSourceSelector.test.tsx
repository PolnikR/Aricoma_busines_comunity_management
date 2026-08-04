import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { InfrastructureSourceSelector } from './InfrastructureSourceSelector'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const providers: ProviderRecord[] = [
  { id: 'power-01', name: 'Production Power', description: '', type: 'IBM_POWER', ipAddress: '', credentialId: null, credentialStatus: 'ok' },
  { id: 'power-02', name: 'DR Power', description: '', type: 'IBM_POWER', ipAddress: '', credentialId: null, credentialStatus: 'ok' },
]

describe('InfrastructureSourceSelector', () => {
  it('changes platform and selected provider through labelled controls', async () => {
    const user = userEvent.setup()
    const onPlatformChange = vi.fn()
    const onProviderChange = vi.fn()

    render(
      <InfrastructureSourceSelector
        platform="ibm-power"
        providers={providers}
        providerId="power-01"
        onPlatformChange={onPlatformChange}
        onProviderChange={onProviderChange}
      />,
    )

    await user.selectOptions(screen.getByLabelText('Platform'), 'vmware')
    await user.selectOptions(screen.getByLabelText('Provider'), 'power-02')

    expect(onPlatformChange).toHaveBeenCalledWith('vmware')
    expect(onProviderChange).toHaveBeenCalledWith('power-02')
  })

  it('disables provider selection when the platform has no providers', () => {
    render(
      <InfrastructureSourceSelector
        platform="ibm-power"
        providers={[]}
        providerId=""
        onPlatformChange={vi.fn()}
        onProviderChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Provider')).toBeDisabled()
    expect(screen.getByText('No compatible providers')).toBeInTheDocument()
  })
})
