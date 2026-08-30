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

  it('does not render a footer when one is not provided', () => {
    render(
      <SettingsSectionCard
        icon={<span>icon</span>}
        title="Discovery schedule"
        description="Choose when discovery should run."
      >
        <p>Section content</p>
      </SettingsSectionCard>,
    )

    const section = screen.getByRole('region', { name: 'Discovery schedule' })
    expect(section.querySelector('.border-t')).not.toBeInTheDocument()
  })

  it('renders consumer-owned footer content after the body', () => {
    render(
      <SettingsSectionCard
        icon={<span>icon</span>}
        title="Discovery schedule"
        description="Choose when discovery should run."
        footer={<button type="button">Save schedule</button>}
      >
        <p>Section content</p>
      </SettingsSectionCard>,
    )

    const section = screen.getByRole('region', { name: 'Discovery schedule' })
    const footer = screen.getByRole('button', { name: 'Save schedule' }).parentElement

    expect(footer).toHaveClass('border-t', 'border-border')
    expect(section).toContainElement(screen.getByRole('button', { name: 'Save schedule' }))
    expect(section.textContent?.indexOf('Section content')).toBeLessThan(
      section.textContent?.indexOf('Save schedule') ?? -1,
    )
  })
})
