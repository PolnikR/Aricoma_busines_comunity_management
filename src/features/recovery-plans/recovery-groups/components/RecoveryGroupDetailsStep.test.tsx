import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RecoveryGroupDetailsStep } from './RecoveryGroupDetailsStep'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('RecoveryGroupDetailsStep', () => {
  it('shows an editable email override and its validation error without helpers on identity fields', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<RecoveryGroupDetailsStep id="group" name="Group" description="Description" existingIds={[]} notificationEmail="bad" onChange={onChange} />)
    expect(screen.getByLabelText('Notification email')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    rerender(<RecoveryGroupDetailsStep id="group" name="Group" description="Description" existingIds={[]} notificationEmail="ops@example.com" onChange={onChange} />)
    await userEvent.setup().clear(screen.getByLabelText('Notification email'))
    expect(onChange).toHaveBeenLastCalledWith({ notificationEmail: '' })
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })
  it('derives a normalized id from the group name', async () => {
    const user = userEvent.setup()
    function Harness() {
      const [values, setValues] = useState({ id: '', name: '', description: '' })
      return (
        <RecoveryGroupDetailsStep
          {...values}
          existingIds={[]}
          onChange={update => { setValues(current => ({ ...current, ...update })) }}
        />
      )
    }
    render(
      <Harness />,
    )

    await user.type(screen.getByLabelText('Group name *'), 'Web Group')

    expect(screen.getByLabelText('Group ID *')).toHaveValue('web_group')
  })

  it('reports a normalized id collision', () => {
    render(
      <RecoveryGroupDetailsStep
        id="web_group"
        name="Web Group"
        description="Web virtual machines"
        existingIds={['web_group']}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByText('This recovery group ID is already in use.')).toBeInTheDocument()
  })
})
import { useState } from 'react'
