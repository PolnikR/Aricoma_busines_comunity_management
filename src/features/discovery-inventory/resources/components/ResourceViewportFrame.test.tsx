import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ResourceViewportFrame } from './ResourceViewportFrame'

describe('ResourceViewportFrame', () => {
  it('contains the Resources page at the available desktop viewport height', () => {
    render(
      <ResourceViewportFrame>
        <div>Resources content</div>
      </ResourceViewportFrame>,
    )

    const content = screen.getByText('Resources content').parentElement
    expect(content).toHaveClass('flex', 'min-w-0', 'flex-1', 'lg:min-h-0')
    const frame = content?.parentElement
    expect(frame).not.toBeNull()
    expect(frame).toHaveClass('flex', 'min-h-full', 'lg:h-full', 'lg:min-h-0', 'lg:overflow-y-auto')
  })

  it('owns the route-level scroll boundary without becoming a data scroll region', () => {
    render(
      <ResourceViewportFrame>
        <header>Resources header</header>
        <main>Resources primary surface</main>
      </ResourceViewportFrame>,
    )

    const content = screen.getByText('Resources header').parentElement
    const frame = content?.parentElement
    expect(frame).toContainElement(screen.getByText('Resources primary surface'))
    expect(frame).not.toHaveClass('overflow-y-auto')
    expect(content).not.toHaveClass('overflow-y-auto')
    expect(content).not.toHaveClass('lg:overflow-y-auto')
  })
})
