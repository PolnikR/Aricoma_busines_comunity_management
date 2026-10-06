import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { detailSectionsFields, detailSectionsLabels, openDetailSection } from '@/test-utils/detailView'
import { AccessLogDetailView } from './AccessLogDetailView'
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

describe('AccessLogDetailView', () => {
  it('renders nothing without a record', () => {
    render(<AccessLogDetailView record={null} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the request as one flat list in the original order and each body as its own section', () => {
    render(<AccessLogDetailView record={request} onClose={vi.fn()} />)

    expect(dialog()).toHaveAttribute('data-size', 'lg')
    expect(navItems().map(item => item.textContent)).toEqual(['Request', 'Request body', 'Response body'])
    const overview = within(dialog()).getByRole('region', { name: 'Request' })
    // No separate status block or client subgroup: one list of fields.
    expect(overview.querySelectorAll('dl')).toHaveLength(1)
    expect(detailSectionsLabels(dialog())).toEqual(['Method', 'Path', 'Query string', 'Status', 'Duration', 'User agent', 'Referer'])
    expect(openDetailSection(dialog(), 'Request')).toBeInTheDocument()
    expect(detailSectionsFields(dialog())).toMatchObject({ Method: 'GET', Path: '/vdisks_by_vm', Status: '404', Duration: '42 ms', 'User agent': 'Not set', Referer: 'Not set' })
    expect(within(dialog()).getByRole('heading', { level: 2 }).closest('header')).not.toHaveTextContent('404')

    expect(openDetailSection(dialog(), 'Request body')).toHaveTextContent('null')
    expect(openDetailSection(dialog(), 'Response body')).toHaveTextContent('"vdisks": {}')
  })

  it('shows a raw entry as a single section without navigation', () => {
    render(<AccessLogDetailView record={{ kind: 'raw', raw: 'unparsed line' }} onClose={vi.fn()} />)

    expect(within(dialog()).queryByRole('navigation')).not.toBeInTheDocument()
    expect(within(dialog()).getByRole('region', { name: 'Raw entry' })).toHaveTextContent('unparsed line')
  })
})
