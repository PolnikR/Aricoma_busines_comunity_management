import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PermissionsSection } from './PermissionsSection'

describe('PermissionsSection', () => {
  it('keeps Keycloak fine-grained admin permissions integration-gated instead of reusing ABCO permission mocks', () => {
    render(<PermissionsSection />)

    expect(screen.getByText('Fine-grained admin permissions not connected')).toBeInTheDocument()
    expect(screen.getByText(/generic ABCO Permission mock is an application authorization model/i)).toBeInTheDocument()
    expect(screen.queryByText('Manage Users')).not.toBeInTheDocument()
    expect(screen.queryByText('Execute Recovery')).not.toBeInTheDocument()
  })

  it('does not render redundant top-level section header', () => {
    render(<PermissionsSection />)
    expect(screen.queryByRole('heading', { name: 'Permissions' })).not.toBeInTheDocument()
  })
})
