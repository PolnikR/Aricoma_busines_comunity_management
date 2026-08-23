import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AuthenticationSection } from './AuthenticationSection'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('AuthenticationSection', () => {
  it('renders Flows/Required actions/Policies with a shared empty flow table', () => {
    render(<AuthenticationSection tabId="flows" onTabChange={vi.fn()} />)
    expect(screen.getByRole('tablist', { name: 'Authentication sections' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Flows' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Required actions' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Policies' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search authentication flows' })).toBeInTheDocument()
    expect(screen.getByLabelText('Authentication flows')).toBeInTheDocument()
    expect(screen.getByText('No authentication flows connected')).toBeInTheDocument()
  })

  it('delegates nested authentication tab navigation', async () => {
    const onTabChange = vi.fn()
    render(<AuthenticationSection tabId="flows" onTabChange={onTabChange} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Required actions' }))
    expect(onTabChange).toHaveBeenCalledWith('required-actions')
  })
})
