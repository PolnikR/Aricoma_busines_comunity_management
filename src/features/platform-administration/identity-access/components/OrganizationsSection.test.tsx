import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OrganizationsSection } from './OrganizationsSection'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('OrganizationsSection', () => {
  it('does not present the generic ABCO organization mock as Keycloak organization data', () => {
    render(<OrganizationsSection entityId={null} tabId={null} onEntityChange={vi.fn()} onTabChange={vi.fn()} />)

    expect(screen.getByLabelText('Keycloak organizations')).toBeInTheDocument()
    expect(screen.getByText('Keycloak organizations not connected')).toBeInTheDocument()
    expect(screen.queryByText('Engineering')).not.toBeInTheDocument()
  })

  it('keeps Keycloak organization detail hierarchy integration-gated', async () => {
    const onTabChange = vi.fn()
    render(<OrganizationsSection entityId="org-keycloak-1" tabId="details" onEntityChange={vi.fn()} onTabChange={onTabChange} />)

    expect(screen.getByRole('tablist', { name: 'Organization sections' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Domains' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Identity providers' })).toBeInTheDocument()
    expect(screen.getByText(/not inferred from the generic ABCO organization mock/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Members' }))
    expect(onTabChange).toHaveBeenCalledWith('members')
  })
})
