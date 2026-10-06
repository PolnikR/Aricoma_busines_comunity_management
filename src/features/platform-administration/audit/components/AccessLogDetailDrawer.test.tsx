import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { openDetailSection } from '@/test-utils/detailView'
import { AccessLogDetailDrawer } from './AccessLogDetailDrawer'
import type { AccessLogRecord } from '../model/accessLogTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

afterEach(cleanup)

const request: AccessLogRecord = {
  kind: 'request',
  method: 'GET',
  path: '/vdisks_by_vm',
  status: 404,
  durationMs: 42,
  requestBody: null,
  responseBody: { vdisks: {} },
}

const dialog = () => screen.getByRole('dialog', { name: 'Access log details' })
const navItems = () => within(within(dialog()).getByRole('navigation', { name: 'Sections' })).getAllByRole('button')

describe('AccessLogDetailDrawer', () => {
  it('renders nothing without a record', () => {
    render(<AccessLogDetailDrawer record={null} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the request with its HTTP status first and each body as its own section', () => {
    render(<AccessLogDetailDrawer record={request} onClose={vi.fn()} />)

    expect(dialog()).toHaveAttribute('data-size', 'lg')
    expect(navItems().map(item => item.textContent)).toEqual(['Request', 'Request body', 'Response body'])
    const overview = within(dialog()).getByRole('region', { name: 'Request' })
    expect(overview).toHaveTextContent('404')
    expect(overview).toHaveTextContent('42 ms')
    expect(within(dialog()).getByRole('heading', { level: 2 }).closest('header')).not.toHaveTextContent('404')

    expect(openDetailSection(dialog(), 'Request body')).toHaveTextContent('null')
    expect(openDetailSection(dialog(), 'Response body')).toHaveTextContent('"vdisks": {}')
  })

  it('shows a raw entry as a single section without navigation', () => {
    render(<AccessLogDetailDrawer record={{ kind: 'raw', raw: 'unparsed line' }} onClose={vi.fn()} />)

    expect(within(dialog()).queryByRole('navigation')).not.toBeInTheDocument()
    expect(within(dialog()).getByRole('region', { name: 'Raw entry' })).toHaveTextContent('unparsed line')
  })
})
