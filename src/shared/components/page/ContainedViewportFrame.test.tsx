import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ContainedViewportFrame } from './ContainedViewportFrame'

describe('ContainedViewportFrame', () => {
  it('fills the desktop viewport and scrolls the route only when content has a floor that does not fit', () => {
    render(
      <ContainedViewportFrame>
        <div>Contained content</div>
      </ContainedViewportFrame>,
    )

    const frame = screen.getByText('Contained content').parentElement
    expect(frame).not.toBeNull()
    expect(frame).toHaveClass('flex', 'min-h-full', 'lg:h-full', 'lg:min-h-0', 'lg:overflow-y-auto')
    expect(frame).not.toHaveClass('lg:overflow-hidden')
    // Below lg the page keeps its natural document scroll.
    expect(frame).not.toHaveClass('overflow-y-auto')
  })
})
