import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_DISCOVERY_NOTIFICATION_SETTINGS,
  DEFAULT_DISCOVERY_SCHEDULE_SETTINGS,
  DISCOVERY_NOTIFICATION_RECIPIENTS,
} from '../mocks/discoverySettingsMocks'
import { DiscoveryNotificationsCard } from './DiscoveryNotificationsCard'
import { DiscoveryScheduleCard } from './DiscoveryScheduleCard'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('DiscoveryScheduleCard', () => {
  it('renders its optional footer while preserving disabled schedule controls', async () => {
    const user = userEvent.setup()

    function ScheduleCard() {
      const [settings, setSettings] = useState(DEFAULT_DISCOVERY_SCHEDULE_SETTINGS)

      return (
        <DiscoveryScheduleCard
          settings={settings}
          onChange={patch => { setSettings(current => ({ ...current, ...patch })) }}
          footer={<button type="button">Save schedule</button>}
        />
      )
    }

    render(<ScheduleCard />)

    await user.click(screen.getByRole('switch', { name: 'Scheduled discovery' }))

    expect(screen.getByLabelText('Discovery frequency')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save schedule' })).toBeInTheDocument()
  })
})

describe('DiscoveryNotificationsCard', () => {
  it('renders its optional footer while preserving the selected recipient preview and test action', () => {
    render(
      <DiscoveryNotificationsCard
        settings={DEFAULT_DISCOVERY_NOTIFICATION_SETTINGS}
        recipients={DISCOVERY_NOTIFICATION_RECIPIENTS}
        onChange={() => {}}
        onTestNotification={() => {}}
        footer={<button type="button">Save notifications</button>}
      />,
    )

    expect(screen.getByText('nina.kovacova@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send test' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Save notifications' })).toBeInTheDocument()
  })
})
