import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageHeader } from './PageHeader'

describe('PageHeader', () => {
  it('renders a compact title row with description and actions', () => {
    render(
      <PageHeader
        title="Platform providers"
        description="Manage orchestration and platform-level provider connections."
        actions={<button type="button">Add provider</button>}
      />,
    )

    const heading = screen.getByRole('heading', { name: 'Platform providers', level: 1 })
    const header = heading.parentElement?.parentElement
    expect(heading).toHaveClass('text-xl', 'leading-9')
    expect(header).toHaveClass('shrink-0', 'sm:flex-row', 'sm:items-start')
    expect(header).toContainElement(screen.getByText('Manage orchestration and platform-level provider connections.'))
    expect(header).toContainElement(screen.getByRole('button', { name: 'Add provider' }))
  })

  it('does not render the eyebrow', () => {
    const { container } = render(<PageHeader eyebrow="Platform Administration" title="Platform providers" />)

    expect(screen.queryByText('Platform Administration')).not.toBeInTheDocument()
    expect(container.querySelector('.uppercase')).toBeNull()
  })

  it('renders only the title when description and actions are omitted', () => {
    const { container } = render(<PageHeader title="Recovery groups" />)

    expect(screen.getByRole('heading', { name: 'Recovery groups', level: 1 })).toBeInTheDocument()
    expect(container.querySelector('p')).toBeNull()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
