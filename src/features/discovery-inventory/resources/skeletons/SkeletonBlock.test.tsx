import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SkeletonBlock } from './SkeletonBlock'

describe('SkeletonBlock', () => {
  it('combines base and caller classes', () => {
    const { container } = render(<SkeletonBlock className="h-4 w-20" />)
    expect(container.firstElementChild).toHaveClass('block', 'rounded-md', 'h-4', 'w-20')
  })
})
