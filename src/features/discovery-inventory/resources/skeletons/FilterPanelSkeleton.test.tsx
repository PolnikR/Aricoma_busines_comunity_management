import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FilterPanelSkeleton } from './FilterPanelSkeleton'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('FilterPanelSkeleton', () => {
  it('renders an accessible four-field placeholder', () => {
    const { container } = render(<FilterPanelSkeleton />)
    expect(screen.getByLabelText('Loading filters')).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelectorAll('.space-y-1\\.5')).toHaveLength(4)
  })
})
