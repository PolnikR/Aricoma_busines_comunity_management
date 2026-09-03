import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ContainedViewportFrame } from './ContainedViewportFrame'

describe('ContainedViewportFrame', () => {
  it('preserves the proven Resources contained viewport boundary', () => {
    render(
      <ContainedViewportFrame>
        <div>Contained content</div>
      </ContainedViewportFrame>,
    )

    const frame = screen.getByText('Contained content').parentElement
    expect(frame).not.toBeNull()
    expect(frame).toHaveClass('flex', 'min-h-full', 'lg:h-full', 'lg:min-h-0', 'lg:overflow-hidden')
    expect(frame).not.toHaveClass('overflow-y-auto')
  })
})
