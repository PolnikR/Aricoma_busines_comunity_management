import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MetricsSkeleton } from './MetricsSkeleton'

describe('MetricsSkeleton', () => {
  it('renders four metric cards', () => {
    const { container } = render(<MetricsSkeleton />)
    expect(container.querySelectorAll('.min-h-20')).toHaveLength(4)
  })
})
