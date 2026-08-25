import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
        onGroupChange={vi.fn()}
        onSectionChange={vi.fn()}
      />
    </LanguageProvider>,
  )
}

describe('IdentityAccessNavigation localization', () => {
  it('renders Slovak navigation from the real language provider', async () => {
    renderNavigation('sk')

    expect(await screen.findByRole('tab', { name: 'Správa' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Konfigurácia' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Používatelia' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Klienti' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Realm roly' })).toBeInTheDocument()
  })

  it('renders Czech navigation from the real language provider', async () => {
    renderNavigation('cs')

    expect(await screen.findByRole('tab', { name: 'Správa' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Konfigurace' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Uživatelé' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Klienti' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Realm role' })).toBeInTheDocument()
  })
})
