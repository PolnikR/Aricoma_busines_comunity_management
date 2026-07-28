import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FilterPanelSkeleton } from './FilterPanelSkeleton'

describe('FilterPanelSkeleton', () => {
  it('renders an accessible four-field placeholder', () => {
    const { container } = render(<FilterPanelSkeleton />)
    expect(screen.getByLabelText('Loading filters')).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelectorAll('.space-y-1\\.5')).toHaveLength(4)
  })
})
