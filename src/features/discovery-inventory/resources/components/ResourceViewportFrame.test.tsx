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

    const frame = screen.getByText('Resources content').parentElement
    expect(frame).not.toBeNull()
    expect(frame).toHaveClass('flex', 'min-h-full', 'lg:h-full', 'lg:min-h-0', 'lg:overflow-hidden')
  })
})
