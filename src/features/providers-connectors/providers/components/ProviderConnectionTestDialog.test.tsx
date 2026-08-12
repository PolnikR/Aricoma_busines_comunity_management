import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProviderConnectionTestDialog } from './ProviderConnectionTestDialog'
import type { ProviderConnectionTestResult } from '../model/providerConnectionTestTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

afterEach(cleanup)

const successResult: ProviderConnectionTestResult = {
  status: 'success',
  source: 'mock',
  steps: [
    { id: 'configuration', status: 'success' },
    { id: 'credentials', status: 'success' },
    { id: 'connection', status: 'success' },
    { id: 'metadata', status: 'success' },
  ],
  providerInfo: {
    name: 'Production vCenter',
    hostname: 'vmware-vcenter-01.example.internal',
    version: '8.0.2',
    ipAddress: '10.99.99.40',
    providerType: 'VMware',
  },
}

describe('ProviderConnectionTestDialog', () => {
  it('shows mock success metadata and completed steps', () => {
    render(
      <ProviderConnectionTestDialog
        open
        providerName="Production vCenter"
        providerId="vmware-vcenter-01"
        isPending={false}
        result={successResult}
        error={null}
        onClose={() => undefined}
        onRetry={() => undefined}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Test provider connection' })).toBeInTheDocument()
    expect(screen.getByText('Mock result for development')).toBeInTheDocument()
    expect(screen.getByText('vmware-vcenter-01.example.internal')).toBeInTheDocument()
    expect(screen.getByText('8.0.2')).toBeInTheDocument()
    expect(screen.getAllByText('Success')).toHaveLength(4)
  })

  it('shows the running state before the mock result is available', () => {
    render(
      <ProviderConnectionTestDialog
        open
        providerName="Production vCenter"
        providerId="vmware-vcenter-01"
        isPending
        result={null}
        error={null}
        onClose={() => undefined}
        onRetry={() => undefined}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Testing provider connection…')
    expect(screen.getByText('Connect to provider')).toBeInTheDocument()
  })
})
