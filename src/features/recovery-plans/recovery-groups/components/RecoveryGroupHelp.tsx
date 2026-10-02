import { HelpPopover } from '@/shared/components/help-popover/HelpPopover'
import { useTranslation } from '@/hooks/useTranslation'

const SECTIONS = ['local', 'remote', 'flashCopy', 'metroMirror', 'orchestration'] as const

// The "?" in the recovery group drawer header: how a group relates to its
// storage protection and to orchestration. Content only; the shell is shared.
export function RecoveryGroupHelp() {
  const { t } = useTranslation()

  return (
    <HelpPopover
      triggerLabel={t('recoveryGroups.help.trigger')}
      title={t('recoveryGroups.help.title')}
      closeLabel={t('recoveryGroups.help.close')}
    >
      <p>{t('recoveryGroups.help.intro')}</p>
      {SECTIONS.map(section => (
        <section key={section}>
          <h4 className="font-semibold text-text-primary">{t(`recoveryGroups.help.${section}.title`)}</h4>
          <p>{t(`recoveryGroups.help.${section}.text`)}</p>
        </section>
      ))}
    </HelpPopover>
  )
}
