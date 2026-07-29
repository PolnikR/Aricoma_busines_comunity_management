import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProviderDetailPage } from './ProviderDetailPage'

const navigate = vi.fn()
let query: {
  data: {
    id: string
    name: string
    description: string
    type: 'VMWARE'
    ipAddress: string
    credentialId: string | null
    credentialStatus: 'ok' | 'missing' | 'none'
  }[] | undefined
  isLoading: boolean
  error: Error | null
  refetch: ReturnType<typeof vi.fn>
}

vi.mock('react-router-dom', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-router-dom')>(),
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
      credentialId: 'vcenter-admin',
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
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(navigate).toHaveBeenCalledWith('/providers-connectors/providers')
  })

  it('renders loading, error, and missing states', () => {
    query = { ...query, isLoading: true }
    const view = render(<ProviderDetailPage />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading provider')
    query = { ...query, isLoading: false, error: new Error('offline') }
    view.rerender(<ProviderDetailPage />)
    expect(screen.getByRole('alert')).toHaveTextContent('offline')
    query = { ...query, error: null, data: [] }
    view.rerender(<ProviderDetailPage />)
    expect(screen.getByText('Provider not found')).toBeInTheDocument()
  })
})
