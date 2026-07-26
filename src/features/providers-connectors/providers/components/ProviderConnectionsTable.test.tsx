import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProviderConnectionsTable } from './ProviderConnectionsTable'

vi.mock('@/hooks/useTranslation', () => import('@/test/mockUseTranslation'))

describe('ProviderConnectionsTable', () => {
  it('renders the empty state', () => {
    render(<ProviderConnectionsTable connections={[]} />)
    expect(screen.getByText('No results')).toBeInTheDocument()
  })

  it('renders connection details and states', () => {
    render(<ProviderConnectionsTable connections={[
      {
        name: 'source',
        endpoint: 'vcenter.example.test',
        role: 'Source',
        status: 'Connected',
      },
      {
        name: 'target',
        endpoint: 'dr.example.test',
        role: 'Target',
        status: 'Disconnected',
      },
    ]} />)

    expect(screen.getByText('source')).toBeInTheDocument()
    expect(screen.getByText('vcenter.example.test')).toBeInTheDocument()
    expect(screen.getByText('Connected')).toBeInTheDocument()
    expect(screen.getByText('Disconnected')).toBeInTheDocument()
  })
})
