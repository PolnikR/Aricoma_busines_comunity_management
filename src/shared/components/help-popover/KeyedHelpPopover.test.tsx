import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { KeyedHelpPopover } from './KeyedHelpPopover'

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => `t(${key})`, language: 'en' }),
}))

afterEach(cleanup)

describe('KeyedHelpPopover', () => {
  it('reads trigger, title, intro, sections and the shared close label from the key prefix', async () => {
    const user = userEvent.setup()
    render(<KeyedHelpPopover helpKey="providers.help" sections={['role', 'credential']} />)

    await user.click(screen.getByRole('button', { name: 't(providers.help.trigger)' }))
    const dialog = screen.getByRole('dialog', { name: 't(providers.help.title)' })

    expect(dialog).toHaveTextContent('t(providers.help.intro)')
    expect(screen.getAllByRole('heading', { level: 4 }).map(heading => heading.textContent)).toEqual([
      't(providers.help.role.title)',
      't(providers.help.credential.title)',
    ])
    expect(dialog).toHaveTextContent('t(providers.help.credential.text)')
    expect(screen.getByRole('button', { name: 't(help.close)' })).toBeInTheDocument()
  })

  it('appends custom content after the sections and passes the width through', async () => {
    const user = userEvent.setup()
    render(
      <KeyedHelpPopover helpKey="providers.help" sections={['role']} width="wide">
        <p>Custom relationships</p>
      </KeyedHelpPopover>,
    )

    await user.click(screen.getByRole('button', { name: 't(providers.help.trigger)' }))
    const dialog = screen.getByRole('dialog', { name: 't(providers.help.title)' })
    const section = screen.getByRole('heading', { level: 4, name: 't(providers.help.role.title)' })
    const custom = screen.getByText('Custom relationships')

    expect(dialog).toHaveClass('w-[55rem]', 'max-w-[calc(100%-2rem)]')
    expect(section.compareDocumentPosition(custom) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
