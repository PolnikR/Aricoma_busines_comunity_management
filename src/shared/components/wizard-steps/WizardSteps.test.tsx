import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WizardSteps } from './WizardSteps'

describe('WizardSteps', () => {
  it('renders items from props and marks the current step', () => {
    render(
      <WizardSteps
        ariaLabel="Creation steps"
        currentStep={2}
        items={[
          { id: 'details', label: 'Details' },
          { id: 'resources', label: 'Resources' },
        ]}
      />,
    )

    expect(screen.getByRole('list', { name: 'Creation steps' })).toBeInTheDocument()
    expect(screen.getByText('Details').closest('li')).not.toHaveAttribute('aria-current')
    expect(screen.getByText('Resources').closest('li')).toHaveAttribute('aria-current', 'step')
  })
})
