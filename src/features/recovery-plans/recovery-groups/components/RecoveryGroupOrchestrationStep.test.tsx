import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PlatformProviderRecord } from '@/features/platform-administration/platform-providers/model/platformProviderTypes'
import { RecoveryGroupOrchestrationStep } from './RecoveryGroupOrchestrationStep'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const airflowProvider: PlatformProviderRecord = {
  id: 'airflow-01',
  name: 'Primary Airflow',
  description: 'Primary orchestrator',
  type: 'AIRFLOW',
  ipAddress: '10.99.99.60',
  port: 8080,
  dagDir: '/opt/airflow/dags',
  credentialId: 'airflow-admin',
  credentialStatus: 'ok',
}

function renderStep(overrides: Partial<Parameters<typeof RecoveryGroupOrchestrationStep>[0]> = {}) {
  const onPushToOrchestratorChange = vi.fn()
  const onProviderSelect = vi.fn()
  const onRetry = vi.fn()

  render(
    <RecoveryGroupOrchestrationStep
      platformProviders={[airflowProvider]}
      isLoading={false}
      error={null}
      onRetry={onRetry}
      pushToOrchestrator={null}
      selectedProviderId={null}
      onPushToOrchestratorChange={onPushToOrchestratorChange}
      onProviderSelect={onProviderSelect}
      {...overrides}
    />,
  )

  return { onPushToOrchestratorChange, onProviderSelect, onRetry }
}

describe('RecoveryGroupOrchestrationStep', () => {
  it('renders the toggle as unanswered by default', () => {
    renderStep()

    const toggle = screen.getByRole('switch', { name: 'Deploy to orchestrator' })
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText('Not selected')).toBeInTheDocument()
  })

  it('shows "Yes" when pushToOrchestrator is true and "No" when false', () => {
    const { unmount } = render(
      <RecoveryGroupOrchestrationStep
        platformProviders={[airflowProvider]}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        pushToOrchestrator={true}
        selectedProviderId={null}
        onPushToOrchestratorChange={vi.fn()}
        onProviderSelect={vi.fn()}
      />,
    )
    expect(screen.getByText('Yes')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Deploy to orchestrator' })).toHaveAttribute('aria-checked', 'true')
    unmount()

    render(
      <RecoveryGroupOrchestrationStep
        platformProviders={[airflowProvider]}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        pushToOrchestrator={false}
        selectedProviderId={null}
        onPushToOrchestratorChange={vi.fn()}
        onProviderSelect={vi.fn()}
      />,
    )
    expect(screen.getByText('No')).toBeInTheDocument()
  })

  it('calls onPushToOrchestratorChange(true) when the unanswered toggle is clicked', async () => {
    const user = userEvent.setup()
    const { onPushToOrchestratorChange } = renderStep()

    await user.click(screen.getByRole('switch', { name: 'Deploy to orchestrator' }))

    expect(onPushToOrchestratorChange).toHaveBeenCalledWith(true)
  })

  it('lists eligible platform providers and calls onProviderSelect on selection', async () => {
    const user = userEvent.setup()
    const { onProviderSelect } = renderStep()

    const select = screen.getByLabelText('Airflow platform provider *')
    expect(await screen.findByRole('option', { name: 'Primary Airflow - AIRFLOW' })).toBeInTheDocument()

    await user.selectOptions(select, 'airflow-01')

    expect(onProviderSelect).toHaveBeenCalledWith('airflow-01')
  })

  it('disables the provider select while loading', () => {
    renderStep({ isLoading: true })

    expect(screen.getByLabelText('Airflow platform provider *')).toBeDisabled()
    expect(screen.getByText('Loading platform providers')).toBeInTheDocument()
  })

  it('renders an error alert with a working retry when the provider list fails to load', async () => {
    const user = userEvent.setup()
    const { onRetry } = renderStep({ error: new Error('network down') })

    expect(screen.getByText('Failed to load platform providers.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(onRetry).toHaveBeenCalled()
  })

  it('renders an empty state when no eligible platform providers exist', () => {
    renderStep({ platformProviders: [] })

    expect(screen.getByText('No platform provider available')).toBeInTheDocument()
  })
})
