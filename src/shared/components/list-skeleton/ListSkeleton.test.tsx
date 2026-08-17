import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ListSkeleton } from './ListSkeleton'

describe('ListSkeleton', () => {
  it('renders the requested number of rows as an accessible loading state', () => {
    render(<ListSkeleton rowCount={4} ariaLabel="Loading virtual machines" />)

    const skeleton = screen.getByRole('status', { name: 'Loading virtual machines' })
    expect(skeleton).toHaveAttribute('aria-busy', 'true')
    expect(skeleton.querySelectorAll('[aria-hidden="true"] > div')).toHaveLength(4)
  })

  it('renders at least one row', () => {
    render(<ListSkeleton rowCount={0} />)

    const skeleton = screen.getByRole('status', { name: 'Loading list' })
    expect(skeleton.querySelectorAll('[aria-hidden="true"] > div')).toHaveLength(1)
  })
})
