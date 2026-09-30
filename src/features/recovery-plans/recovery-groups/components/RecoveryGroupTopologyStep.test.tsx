import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RecoveryGroupTopologyStep } from './RecoveryGroupTopologyStep'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
const source = { id: 'source', name: 'Source FS', type: 'FLASHCOPY' as const, role: 'source' as const, credentialStatus: 'ok' as const, partnerProviderId: 'target' }
const props = { providers: [source, { ...source, id: 'target', name: 'Target FS', role: 'target' as const }], isLoading: false, error: null, onRetry: vi.fn(), onChange: vi.fn() }

describe('RecoveryGroupTopologyStep', () => {
  it('uses shared selects and emits Local/Metro changes, excluding invalid providers', async () => {
    render(<RecoveryGroupTopologyStep {...props} providers={[source, { ...source, id: 'bad', name: 'Bad FS', credentialStatus: 'missing' }]} draft={{ topology: 'local', relatedVolumeProviderId: 'source' }} />)
    expect(screen.queryByRole('option', { name: 'Bad FS' })).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('Target FS')).not.toBeInTheDocument()
    await userEvent.setup().selectOptions(screen.getByLabelText('Topology mode'), 'metro_mirror')
    expect(props.onChange).toHaveBeenCalledWith({ topology: 'metro_mirror', metroMirrorMode: 'existing', consistencyGroupId: '', auxiliaryNamesByVolume: {} })
  })
  it('shows a derived read-only target, disables Managed and clears Metro values for Local', async () => {
    render(<RecoveryGroupTopologyStep {...props} draft={{ topology: 'metro_mirror', relatedVolumeProviderId: 'source', metroMirrorMode: 'existing', consistencyGroupId: '001' }} />)
    expect(screen.getByDisplayValue('Target FS')).toHaveAttribute('readonly')
    expect(screen.getByRole('option', { name: /managed/i })).toBeDisabled()
    await userEvent.setup().selectOptions(screen.getByLabelText('Topology mode'), 'local')
    expect(props.onChange).toHaveBeenCalledWith({ topology: 'local', metroMirrorMode: null, consistencyGroupId: '', auxiliaryNamesByVolume: {} })
  })
  it('exposes fetch failure and retry without losing selected values', async () => {
    render(<RecoveryGroupTopologyStep {...props} error={new Error('Offline')} draft={{ topology: 'local', relatedVolumeProviderId: 'source' }} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }))
    expect(props.onRetry).toHaveBeenCalled()
  })
})
