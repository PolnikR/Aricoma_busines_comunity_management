import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { RecoveryGroupProviderStep } from './RecoveryGroupProviderStep'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

it('switches provider discovery help without selecting a provider or changing the form', async () => {
  const onSelect = vi.fn()
  const user = userEvent.setup()
  const providers = [
    { id: 'vmware', name: 'vCenter', type: 'VMWARE' as const, role: 'source' as const, credentialStatus: 'ok' as const },
    { id: 'power', name: 'HMC', type: 'IBM_POWER' as const, role: 'source' as const, credentialStatus: 'ok' as const },
  ]
  const { rerender } = render(<RecoveryGroupProviderStep workloadType="vmware_virtual_machines" selectedProviderId="vmware" providers={providers} onSelect={onSelect} />)
  await user.click(screen.getByRole('button', { name: 'About VMware discovery' }))
  expect(screen.getByRole('dialog')).toHaveTextContent('VMFS NAA')
  await user.keyboard('{Escape}')
  rerender(<RecoveryGroupProviderStep workloadType="ibm_power_virtual_machines" selectedProviderId="power" providers={providers} onSelect={onSelect} />)
  await user.click(screen.getByRole('button', { name: 'About IBM Power discovery' }))
  expect(screen.getByRole('dialog')).toHaveTextContent('VFC WWPN')
  expect(screen.getByRole('dialog')).not.toHaveTextContent('VMFS NAA')
  await user.keyboard('{Escape}')
  rerender(<RecoveryGroupProviderStep workloadType="vmware_virtual_machines" selectedProviderId={null} providers={providers} onSelect={onSelect} />)
  await user.click(screen.getByRole('button', { name: 'About compute discovery' }))
  expect(screen.getByRole('dialog')).toHaveTextContent('compute provider')
  expect(onSelect).not.toHaveBeenCalled()
})
