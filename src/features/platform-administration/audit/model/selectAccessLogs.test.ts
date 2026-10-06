import { describe, expect, it } from 'vitest'
import { selectAccessLogs } from './selectAccessLogs'

const wireEntry = {
  timestamp: '2026-10-01T17:25:32.552222+00:00',
  user: 'admin',
  method: 'GET',
  path: '/get_providers',
  status: 200,
  duration_ms: 2.1,
  request_body: null,
  response_body: { providers: [] },
}

describe('selectAccessLogs', () => {
  it('returns the chronological backend window newest first', () => {
    const records = selectAccessLogs({
      entries: [
        { ...wireEntry, timestamp: '2026-10-01T10:00:00+00:00' },
        { ...wireEntry, timestamp: '2026-10-01T11:00:00+00:00' },
        { ...wireEntry, timestamp: '2026-10-01T12:00:00+00:00' },
      ],
    })

    expect(records.map(record => record.kind === 'request' ? record.timestamp : record.raw)).toEqual([
      '2026-10-01T12:00:00+00:00',
      '2026-10-01T11:00:00+00:00',
      '2026-10-01T10:00:00+00:00',
    ])
  })

  it('keeps raw fallback entries in their reversed backend position', () => {
    const records = selectAccessLogs({
      entries: [
        { ...wireEntry, path: '/first' },
        { raw: 'malformed line' },
        { ...wireEntry, path: '/last' },
      ],
    })

    expect(records.map(record => record.kind === 'request' ? record.path : record.raw)).toEqual([
      '/last',
      'malformed line',
      '/first',
    ])
  })

  it('does not mutate the response entries', () => {
    const entries = [
      { ...wireEntry, path: '/first' },
      { ...wireEntry, path: '/last' },
    ]
    const snapshot = [...entries]

    selectAccessLogs({ entries })

    expect(entries).toEqual(snapshot)
    expect(entries.map(entry => entry.path)).toEqual(['/first', '/last'])
  })

  it('maps query string, user agent and referer into the request record', () => {
    const [record] = selectAccessLogs({
      entries: [{
        ...wireEntry,
        query_string: 'role=all',
        user_agent: 'Mozilla/5.0',
        referer: 'http://localhost:5173/discovery-inventory/resources',
      }],
    })

    expect(record).toMatchObject({
      kind: 'request',
      queryString: 'role=all',
      userAgent: 'Mozilla/5.0',
      referer: 'http://localhost:5173/discovery-inventory/resources',
    })
  })

  it('omits request metadata the entry lacks or sends as null or empty', () => {
    const records = selectAccessLogs({
      entries: [
        wireEntry,
        { ...wireEntry, query_string: null, user_agent: null, referer: null },
        { ...wireEntry, query_string: '', user_agent: '', referer: '' },
      ],
    })

    for (const record of records) {
      expect(record).not.toHaveProperty('queryString')
      expect(record).not.toHaveProperty('userAgent')
      expect(record).not.toHaveProperty('referer')
    }
  })
})
