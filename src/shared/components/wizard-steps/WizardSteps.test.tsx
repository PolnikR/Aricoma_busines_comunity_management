import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WizardSteps } from './WizardSteps'

describe('WizardSteps', () => {
  it('renders clickable items from props and marks the current step', async () => {
    const user = userEvent.setup()
    const onStepChange = vi.fn()
    render(
      <WizardSteps
        ariaLabel="Creation steps"
        currentStep={2}
        items={[
          { id: 'details', label: 'Details' },
          { id: 'resources', label: 'Resources' },
        ]}
        onStepChange={onStepChange}
      />,
    )

    expect(screen.getByRole('list', { name: 'Creation steps' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Details' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('button', { name: 'Resources' })).toHaveAttribute('aria-current', 'step')

    await user.click(screen.getByRole('button', { name: 'Details' }))
    expect(onStepChange).toHaveBeenCalledWith(1)
  })

  it('does not activate a disabled step', async () => {
    const user = userEvent.setup()
    const onStepChange = vi.fn()
    render(
      <WizardSteps
        ariaLabel="Creation steps"
        currentStep={1}
        items={[
          { id: 'details', label: 'Details' },
          { id: 'resources', label: 'Resources', disabled: true },
        ]}
        onStepChange={onStepChange}
      />,
    )

    const resources = screen.getByRole('button', { name: 'Resources' })
    expect(resources).toBeDisabled()
    await user.click(resources)
    expect(onStepChange).not.toHaveBeenCalled()
  })
})
