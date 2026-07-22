import { http, HttpResponse } from 'msw'
import type { RecoveryApplicationData } from '@/features/recovery-plans/recovery-applications/model/recoveryApplicationTypes'
import { getApps, getApp, createApp, updateApp, deleteApp } from './data'

export const handlers = [
  http.get('/api/recovery-applications', () => {
    const apps = getApps()
    return HttpResponse.json(apps)
  }),

  http.get('/api/recovery-applications/:id', ({ params }) => {
    const app = getApp(params['id'] as string)
    if (!app) {
      return HttpResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }
    return HttpResponse.json(app)
  }),

  http.post('/api/recovery-applications', async ({ request }) => {
    const data = (await request.json()) as RecoveryApplicationData
    const app = createApp(data)
    return HttpResponse.json(app, { status: 201 })
  }),

  http.put('/api/recovery-applications/:id', async ({ params, request }) => {
    const data = (await request.json()) as RecoveryApplicationData
    const app = updateApp(params['id'] as string, data)
    if (!app) {
      return HttpResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }
    return HttpResponse.json(app)
  }),

  http.delete('/api/recovery-applications/:id', ({ params }) => {
    const deleted = deleteApp(params['id'] as string)
    if (!deleted) {
      return HttpResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }
    return HttpResponse.json(null, { status: 204 })
  }),
]
