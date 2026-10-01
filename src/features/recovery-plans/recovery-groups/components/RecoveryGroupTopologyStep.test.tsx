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
  it('shows a derived read-only target and clears Metro values for Local', async () => {
    render(<RecoveryGroupTopologyStep {...props} draft={{ topology: 'metro_mirror', relatedVolumeProviderId: 'source', metroMirrorMode: 'existing', consistencyGroupId: '001' }} />)
    expect(screen.queryByLabelText('Consistency group ID')).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('Target FS')).toHaveAttribute('readonly')
    await userEvent.setup().selectOptions(screen.getByLabelText('Topology mode'), 'local')
    expect(props.onChange).toHaveBeenCalledWith({ topology: 'local', metroMirrorMode: null, consistencyGroupId: '', auxiliaryNamesByVolume: {} })
  })
  it('lets a new group select Managed and clears Existing values', async () => {
    const onChange = vi.fn()
    render(<RecoveryGroupTopologyStep {...props} onChange={onChange} draft={{ topology: 'metro_mirror', relatedVolumeProviderId: 'source', metroMirrorMode: 'existing', consistencyGroupId: '001' }} />)
    expect(screen.getByRole('option', { name: 'Managed relationship' })).toBeEnabled()
    expect(screen.getByLabelText('Metro Mirror configuration')).toBeEnabled()
    await userEvent.setup().selectOptions(screen.getByLabelText('Metro Mirror configuration'), 'managed')
    expect(onChange).toHaveBeenCalledWith({ metroMirrorMode: 'managed', consistencyGroupId: '', auxiliaryNamesByVolume: {} })
  })
  it('keeps topology, source and mode editable for a new Managed draft', async () => {
    const onChange = vi.fn()
    render(<RecoveryGroupTopologyStep {...props} onChange={onChange} draft={{ topology: 'metro_mirror', relatedVolumeProviderId: 'source', metroMirrorMode: 'managed' }} />)
    expect(screen.getByText(/ABCO creates the auxiliary volumes/)).toBeInTheDocument()
    expect(screen.getByLabelText('Topology mode')).toBeEnabled()
    expect(screen.getByLabelText('Source FlashSystem provider')).toBeEnabled()
    const mode = screen.getByLabelText('Metro Mirror configuration')
    expect(mode).toBeEnabled()
    await userEvent.setup().selectOptions(mode, 'existing')
    expect(onChange).toHaveBeenCalledWith({ metroMirrorMode: 'existing', consistencyGroupId: '', auxiliaryNamesByVolume: {} })
  })
  it('locks the mode of an edited Existing group but keeps topology and source editable', () => {
    render(<RecoveryGroupTopologyStep {...props} isEditing draft={{ topology: 'metro_mirror', relatedVolumeProviderId: 'source', metroMirrorMode: 'existing', consistencyGroupId: '001' }} />)
    expect(screen.getByLabelText('Metro Mirror configuration')).toBeDisabled()
    expect(screen.getByLabelText('Topology mode')).toBeEnabled()
    expect(screen.getByLabelText('Source FlashSystem provider')).toBeEnabled()
  })
  it('locks mode, topology and source of an edited Managed group', () => {
    render(<RecoveryGroupTopologyStep {...props} isEditing draft={{ topology: 'metro_mirror', relatedVolumeProviderId: 'source', metroMirrorMode: 'managed' }} />)
    expect(screen.getByLabelText('Metro Mirror configuration')).toBeDisabled()
    expect(screen.getByLabelText('Topology mode')).toBeDisabled()
    expect(screen.getByLabelText('Source FlashSystem provider')).toBeDisabled()
  })
  it('exposes fetch failure and retry without losing selected values', async () => {
    render(<RecoveryGroupTopologyStep {...props} error={new Error('Offline')} draft={{ topology: 'local', relatedVolumeProviderId: 'source' }} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }))
    expect(props.onRetry).toHaveBeenCalled()
  })
})
