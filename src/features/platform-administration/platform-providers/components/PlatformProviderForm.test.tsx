import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PlatformProviderForm, type PlatformProviderFormData } from './PlatformProviderForm'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const formData: PlatformProviderFormData = {
  id: 'airflow-1',
  name: 'Production Airflow',
  description: 'Production orchestration',
  type: 'AIRFLOW',
  ipAddress: '10.99.99.40',
  url: 'https://airflow.example.test',
  port: '22',
  dagDir: '/opt/airflow/dags',
  credentialId: 'credential-1',
  vmPrefix: 'airflow-',
  vmTags: ['saved-platform-tag'],
}

describe('PlatformProviderForm', () => {
  it('keeps IP address and port in a responsive grid row', () => {
    render(
      <PlatformProviderForm
        data={formData}
        errors={{}}
        isSubmitting={false}
        credentials={[]}
        credentialsLoading={false}
        credentialsError={false}
        onRetryCredentials={vi.fn()}
        tags={[]}
        tagsDisabled={false}
        onTagsChange={vi.fn()}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    const ipField = screen.getByLabelText('IP address').closest('label')
    const portField = screen.getByLabelText('Port').closest('label')
    const row = ipField?.parentElement

    expect(row).toBe(portField?.parentElement)
    expect(row).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-[minmax(0,1fr)_7.5rem]')

    const portInput = screen.getByLabelText('Port')
    expect(screen.getByLabelText('URL')).toHaveValue('https://airflow.example.test')
    expect(portInput).toHaveAttribute('type', 'number')
    expect(portInput).toHaveAttribute('min', '1')
    expect(portInput).toHaveAttribute('max', '65535')
    expect(portInput).toHaveAttribute('step', '1')
  })

  it('renders VM prefix and preserves saved platform tags', () => {
    render(
      <PlatformProviderForm
        data={formData}
        errors={{}}
        isSubmitting={false}
        credentials={[]}
        credentialsLoading={false}
        credentialsError={false}
        onRetryCredentials={vi.fn()}
        tags={[]}
        tagsDisabled={false}
        onTagsChange={vi.fn()}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('VM prefix')).toHaveValue('airflow-')
    expect(screen.getByText('saved-platform-tag')).toBeInTheDocument()
  })

  it('uses the compact provider-style rows for platform fields', () => {
    render(
      <PlatformProviderForm
        data={formData}
        errors={{}}
        isSubmitting={false}
        credentials={[]}
        credentialsLoading={false}
        credentialsError={false}
        onRetryCredentials={vi.fn()}
        tags={[]}
        tagsDisabled={false}
        onTagsChange={vi.fn()}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    const idRow = screen.getByLabelText('ID').closest('label')?.parentElement
    const nameRow = screen.getByLabelText('Provider name').closest('label')?.parentElement
    const typeRow = screen.getByLabelText('Type').closest('label')?.parentElement
    const credentialsRow = screen.getByLabelText('Credentials').closest('label')?.parentElement
    const urlRow = screen.getByLabelText('URL').closest('label')?.parentElement
    const dagDirRow = screen.getByLabelText('DAG directory').closest('label')?.parentElement

    expect(idRow).toBe(nameRow)
    expect(typeRow).toBe(credentialsRow)
    expect(urlRow).toBe(dagDirRow)
    expect(idRow).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2')
    expect(typeRow).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2')
    expect(urlRow).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2')
  })
})
