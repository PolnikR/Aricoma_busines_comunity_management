import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SettingsSectionCard } from './SettingsSectionCard'

describe('SettingsSectionCard', () => {
  it('renders a labelled section with its icon, description, action, and content', () => {
    render(
      <SettingsSectionCard
        icon={<span data-testid="section-icon">icon</span>}
        title="Discovery schedule"
        description="Choose when discovery should run."
        action={<button type="button">Toggle</button>}
      >
        <p>Section content</p>
      </SettingsSectionCard>,
    )

    const section = screen.getByRole('region', { name: 'Discovery schedule' })
    expect(section).toContainElement(screen.getByTestId('section-icon'))
    expect(section).toHaveTextContent('Choose when discovery should run.')
    expect(section).toHaveTextContent('Section content')
    expect(screen.getByRole('button', { name: 'Toggle' })).toBeInTheDocument()
  })
})
