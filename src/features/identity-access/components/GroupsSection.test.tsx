import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { GroupsSection } from './GroupsSection'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('GroupsSection', () => {
  it('renders a distinct hierarchical Keycloak group workspace without fabricated group records', async () => {
    render(<GroupsSection />)

    expect(screen.getByRole('heading', { name: 'Groups' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Group hierarchy' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create group' })).toBeDisabled()
    expect(screen.getByText('No groups connected')).toBeInTheDocument()
    expect(screen.getByText('No group selected')).toBeInTheDocument()

    await userEvent.type(screen.getByRole('textbox', { name: 'Search groups' }), 'engineering')
    expect(screen.getByText(/No connected Keycloak groups match/)).toBeInTheDocument()
  })
})
