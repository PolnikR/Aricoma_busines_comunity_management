import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLanguageContext } from '@/contexts/LanguageContext'
import { LanguageProvider } from '@/contexts/LanguageProvider'
import { IdentityAccessNavigation } from './IdentityAccessNavigation'

afterEach(() => {
  localStorage.removeItem('app-language')
})

function renderNavigation(language: 'sk' | 'cs') {
  localStorage.setItem('app-language', language)
  render(
    <LanguageProvider>
      <IdentityAccessNavigation
        groupId="manage"
        sectionId="users"
        onSectionChange={vi.fn()}
      />
    </LanguageProvider>,
  )
}

function RuntimeLanguageSwitch() {
  const { setLanguage } = useLanguageContext()
  return <button type="button" onClick={() => { setLanguage('sk') }}>Switch to Slovak</button>
}

describe('IdentityAccessNavigation localization', () => {
  it('renders Slovak navigation from the real language provider', async () => {
    renderNavigation('sk')

    expect(await screen.findByRole('tab', { name: 'Používatelia' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Klienti' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Aplikačné roly' })).toBeInTheDocument()
  })

  it('renders Czech navigation from the real language provider', async () => {
    renderNavigation('cs')

    expect(await screen.findByRole('tab', { name: 'Uživatelé' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Klienti' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Aplikační role' })).toBeInTheDocument()
  })

  it('updates the mounted Identity navigation when the language changes from English to Slovak', async () => {
    localStorage.setItem('app-language', 'en')
    render(
      <LanguageProvider>
        <RuntimeLanguageSwitch />
        <IdentityAccessNavigation
          groupId="manage"
          sectionId="users"
            onSectionChange={vi.fn()}
        />
      </LanguageProvider>,
    )

    expect(await screen.findByRole('tab', { name: 'Users' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Switch to Slovak' }))

    expect(await screen.findByRole('tab', { name: 'Používatelia' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('tab', { name: 'Users' })).not.toBeInTheDocument()
    expect(localStorage.getItem('app-language')).toBe('sk')
  })
})
