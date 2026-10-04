import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AccessLogDetailDrawer } from './AccessLogDetailDrawer'
import type { AccessLogRecord } from '../model/accessLogTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

afterEach(cleanup)

const request: AccessLogRecord = {
  kind: 'request',
  method: 'GET',
  path: '/vdisks_by_vm',
  status: 200,
  durationMs: 42,
  requestBody: null,
  responseBody: { vdisks: {} },
}

const accentOf = (name: string) => screen.getByRole('button', { name }).closest('section')?.getAttribute('data-accent')
const bodyLayout = () => screen.getByRole('dialog').querySelector('[data-body-layout]')?.getAttribute('data-body-layout')

describe('AccessLogDetailDrawer', () => {
  it('lays out the request and its bodies as accented scrolling sections', () => {
    render(<AccessLogDetailDrawer record={request} onClose={vi.fn()} />)

    expect(bodyLayout()).toBe('sections')
    expect(accentOf('Request')).toBe('overview')
    expect(accentOf('Request body')).toBe('technical')
    expect(accentOf('Response body')).toBe('technical')
  })

  it('shows a raw entry as a technical section', () => {
    render(<AccessLogDetailDrawer record={{ kind: 'raw', raw: 'unparsed line' }} onClose={vi.fn()} />)

    expect(bodyLayout()).toBe('sections')
    expect(accentOf('Raw entry')).toBe('technical')
  })
})
