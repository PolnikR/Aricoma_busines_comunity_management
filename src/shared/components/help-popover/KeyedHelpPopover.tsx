import type { ReactNode } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { HelpPopover } from './HelpPopover'

interface KeyedHelpPopoverProps {
  // Locale key prefix, e.g. `providers.help`.
  helpKey: string
  // Section ids rendered in order under the intro.
  sections: readonly string[]
  width?: 'default' | 'wide'
  // Feature-specific content rendered after the key-driven sections.
  children?: ReactNode
}

// A HelpPopover whose texts follow one locale key convention, so every detail
// view's "?" reads the same way:
//   `${helpKey}.trigger`  accessible label of the "?" button
//   `${helpKey}.title`    popover title
//   `${helpKey}.intro`    first paragraph
//   `${helpKey}.${section}.title` / `.text`  one short section each
// The close button uses the shared `help.close`.
export function KeyedHelpPopover({ helpKey, sections, width, children }: KeyedHelpPopoverProps) {
  const { t } = useTranslation()

  return (
    <HelpPopover
      triggerLabel={t(`${helpKey}.trigger`)}
      title={t(`${helpKey}.title`)}
      closeLabel={t('help.close')}
      {...(width ? { width } : {})}
    >
      <p>{t(`${helpKey}.intro`)}</p>
      {sections.map(section => (
        <section key={section}>
          <h4 className="font-semibold text-text-primary">{t(`${helpKey}.${section}.title`)}</h4>
          <p>{t(`${helpKey}.${section}.text`)}</p>
        </section>
      ))}
      {children}
    </HelpPopover>
  )
}
