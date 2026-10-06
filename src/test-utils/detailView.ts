import { fireEvent, within } from '@testing-library/react'

// DetailView renders one section at a time. These helpers open sections by their navigation
// item, so a test can assert content that used to be visible all at once in DetailDrawer.

function navigation(dialog: HTMLElement) {
  return within(dialog).queryByRole('navigation', { name: 'Sections' })
}

// Opens a section by its navigation label and returns its region.
export function openDetailSection(dialog: HTMLElement, name: string) {
  const nav = navigation(dialog)
  if (nav) fireEvent.click(within(nav).getByRole('button', { name }))
  return within(dialog).getByRole('region', { name })
}

// Visits every section (or the only one) and returns all field labels (<dt>) in order.
export function detailSectionsLabels(dialog: HTMLElement) {
  const nav = navigation(dialog)
  const labelsOf = () => within(dialog).getByRole('region').querySelectorAll('dt')
  const regions = nav
    ? within(nav).getAllByRole('button').map((button) => { fireEvent.click(button); return [...labelsOf()] })
    : [[...labelsOf()]]
  return regions.flat().map((term) => term.textContent)
}

// Visits every section (or the only one) and maps each field label to its value text.
export function detailSectionsFields(dialog: HTMLElement) {
  const nav = navigation(dialog)
  const fieldsOf = () => [...within(dialog).getByRole('region').querySelectorAll('dt')]
    .map((term) => [term.textContent, term.nextElementSibling?.textContent ?? ''] as const)
  const fields = nav
    ? within(nav).getAllByRole('button').flatMap((button) => { fireEvent.click(button); return fieldsOf() })
    : fieldsOf()
  return Object.fromEntries(fields)
}

// Visits every section (or the only one) and returns their text, joined by " | ".
export function detailSectionsText(dialog: HTMLElement) {
  const nav = navigation(dialog)
  if (!nav) return within(dialog).getByRole('region').textContent
  return within(nav).getAllByRole('button').map((button) => {
    fireEvent.click(button)
    return within(dialog).getByRole('region').textContent
  }).join(' | ')
}
