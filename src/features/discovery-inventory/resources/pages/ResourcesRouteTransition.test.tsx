import { useEffect } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { ResourcesIsePage } from '@/features/discovery-inventory/resources-ise/pages/ResourcesIsePage'
import { ResourcesPage } from './ResourcesPage'

const sourceProvider: ProviderRecord = {
  id: 'vmware-source',
  name: 'VMware Source',
  description: '',
  type: 'VMWARE',
  role: 'source',
  ipAddress: '10.0.0.1',
  port: 443,
  credentialId: null,
  credentialStatus: 'none',
}

const targetProvider: ProviderRecord = {
  ...sourceProvider,
  id: 'vmware-target',
  name: 'VMware Target',
  role: 'target',
}

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/features/providers-connectors/providers/hooks/useProviders', () => ({
  useProviders: () => ({
    data: [sourceProvider, targetProvider],
    error: null,
    isLoading: false,
    isSuccess: true,
    isFetching: false,
    refetch: vi.fn(),
  }),
}))

vi.mock('../components/vmware/VmwareResourcesPage', () => ({
  VmwareResourcesPage: ({ providerId, role }: { providerId: string; role: string }) => (
    <div data-testid="workspace">{role}:{providerId}</div>
  ),
}))

vi.mock('../components/flash-system/FlashSystemResourcesPage', () => ({
  FlashSystemResourcesPage: () => null,
}))

vi.mock('../components/ibm-power/IbmPowerResourcesPage', () => ({
  IbmPowerResourcesPage: () => null,
}))

function LocationRecorder({ locations }: { locations: string[] }) {
  const location = useLocation()

  useEffect(() => {
    locations.push(`${location.pathname}${location.search}`)
  }, [location, locations])

  return <span data-testid="location">{location.pathname}{location.search}</span>
}

describe('Resources route transition', () => {
  it('navigates from Resources ISE to Resources without a corrective location change', async () => {
    const user = userEvent.setup()
    const locations: string[] = []

    render(
      <MemoryRouter initialEntries={['/discovery-inventory/resources-ise?providerId=vmware-target']}>
        <Link to="/discovery-inventory/resources">Resources</Link>
        <LocationRecorder locations={locations} />
        <Routes>
          <Route path="/discovery-inventory/resources" element={<ResourcesPage />} />
          <Route path="/discovery-inventory/resources-ise" element={<ResourcesIsePage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('workspace')).toHaveTextContent('target:vmware-target')
    const transitionStart = locations.length

    await user.click(screen.getByRole('link', { name: 'Resources' }))

    expect(screen.getByTestId('workspace')).toHaveTextContent('source:vmware-source')
    expect(locations.slice(transitionStart)).toEqual(['/discovery-inventory/resources'])
  })

  it('navigates from Resources to Resources ISE without a corrective location change', async () => {
    const user = userEvent.setup()
    const locations: string[] = []

    render(
      <MemoryRouter initialEntries={['/discovery-inventory/resources?providerId=vmware-source']}>
        <Link to="/discovery-inventory/resources-ise">Resources ISE</Link>
        <LocationRecorder locations={locations} />
        <Routes>
          <Route path="/discovery-inventory/resources" element={<ResourcesPage />} />
          <Route path="/discovery-inventory/resources-ise" element={<ResourcesIsePage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('workspace')).toHaveTextContent('source:vmware-source')
    const transitionStart = locations.length

    await user.click(screen.getByRole('link', { name: 'Resources ISE' }))

    expect(screen.getByTestId('workspace')).toHaveTextContent('target:vmware-target')
    expect(locations.slice(transitionStart)).toEqual(['/discovery-inventory/resources-ise'])
  })
})
