import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ValidationPoliciesPage } from './ValidationPoliciesPage'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('ValidationPoliciesPage', () => {
  it('exposes the validation tab without inventing a policy data contract', () => {
    render(
      <MemoryRouter>
        <ValidationPoliciesPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Recovery Policies', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Validation' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Validation policies are not available yet')).toBeInTheDocument()
  })
})
