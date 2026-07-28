import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InfrastructureTopologySkeleton } from './InfrastructureTopologySkeleton'

describe('InfrastructureTopologySkeleton', () => {
  it('exposes an accessible loading state', () => {
    render(<InfrastructureTopologySkeleton />)
    expect(screen.getByLabelText('Loading infrastructure topology')).toHaveAttribute('aria-busy', 'true')
  })
})
