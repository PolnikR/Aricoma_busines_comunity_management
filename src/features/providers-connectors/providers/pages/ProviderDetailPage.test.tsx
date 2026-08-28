import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProviderDetailPage } from './ProviderDetailPage'
import { OrvalApiError } from '@/shared/api/orvalMutator'

const navigate = vi.fn()
let query: {
  data: {
    id: string
    name: string
    description: string
    type: 'VMWARE'
    ipAddress: string
    url?: string | null
    credentialId: string | null
    role?: 'source' | 'target'
    defaultFlashcopyProviderId?: string | null
    orchestratorConnId?: string | null
    credentialStatus: 'ok' | 'missing' | 'none'
  }[] | undefined
  isLoading: boolean
  error: Error | null
  refetch: ReturnType<typeof vi.fn>
}

vi.mock('react-router', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-router')>(),
  useNavigate: () => navigate,
  useParams: () => ({ providerId: 'provider-1' }),
}))
vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useProviders', () => ({ useProviders: () => query }))

beforeEach(() => {
  vi.clearAllMocks()
  query = {
    data: [{
      id: 'provider-1',
      name: 'Primary',
      description: 'Prod',
      type: 'VMWARE',
      ipAddress: '10.0.0.1',
      url: 'https://10.0.0.1/ui/',
      credentialId: 'vcenter-admin',
      role: 'source',
      defaultFlashcopyProviderId: 'flash-01',
      orchestratorConnId: 'airflow-01',
      credentialStatus: 'ok',
    }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }
})

describe('ProviderDetailPage', () => {
  it('renders provider details and navigates back', async () => {
    const user = userEvent.setup()
    render(<ProviderDetailPage />)
    expect(screen.getByText('Primary')).toBeInTheDocument()
    expect(screen.getAllByText('VMware')).toHaveLength(2)
    expect(screen.getByText('Source')).toBeInTheDocument()
    expect(screen.getByText('flash-01')).toBeInTheDocument()
    expect(screen.getByText('airflow-01')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'https://10.0.0.1/ui/' })).toHaveAttribute('href', 'https://10.0.0.1/ui/')
    expect(screen.getByRole('link', { name: 'https://10.0.0.1/ui/' })).toHaveAttribute('target', '_blank')
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(navigate).toHaveBeenCalledWith('/providers-connectors/providers')
  })

  it('renders loading, error, and missing states', () => {
    query = { ...query, isLoading: true }
    const view = render(<ProviderDetailPage />)
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    expect(screen.getByText('Provider details')).toBeInTheDocument()
    expect(screen.getByText('Provider ID')).toBeInTheDocument()
    expect(screen.queryByText('Loading provider')).not.toBeInTheDocument()
    expect(view.container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(5)
    query = { ...query, isLoading: false, error: new Error('offline') }
    view.rerender(<ProviderDetailPage />)
    expect(screen.getByRole('alert')).not.toHaveTextContent('offline')
    query = { ...query, error: null, data: [] }
    view.rerender(<ProviderDetailPage />)
    expect(screen.getByText('Provider not found')).toBeInTheDocument()
  })

  it('shows nested backend detail below the localized provider detail load title', () => {
    query = {
      ...query,
      data: undefined,
      error: new Error('Get providers request failed with status 503', {
        cause: new OrvalApiError(503, 'Service Unavailable', { detail: 'The provider detail service is unavailable.' }),
      }),
    }

    render(<ProviderDetailPage />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Failed to load provider')
    expect(alert).toHaveTextContent('The provider detail service is unavailable.')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})
