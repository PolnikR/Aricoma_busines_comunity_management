import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InfrastructureTopologyToolbar } from './InfrastructureTopologyToolbar'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const filters = {
  search: '', powerState: '', host: '', showDatastores: false,
  system: '', partitionKind: '', partitionState: '',
}
const options = {
  hosts: ['host-1', 'host-2'], systems: ['Power System A'], partitionStates: ['running'],
}

describe('InfrastructureTopologyToolbar', () => {
  it('updates filters and dispatches layout controls', async () => {
    const user = userEvent.setup()
    const onFiltersChange = vi.fn()
    const onAutoLayout = vi.fn()
    const onResetPositions = vi.fn()
    const onFitView = vi.fn()
    render(
      <InfrastructureTopologyToolbar
        platform="vmware"
        filters={filters}
        options={options}
        isLayouting={false}
        onFiltersChange={onFiltersChange}
        onAutoLayout={onAutoLayout}
        onResetPositions={onResetPositions}
        onFitView={onFitView}
      />,
    )

    await user.type(screen.getByLabelText('Search infrastructure topology'), 'db')
    await user.selectOptions(screen.getByLabelText('Filter topology by host'), 'host-2')
    await user.click(screen.getByRole('tab', { name: 'Powered on' }))
    await user.click(screen.getByLabelText('Datastores'))
    await user.click(screen.getByRole('button', { name: 'Auto layout' }))
    await user.click(screen.getByRole('button', { name: 'Reset positions' }))
    await user.click(screen.getByRole('button', { name: 'Fit view' }))

    expect(onFiltersChange).toHaveBeenCalled()
    expect(onAutoLayout).toHaveBeenCalledOnce()
    expect(onResetPositions).toHaveBeenCalledOnce()
    expect(onFitView).toHaveBeenCalledOnce()
  })

  it('disables position actions while layouting', () => {
    render(
      <InfrastructureTopologyToolbar
        platform="vmware"
        filters={filters}
        options={options}
        isLayouting
        onFiltersChange={vi.fn()}
        onAutoLayout={vi.fn()}
        onResetPositions={vi.fn()}
        onFitView={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Layouting' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Reset positions' })).toBeDisabled()
  })

  it('shows IBM Power partition filters without VMware-only controls', () => {
    render(
      <InfrastructureTopologyToolbar
        platform="ibm-power"
        filters={filters}
        options={options}
        isLayouting={false}
        onFiltersChange={vi.fn()}
        onAutoLayout={vi.fn()}
        onResetPositions={vi.fn()}
        onFitView={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Filter topology by managed system')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter topology by partition state')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'LPAR' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Datastores')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Filter topology by host')).not.toBeInTheDocument()
  })

  it('shows the FlashSystem view switch and dispatches view changes', async () => {
    const user = userEvent.setup()
    const onFlashSystemViewChange = vi.fn()
    render(
      <InfrastructureTopologyToolbar
        platform="flashsystem"
        filters={filters}
        options={options}
        isLayouting={false}
        flashSystemView="flat"
        onFiltersChange={vi.fn()}
        onFlashSystemViewChange={onFlashSystemViewChange}
        onAutoLayout={vi.fn()}
        onResetPositions={vi.fn()}
        onFitView={vi.fn()}
      />,
    )

    expect(screen.queryByLabelText('Filter topology by host')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Datastores')).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Filter topology by view'), 'snapshot')
    expect(onFlashSystemViewChange).toHaveBeenCalledWith('snapshot')
  })
})
