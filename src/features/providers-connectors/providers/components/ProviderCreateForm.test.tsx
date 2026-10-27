import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProviderCreateForm } from './ProviderCreateForm'

import en from '@/locales/en.json'
import sk from '@/locales/sk.json'
const locale = vi.hoisted((): { language: 'en' | 'sk' } => ({ language: 'en' }))
vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const dictionary: Record<string, string> = locale.language === 'en' ? en : sk
      return dictionary[key] ?? key
    },
    language: locale.language,
  }),
}))
beforeEach(() => { locale.language = 'en' })

const data = {
  id: 'provider-1',
  name: 'Primary',
  description: 'Production provider',
  type: 'VMWARE',
  role: 'source',
  ipAddress: '10.0.0.1',
  url: 'https://vcenter.example.test',
  credentialId: 'vcenter-admin',
  vmPrefix: 'prod-',
  vmTags: ['saved-tag'],
  backingStorageProviderIds: [],
  partnerProviderId: '',
  managedSystem: '',
  notificationEmail: 'provider-alerts@example.test',
  cacheRefreshSeconds: '120',
}

const credentials = [{
  id: 'vcenter-admin',
  name: 'vCenter admin',
  description: 'Production account',
  username: 'administrator',
}]

describe('ProviderCreateForm', () => {
  it.each(['loading', 'error', 'missing', 'create', 'submitting'])('retains saved selections during %s', state => {
    const retryCredentials = vi.fn()
    const retryTags = vi.fn()
    const onTagsChange = vi.fn()
    render(<ProviderCreateForm data={{ ...data, vmTags: ['saved-tag', 'missing-tag'] }} errors={{}}
      isSubmitting={state === 'submitting'} credentials={[]}
      credentialsLoading={state === 'loading'} credentialsError={state === 'error'} onRetryCredentials={retryCredentials}
      tags={[]} tagsLoading={state === 'loading'} tagsError={state === 'error'} tagsDisabled={state === 'create'}
      onRetryTags={retryTags} onTagsChange={onTagsChange} onBackingStorageChange={vi.fn()} onChange={vi.fn()} onSubmit={vi.fn()} />)
    expect(screen.getByRole('combobox', { name: /^Credentials/ })).toHaveValue('vcenter-admin')
    expect(screen.getByRole('combobox', { name: /^Credentials/ })).toHaveProperty('disabled', ['loading', 'error', 'submitting'].includes(state))
    const tags = screen.getByRole('button', { name: 'VM tags' })
    expect(tags).toHaveTextContent('saved-tag, missing-tag')
    expect(tags).toHaveProperty('disabled', state === 'create' || state === 'submitting')
    expect(onTagsChange).not.toHaveBeenCalled()
    if (state === 'loading') expect(screen.getByRole('status')).toHaveTextContent('Loading tags')
    if (state === 'error') {
      for (const retry of screen.getAllByRole('button', { name: 'Retry' })) fireEvent.click(retry)
      expect(retryCredentials).toHaveBeenCalledOnce()
      expect(retryTags).toHaveBeenCalledOnce()
      expect(onTagsChange).not.toHaveBeenCalled()
    }
  })

  it('reports field changes and submits on Enter', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onSubmit = vi.fn()
    render(
      <ProviderCreateForm
        data={data}
        errors={{}}
        isSubmitting={false}
        credentials={credentials}
        credentialsLoading={false}
        credentialsError={false}
        onRetryCredentials={vi.fn()}
        onTagsChange={vi.fn()}
        onBackingStorageChange={vi.fn()}
        onChange={onChange}
        onSubmit={onSubmit}
      />,
    )
    await user.type(screen.getByLabelText('Provider name'), 'X')
    await user.selectOptions(screen.getByLabelText('Type'), 'IBM_POWER')
    await user.type(screen.getByLabelText('IP address'), '{Enter}')
    expect(onChange).toHaveBeenCalled()
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(screen.getByLabelText('URL')).toHaveValue('https://vcenter.example.test')
    expect(screen.queryByLabelText('Port')).not.toBeInTheDocument()
  })

  it('locks ID and provider type in edit mode and renders validation errors', () => {
    render(
      <ProviderCreateForm
        data={data}
        errors={{ id: 'ID error' }}
        isSubmitting={false}
        credentials={credentials}
        credentialsLoading={false}
        credentialsError={false}
        onRetryCredentials={vi.fn()}
        idDisabled
        typeDisabled
        onTagsChange={vi.fn()}
        onBackingStorageChange={vi.fn()}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByDisplayValue('provider-1')).toBeDisabled()
    expect(screen.getByLabelText('Type')).toBeDisabled()
    expect(screen.getByText('ID error')).toBeInTheDocument()
    expect(screen.queryByLabelText('Orchestrator connection ID')).not.toBeInTheDocument()
  })

  it('renders and reports notification email changes', () => {
    const onChange = vi.fn()

    render(
      <ProviderCreateForm
        data={data}
        errors={{}}
        isSubmitting={false}
        credentials={credentials}
        credentialsLoading={false}
        credentialsError={false}
        onRetryCredentials={vi.fn()}
        onTagsChange={vi.fn()}
        onBackingStorageChange={vi.fn()}
        onChange={onChange}
        onSubmit={vi.fn()}
      />,
    )

    const input = screen.getByLabelText('Notification email')
    expect(input).toHaveValue('provider-alerts@example.test')
    fireEvent.change(input, { target: { value: 'new-alerts@example.test' } })
    expect(onChange).toHaveBeenCalledWith('notificationEmail', 'new-alerts@example.test')
  })

  it('renders and reports cache refresh interval changes', () => {
    const onChange = vi.fn()

    render(
      <ProviderCreateForm
        data={data}
        errors={{}}
        isSubmitting={false}
        credentials={credentials}
        credentialsLoading={false}
        credentialsError={false}
        onRetryCredentials={vi.fn()}
        onTagsChange={vi.fn()}
        onBackingStorageChange={vi.fn()}
        onChange={onChange}
        onSubmit={vi.fn()}
      />,
    )

    const input = screen.getByLabelText(/Cache refresh interval \(seconds\)/)
    expect(input).toHaveValue(120)
    expect(input).toHaveAttribute('min', '1')
    expect(input).toHaveAttribute('step', '1')
    fireEvent.change(input, { target: { value: '60' } })
    expect(onChange).toHaveBeenCalledWith('cacheRefreshSeconds', '60')
  })

  it.each([
    ['VMWARE', true, false],
    ['IBM_POWER', true, false],
    ['FLASHCOPY', false, true],
    ['HITACHI', false, false],
    ['', false, false],
    ['unknown', false, false],
  ])('shows the relationship fields that %s supports (backing=%s, partner=%s)', (type, backing, partner) => {
    render(
      <ProviderCreateForm
        data={{ ...data, type }}
        errors={{}}
        isSubmitting={false}
        credentials={credentials}
        credentialsLoading={false}
        credentialsError={false}
        onRetryCredentials={vi.fn()}
        backingStorageProviders={[{ id: 'hitachi-a', name: 'Hitachi A' }]}
        partnerProviders={[{ id: 'provider-1', name: 'Self' }, { id: 'flash-b', name: 'Array B' }]}
        onTagsChange={vi.fn()}
        onBackingStorageChange={vi.fn()}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Backing storage providers' }) !== null).toBe(backing)
    expect(screen.queryByLabelText('VM prefix') !== null).toBe(type === 'VMWARE')
    expect(screen.queryByLabelText('VM tags') !== null).toBe(type === 'VMWARE')
    expect(screen.queryByLabelText('Managed system') !== null).toBe(type === 'IBM_POWER')
    for (const label of ['Description', 'IP address', 'Role', 'URL', 'Notification email', 'Credentials']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    const partnerSelect = screen.queryByLabelText('Partner FlashSystem provider')
    expect(partnerSelect !== null).toBe(partner)
    if (partnerSelect) {
      expect([...partnerSelect.querySelectorAll('option')].map(option => option.value)).toEqual(['', 'flash-b'])
    }
  })

  it('keeps all saved tags available and reports additions and removals', async () => {
    const user = userEvent.setup()
    const onTagsChange = vi.fn()

    render(
      <ProviderCreateForm
        data={{ ...data, vmTags: ['saved-tag', 'missing-tag'] }}
        errors={{}}
        isSubmitting={false}
        credentials={credentials}
        credentialsLoading={false}
        credentialsError={false}
        onRetryCredentials={vi.fn()}
        tags={['available-tag', 'saved-tag', 'saved-tag']}
        tagsLoading={false}
        tagsError={false}
        tagsDisabled={false}
        onRetryTags={vi.fn()}
        onTagsChange={onTagsChange}
        onBackingStorageChange={vi.fn()}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('VM prefix')).toHaveValue('prod-')
    await user.click(screen.getByRole('button', { name: 'VM tags' }))
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
    expect(screen.getByRole('checkbox', { name: 'saved-tag' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'missing-tag' })).toBeChecked()

    await user.click(screen.getByRole('checkbox', { name: 'available-tag' }))
    expect(onTagsChange).toHaveBeenLastCalledWith(['saved-tag', 'missing-tag', 'available-tag'])

    await user.click(screen.getByRole('checkbox', { name: 'saved-tag' }))
    expect(onTagsChange).toHaveBeenLastCalledWith(['missing-tag'])
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('checkbox', { name: 'missing-tag' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'VM tags' })).toHaveFocus()
  })
})

// Approved copy, independent of runtime dictionaries.
const expectedHelp = [
  {
    "field": "role",
    "type": "VMWARE",
    "en": {
      "title": "Role",
      "trigger": "Help: Role",
      "intro": "Choose the source (production) or target (recovery environment) side of a recovery."
    },
    "sk": {
      "title": "Rola",
      "trigger": "Nápoveda: Rola",
      "intro": "Vyberte zdrojovú stranu (produkcia) alebo cieľovú stranu (prostredie obnovy)."
    }
  },
  {
    "field": "credentialId",
    "type": "VMWARE",
    "en": {
      "title": "Credential",
      "trigger": "Help: Credential",
      "intro": "Stored credential used to sign in to this provider. Resolved for each request; its status can be OK, missing or not set."
    },
    "sk": {
      "title": "Prihlasovacie údaje",
      "trigger": "Nápoveda: Prihlasovacie údaje",
      "intro": "Uložené prihlasovacie údaje na prihlásenie k poskytovateľovi. Vyhodnocujú sa pri každej požiadavke; ich stav môže byť v poriadku, chýbajúce alebo nenastavené."
    }
  },
  {
    "field": "url",
    "type": "VMWARE",
    "en": {
      "title": "URL",
      "trigger": "Help: URL",
      "intro": "Base URL of the provider’s web or REST endpoint."
    },
    "sk": {
      "title": "URL",
      "trigger": "Nápoveda: URL",
      "intro": "Základná URL webového alebo REST rozhrania poskytovateľa."
    }
  },
  {
    "field": "vmPrefix",
    "type": "VMWARE",
    "en": {
      "title": "VM name prefix",
      "trigger": "Help: VM name prefix",
      "intro": "Optional name-prefix filter for narrowing the selection of VMware Resources."
    },
    "sk": {
      "title": "Prefix názvu VM",
      "trigger": "Nápoveda: Prefix názvu VM",
      "intro": "Voliteľný filter podľa prefixu názvu na zúženie výberu VMware Resources."
    }
  },
  {
    "field": "vmTags",
    "type": "VMWARE",
    "en": {
      "title": "VM tags",
      "trigger": "Help: VM tags",
      "intro": "Optional list of tag names used as a filter to narrow the selection of VMware Resources."
    },
    "sk": {
      "title": "Tagy VM",
      "trigger": "Nápoveda: Tagy VM",
      "intro": "Voliteľný zoznam názvov tagov používaný ako filter na zúženie výberu VMware Resources."
    }
  },
  {
    "field": "notificationEmail",
    "type": "VMWARE",
    "en": {
      "title": "Notification email",
      "trigger": "Help: Notification email",
      "intro": "Email address for notifications about failures of this provider. Enter a valid email address. A recovery group’s notification email takes precedence over its volume provider’s address."
    },
    "sk": {
      "title": "Notifikačný email",
      "trigger": "Nápoveda: Notifikačný email",
      "intro": "Emailová adresa na oznámenia o zlyhaniach poskytovateľa. Zadajte platnú emailovú adresu. Notifikačný email skupiny obnovy má prednosť pred adresou jej poskytovateľa zväzkov."
    }
  },
  {
    "field": "cacheRefreshSeconds",
    "type": "VMWARE",
    "en": {
      "title": "Cache refresh interval",
      "trigger": "Help: Cache refresh interval",
      "intro": "Discovery cache refresh interval for this provider, in seconds. Use a positive whole number."
    },
    "sk": {
      "title": "Interval obnovovania cache",
      "trigger": "Nápoveda: Interval obnovovania cache",
      "intro": "Interval obnovovania cache zisťovania zdrojov tohto poskytovateľa v sekundách. Použite kladné celé číslo."
    }
  },
  {
    "field": "backingStorageProviderIds",
    "type": "VMWARE",
    "en": {
      "title": "Backing storage providers",
      "trigger": "Help: Backing storage providers",
      "intro": "Select the FLASHCOPY or HITACHI storage providers that back this compute environment. Each ID must refer to an existing storage provider and appear only once."
    },
    "sk": {
      "title": "Poskytovatelia podkladového úložiska",
      "trigger": "Nápoveda: Poskytovatelia podkladového úložiska",
      "intro": "Vyberte poskytovateľov úložiska FLASHCOPY alebo HITACHI, ktorí zabezpečujú úložisko tohto výpočtového prostredia. Každé ID musí odkazovať na existujúceho poskytovateľa úložiska a môže byť uvedené iba raz."
    }
  },
  {
    "field": "partnerProviderId",
    "type": "FLASHCOPY",
    "en": {
      "title": "Partner provider",
      "trigger": "Help: Partner provider",
      "intro": "Select the partner FlashSystem in a Metro Mirror system partnership. It must be an existing FLASHCOPY provider other than this provider."
    },
    "sk": {
      "title": "Partnerský poskytovateľ",
      "trigger": "Nápoveda: Partnerský poskytovateľ",
      "intro": "Vyberte partnerský FlashSystem v systémovom partnerstve Metro Mirror. Musí ísť o existujúceho poskytovateľa FLASHCOPY odlišného od tohto poskytovateľa."
    }
  },
  {
    "field": "managedSystem",
    "type": "IBM_POWER",
    "en": {
      "title": "Managed system",
      "trigger": "Help: Managed system",
      "intro": "SystemName of the managed system whose LPARs may be affected by Power rollback. Required when the HMC manages multiple systems."
    },
    "sk": {
      "title": "Spravovaný systém",
      "trigger": "Nápoveda: Spravovaný systém",
      "intro": "SystemName spravovaného systému, ktorého LPAR môže ovplyvniť Power rollback. Je potrebný, ak HMC spravuje viac systémov."
    }
  }
] as const

const helpMatrix = [
  { type: 'VMWARE', fields: ['id', 'name', 'description', 'type', 'role', 'ipAddress', 'backingStorageProviders', 'cacheRefreshSeconds', 'vmPrefix', 'vmTags', 'credentials', 'url', 'notificationEmail'], help: ['role', 'credentialId', 'url', 'vmPrefix', 'vmTags', 'notificationEmail', 'cacheRefreshSeconds', 'backingStorageProviderIds'] },
  { type: 'FLASHCOPY', fields: ['id', 'name', 'description', 'type', 'role', 'ipAddress', 'partnerProviderId', 'cacheRefreshSeconds', 'credentials', 'url', 'notificationEmail'], help: ['role', 'partnerProviderId', 'credentialId', 'url', 'notificationEmail', 'cacheRefreshSeconds'] },
  { type: 'HITACHI', fields: ['id', 'name', 'description', 'type', 'role', 'ipAddress', 'cacheRefreshSeconds', 'credentials', 'url', 'notificationEmail'], help: ['role', 'credentialId', 'url', 'notificationEmail', 'cacheRefreshSeconds'] },
  { type: 'IBM_POWER', fields: ['id', 'name', 'description', 'type', 'role', 'ipAddress', 'backingStorageProviders', 'cacheRefreshSeconds', 'managedSystem', 'credentials', 'url', 'notificationEmail'], help: ['role', 'credentialId', 'url', 'notificationEmail', 'cacheRefreshSeconds', 'backingStorageProviderIds', 'managedSystem'] },
]

function helpForm(type: string, edit = false, callbacks = { onChange: vi.fn(), onSubmit: vi.fn(), onTagsChange: vi.fn(), onBackingStorageChange: vi.fn() }) {
  return <ProviderCreateForm data={{ ...data, type }} errors={{}} isSubmitting={false}
    credentials={credentials} credentialsLoading={false} credentialsError={false}
    onRetryCredentials={vi.fn()} idDisabled={edit} typeDisabled={edit} {...callbacks} />
}

function expectedCopy(field: string) {
  const copy = expectedHelp.find(item => item.field === field)
  if (!copy) throw new Error('Missing expected help fixture: ' + field)
  return copy
}

function assertHelpMap(help: string[]) {
  const triggers = screen.queryAllByRole('button', { name: /^Help:/ })
  expect(triggers.map(button => button.getAttribute('aria-label')).sort()).toEqual(
    help.map(field => expectedCopy(field).en.trigger).sort(),
  )
  for (const field of help) {
    const copy = expectedCopy(field)
    const trigger = screen.getByRole('button', { name: copy.en.trigger })
    expect(trigger.closest('label')).toBeNull()
    const label = trigger.parentElement?.parentElement?.querySelector('label')
    expect(label).toBeInTheDocument()
    const id = field === 'credentialId' ? 'credentials' : field === 'backingStorageProviderIds' ? 'backingStorageProviders' : field
    expect(label).toHaveAttribute('for', 'create-' + id)
    expect(document.getElementById('create-' + id)).toHaveAccessibleName(label?.textContent ?? undefined)
  }
}

describe('Provider field help', () => {
  it.each(helpMatrix.flatMap(row => [false, true].map(edit => ({ ...row, edit }))))(
    'renders exactly the approved $type fields and help (edit=$edit)', ({ type, fields, help, edit }) => {
      const { container } = render(helpForm(type, edit))
      expect([...container.querySelectorAll('input[id], select[id], button[id]')].map(input => input.id.replace('create-', '')).sort()).toEqual([...fields].sort())
      assertHelpMap(help)
      expect(screen.getByLabelText('Type')).toHaveProperty('disabled', edit)
    },
  )
  it.each(['', 'unknown'])('has no help for type %s', type => {
    render(helpForm(type))
    expect(screen.queryAllByRole('button', { name: /^Help:/ })).toHaveLength(0)
  })
  it('updates help with provider type transitions and removes stale help', () => {
    const view = render(helpForm(''))
    for (const row of [...helpMatrix, ...[...helpMatrix].reverse()]) {
      view.rerender(helpForm(row.type))
      assertHelpMap(row.help)
    }
    view.rerender(helpForm(''))
    expect(screen.queryAllByRole('button', { name: /^Help:/ })).toHaveLength(0)
  })
  it.each(['en', 'sk'] as const)('has exactly thirty translated help keys in %s', language => {
    const dictionary = language === 'en' ? en : sk
    expect(Object.keys(dictionary).filter(key => key.startsWith('providers.fieldHelp.')).sort()).toEqual(
      expectedHelp.flatMap(({ field }) => ['title', 'trigger', 'intro'].map(suffix => 'providers.fieldHelp.' + field + '.' + suffix)).sort(),
    )
  })
  it.each(expectedHelp.flatMap(item => (['en', 'sk'] as const).map(language => ({ ...item, language }))))(
    'shows approved $language copy for $field without changing the form', async ({ field, type, language, ...copy }) => {
      locale.language = language
      const callbacks = { onChange: vi.fn(), onSubmit: vi.fn(), onTagsChange: vi.fn(), onBackingStorageChange: vi.fn() }
      const user = userEvent.setup()
      render(helpForm(type, false, callbacks))
      const expected = copy[language]
      await user.click(screen.getByRole('button', { name: expected.trigger }))
      const dialog = screen.getByRole('dialog', { name: expected.title })
      expect(within(dialog).getByText(expected.intro)).toBeInTheDocument()
      expect(dialog).not.toHaveTextContent('providers.fieldHelp.' + field)
      await user.click(within(dialog).getByRole('button', { name: language === 'en' ? 'Close help' : 'Zavrieť nápovedu' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      for (const callback of Object.values(callbacks)) expect(callback).not.toHaveBeenCalled()
      expect(document.getElementById('create-url')).toHaveValue(data.url)
      expect(document.getElementById('create-role')).toHaveValue('source')
    },
  )
})
