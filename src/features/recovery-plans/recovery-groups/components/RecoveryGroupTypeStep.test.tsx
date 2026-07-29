import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RecoveryGroupTypeStep } from './RecoveryGroupTypeStep'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('RecoveryGroupTypeStep', () => {
  it('selects the canonical VMware workload and keeps unsupported workloads disabled', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <RecoveryGroupTypeStep
        sourceCategory="backup_system_workload"
        selected={null}
        onCategoryChange={vi.fn()}
        onSelect={onSelect}
      />,
    )

    expect(screen.getByText('Choose a resource type for this group.')).toBeInTheDocument()
    expect(screen.getByText(/After assigning a specific resource type/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /VMware virtual machines/i }))

    expect(onSelect).toHaveBeenCalledWith(
      'backup_system_workload',
      'vmware_virtual_machines',
      'vm',
    )
    expect(screen.getByRole('button', { name: /Oracle databases/i })).toBeDisabled()
  })

  it('switches to storage systems and selects IBM FlashSystem volumes', async () => {
    const user = userEvent.setup()
    const onCategoryChange = vi.fn()
    const onSelect = vi.fn()
    const { rerender } = render(
      <RecoveryGroupTypeStep
        sourceCategory="backup_system_workload"
        selected={null}
        onCategoryChange={onCategoryChange}
        onSelect={onSelect}
      />,
    )

    await user.click(screen.getByRole('tab', { name: 'Storage system' }))
    expect(onCategoryChange).toHaveBeenCalledWith('storage_system')

    rerender(
      <RecoveryGroupTypeStep
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
