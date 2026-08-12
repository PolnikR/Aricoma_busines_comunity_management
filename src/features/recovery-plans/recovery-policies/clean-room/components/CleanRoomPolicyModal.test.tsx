import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CleanRoomPolicy } from '../model/cleanRoomPolicyTypes'
import { CleanRoomPolicyModal } from './CleanRoomPolicyModal'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('react-router', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-router')>(),
  useBlocker: () => ({ state: 'unblocked' as const }),
}))

const policy: CleanRoomPolicy = {
  id: 'enforce-clean-target',
  name: 'Enforce Clean Target',
  description: 'Remove conflicting target resources before recovery.',
  enabled: true,
}

function renderModal(props: Partial<React.ComponentProps<typeof CleanRoomPolicyModal>> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <CleanRoomPolicyModal open onClose={vi.fn()} existingPolicies={[]} {...props} />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CleanRoomPolicyModal', () => {
  it('submits the complete policy contract', async () => {
    const onClose = vi.fn()
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ clean_room_policies: [policy] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    renderModal({ onClose })

    fireEvent.change(screen.getByLabelText('Policy ID'), { target: { value: policy.id } })
    fireEvent.change(screen.getByLabelText('Policy name'), { target: { value: policy.name } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: policy.description } })
    expect(screen.getByRole('checkbox', { name: 'Enabled' })).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: 'Create clean room policy' }))

    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).body).toBe(JSON.stringify(policy))
  })

  it('prefills edit data and locks the id', () => {
    renderModal({ policy, existingPolicies: [policy] })

    expect(screen.getByRole('heading', { name: 'Edit clean room policy' })).toBeInTheDocument()
    expect(screen.getByLabelText('Policy ID')).toBeDisabled()
    expect(screen.getByLabelText('Policy name')).toHaveValue(policy.name)
  })
})
