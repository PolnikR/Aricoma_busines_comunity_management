import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecoveryAppBuilder } from './RecoveryAppBuilder'

vi.mock('@/hooks/useTranslation', () => import('@/test/mockUseTranslation'))
vi.mock('./VMSidebar', () => ({ VMSidebar: () => <div>VM sidebar</div> }))
vi.mock('./TierCanvas', () => ({ TierCanvas: () => <div>Tier canvas</div> }))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('RecoveryAppBuilder', () => {
  it('validates required metadata before saving', async () => {
    const user = userEvent.setup()
    const alertMock = vi.fn()
    const onSave = vi.fn()
    vi.stubGlobal('alert', alertMock)
    render(<RecoveryAppBuilder onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Save Application' }))
    expect(alertMock).toHaveBeenCalledWith('Please enter an application name')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('saves the current metadata and default tiers', () => {
    const onSave = vi.fn()
    render(<RecoveryAppBuilder onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('Application Name *'), { target: { value: 'Finance' } })
    fireEvent.change(screen.getByLabelText('Description *'), { target: { value: 'Finance recovery' } })
    fireEvent.change(screen.getByLabelText('Environment *'), { target: { value: 'prod' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Application' }))

    expect(onSave).toHaveBeenCalledOnce()
    expect(onSave.mock.calls[0]?.[0]).toMatchObject({
      name: 'Finance',
      description: 'Finance recovery',
      environment: 'prod',
    })
    expect((onSave.mock.calls[0]?.[0] as { tiers: Map<string, unknown> }).tiers.size).toBe(4)
  })

  it('disables save while persistence is in progress', () => {
    render(<RecoveryAppBuilder isSaving />)
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  })
})
