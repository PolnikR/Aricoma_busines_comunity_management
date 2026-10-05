import { FilterIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import type { ProviderScopeDisplay } from '../helpers/providerScopeDisplay'

const chipClassName = 'inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border border-accent/25 bg-surface px-1.5 py-0.5 text-text-secondary'

export function RecoveryGroupProviderScope({ scope }: { scope: ProviderScopeDisplay }) {
  const { t } = useTranslation()
  const moreTagsLabel = t('pages.recoveryGroupBuilder.provider.scope.moreTags', { count: scope.additionalTagCount })

  return (
    // No role/aria-label here: inside the card <button> a labelled group would
    // replace the chip values in the button's accessible name.
    <span data-testid="provider-scope" className="flex min-w-0 flex-wrap items-center gap-1 text-[11px]">
      <span className="sr-only">{t('pages.virtualMachines.inventory.providerFilter')}:</span>
      <FilterIcon aria-hidden="true" data-testid="provider-scope-icon" className="size-3 shrink-0 text-accent" />
      {scope.prefix ? (
        <span className={chipClassName} title={`${t('pages.virtualMachines.inventory.vmName')} ${scope.prefix}*`}>
          <span className="shrink-0">{t('pages.virtualMachines.inventory.vmName')}</span>
          <strong className="truncate font-semibold text-text-primary">{scope.prefix}*</strong>
        </span>
      ) : null}
      {scope.tag ? (
        <span className={chipClassName} title={`${t('pages.virtualMachines.inventory.vmTag')} ${scope.tag}`}>
          <span className="shrink-0">{t('pages.virtualMachines.inventory.vmTag')}</span>
          <strong className="truncate font-semibold text-text-primary">{scope.tag}</strong>
        </span>
      ) : null}
      {scope.additionalTagCount > 0 ? (
        <span
          className="inline-flex shrink-0 items-center rounded-full border border-border bg-surface-muted px-1.5 py-0.5 font-semibold text-text-secondary"
          title={moreTagsLabel}
        >
          <span aria-hidden="true">+{scope.additionalTagCount}</span>
          <span className="sr-only">{moreTagsLabel}</span>
        </span>
      ) : null}
    </span>
  )
}
