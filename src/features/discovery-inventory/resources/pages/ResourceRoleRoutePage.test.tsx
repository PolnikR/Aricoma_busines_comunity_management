import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ResourceRoleRoutePage } from './ResourceRoleRoutePage'

vi.mock('./ResourceRolePage', () => ({
  ResourceRolePage: ({ role }: { role: 'source' | 'target' }) => {
    const navigate = useNavigate()
    const location = useLocation()
    return (
      <div>
        <span data-testid="role">{role}</span>
        <span data-testid="pathname">{location.pathname}</span>
        <button type="button" onClick={() => { void navigate('/discovery-inventory/resources/target') }}>
          Go target
        </button>
      </div>
    )
  },
}))

afterEach(cleanup)

function renderRoute(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/discovery-inventory/resources/:role" element={<ResourceRoleRoutePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ResourceRoleRoutePage', () => {
  it.each([
    ['/discovery-inventory/resources/source', 'source'],
    ['/discovery-inventory/resources/target', 'target'],
  ] as const)('renders the validated %s role', (path, role) => {
    renderRoute(path)

    expect(screen.getByTestId('role')).toHaveTextContent(role)
    expect(screen.getByTestId('pathname')).toHaveTextContent(path)
  })

  it('keeps the same route component mounted when only the role param changes', () => {
    renderRoute('/discovery-inventory/resources/source')
    fireEvent.click(screen.getByRole('button', { name: 'Go target' }))

    expect(screen.getByTestId('role')).toHaveTextContent('target')
    expect(screen.getByRole('button', { name: 'Go target' })).toBeInTheDocument()
  })

  it('redirects an unsupported role to the canonical source URL', () => {
    function LocationProbe() {
      return <span data-testid="location">{useLocation().pathname}</span>
    }

    render(
      <MemoryRouter initialEntries={['/discovery-inventory/resources/unknown']}>
        <Routes>
          <Route path="/discovery-inventory/resources/:role" element={<ResourceRoleRoutePage />} />
          <Route path="/discovery-inventory/resources/source" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('location')).toHaveTextContent('/discovery-inventory/resources/source')
  })
})
