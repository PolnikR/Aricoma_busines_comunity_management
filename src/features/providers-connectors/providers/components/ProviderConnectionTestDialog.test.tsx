import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProviderConnectionTestDialog } from './ProviderConnectionTestDialog'
import type { ProviderConnectionTestResult } from '../model/providerConnectionTestTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

afterEach(cleanup)

const successResult: ProviderConnectionTestResult = {
  ok: true,
  providerId: 'vmware-vcenter-01',
  providerType: 'VMWARE',
  checks: [
    { name: 'Credentials', status: 'ok', detail: 'Credential validated' },
    { name: 'API reachability', status: 'ok', detail: 'Reached vCenter API' },
  ],
}

const failedResult: ProviderConnectionTestResult = {
  ok: false,
  providerId: 'vmware-vcenter-01',
  providerType: 'VMWARE',
  checks: [
    { name: 'Credentials', status: 'ok', detail: 'Credential validated' },
    { name: 'API reachability', status: 'timeout', detail: 'Connection timed out after 5s' },
  ],
}

describe('ProviderConnectionTestDialog', () => {
  it('shows the real backend checks and overall success state', () => {
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
    expect(screen.getByText('Connection test completed')).toBeInTheDocument()
    expect(screen.getByText('Credentials')).toBeInTheDocument()
    expect(screen.getByText('API reachability')).toBeInTheDocument()
    expect(screen.getByText('Reached vCenter API')).toBeInTheDocument()
    expect(screen.getAllByText('ok')).toHaveLength(2)
  })

  it('shows individual check failures without an overall success banner', () => {
    render(
      <ProviderConnectionTestDialog
        open
        providerName="Production vCenter"
        providerId="vmware-vcenter-01"
        isPending={false}
        result={failedResult}
        error={null}
        onClose={() => undefined}
        onRetry={() => undefined}
      />,
    )

    expect(screen.getByText('timeout')).toBeInTheDocument()
    expect(screen.getByText('Connection timed out after 5s')).toBeInTheDocument()
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('shows the running state before a result is available', () => {
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

    expect(screen.getByRole('dialog', { name: 'Test provider connection' })).toBeInTheDocument()
    expect(screen.getByText('Production vCenter')).toBeInTheDocument()
  })

  it('shows a message when the backend reports no checks', () => {
    render(
      <ProviderConnectionTestDialog
        open
        providerName="Production vCenter"
        providerId="vmware-vcenter-01"
        isPending={false}
        result={{ ok: true, providerId: 'vmware-vcenter-01', providerType: 'VMWARE', checks: [] }}
        error={null}
        onClose={() => undefined}
        onRetry={() => undefined}
      />,
    )

    expect(screen.getByText('Production vCenter')).toBeInTheDocument()
    expect(screen.getByText('0 / 0 passed')).toBeInTheDocument()
  })

  it('expands the inline response body, matching the wire contract field names', () => {
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

    const dialog = screen.getByRole('dialog', { name: 'Test provider connection' })
    fireEvent.click(screen.getByText('Response body'))

    expect(dialog.textContent).toContain('"provider_id"')
    expect(dialog.textContent).toContain('"provider_type"')
    expect(dialog.textContent).toContain('vmware-vcenter-01')
    // Only one dialog — no nested modal for the JSON view.
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })

  it('copies the response body to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

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

    fireEvent.click(screen.getByText('Response body'))
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('"provider_id"'))
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('does not show provider badges before a result is available', () => {
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

    expect(screen.queryByText('VMware')).not.toBeInTheDocument()
    expect(screen.queryByText('Response body')).not.toBeInTheDocument()
  })

  it('shows the provider type/role badges and the pass count', () => {
    render(
      <ProviderConnectionTestDialog
        open
        providerName="Production vCenter"
        providerId="vmware-vcenter-01"
        providerRole="target"
        isPending={false}
        result={successResult}
        error={null}
        onClose={() => undefined}
        onRetry={() => undefined}
      />,
    )

    expect(screen.getByText('VMware')).toBeInTheDocument()
    expect(screen.getByText('Target')).toBeInTheDocument()
    expect(screen.getByText('2 / 2 passed')).toBeInTheDocument()
  })
})
