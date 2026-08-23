import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SessionsSection } from './SessionsSection'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('SessionsSection', () => {
  it('renders the Keycloak realm-level client-session contract without fabricating client aggregation', () => {
    render(<SessionsSection />)

    expect(screen.getByRole('heading', { name: 'Sessions' })).toBeInTheDocument()
    expect(screen.getByLabelText('Realm client sessions')).toBeInTheDocument()
    expect(screen.getByText('Client')).toBeInTheDocument()
    expect(screen.getByText('Active sessions')).toBeInTheDocument()
    expect(screen.getByText('Offline sessions')).toBeInTheDocument()
    expect(screen.getByText('Client session overview not connected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out all active sessions' })).toBeDisabled()
    expect(screen.queryByText('192.168.1.100')).not.toBeInTheDocument()
  })
})
