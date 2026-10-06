import { RelationshipGraph, RelationshipNode } from '@/shared/components/relationship-graph'
import { CopyIcon, DiskIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import { providerObjectLabel } from '../helpers/providerObjectLabel'
import type { InventoryVolumeOutput } from '../helpers/metroMirrorPresentation'

interface RecoveryGroupFlashCopyFanOutProps {
  name: string
  volume: InventoryVolumeOutput
}

// One auxiliary volume fans out to its FlashCopy snapshots: the source is drawn once, a
// protection-tone lane leads to a spine and each snapshot hangs off it. Only the snapshot
// list scrolls (max 240 px), with its header pinned. Feature-local: no other one-to-many
// relationship uses this shape yet.
export function RecoveryGroupFlashCopyFanOut({ name, volume }: RecoveryGroupFlashCopyFanOutProps) {
  const { t } = useTranslation()
  if (volume.relations.length === 0) return <p className="py-1 text-xs italic text-text-subtle">{t('recoveryInventory.noRelations')}</p>
  const targets = volume.relations.filter(relation => relation.role === 'source').map(relation => providerObjectLabel(relation.paired_volume))
  const sources = volume.relations.filter(relation => relation.role === 'target').map(relation => providerObjectLabel(relation.paired_volume))

  return (
    <div className="@container/fan">
      <div className="grid grid-cols-1 gap-y-1.5 @min-[34rem]/fan:grid-cols-[minmax(0,14rem)_6rem_minmax(0,1fr)] @min-[34rem]/fan:gap-y-0">
        <RelationshipGraph edges={[]} density="compact">
          <RelationshipNode
            entityId={`fan-out:${name}`}
            icon={DiskIcon}
            tone="storage"
            name={name}
            nameLines={2}
            meta={<span>{t('recoveryInventory.fanOut.source')}</span>}
            description={t('recoveryInventory.fanOut.sourceDescription')}
          />
        </RelationshipGraph>
        {targets.length > 0 ? (
          <>
            <div aria-hidden="true" className="relative hidden text-theme-pink-500 @min-[34rem]/fan:block">
              <p className="absolute top-1.5 left-2.5 text-[11px] leading-4 font-semibold">{t('recoveryInventory.chain.flashCopy')}</p>
              <span className="absolute top-6.5 right-0 left-0 h-0.5 bg-current/60" />
            </div>
            <div aria-hidden="true" className="flex items-center gap-2 pl-3 text-theme-pink-500 @min-[34rem]/fan:hidden">
              <span className="h-5 w-0.5 bg-current/60" />
              <span className="text-[11px] font-semibold">{t('recoveryInventory.chain.flashCopy')}</span>
            </div>
            <div className="min-w-0 pl-3 @min-[34rem]/fan:pl-0">
              <div
                tabIndex={0}
                role="region"
                aria-label={t('recoveryInventory.fanOut.list', { name })}
                className="custom-scrollbar max-h-60 overflow-y-auto overscroll-contain rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15"
              >
                <div className="sticky top-0 z-1 flex items-center justify-between gap-2 bg-surface px-1 pb-1 text-[11px] font-medium text-text-muted">
                  <span>{t('recoveryInventory.fanOut.snapshots')}</span>
                  <span className="tabular-nums">{targets.length}</span>
                </div>
                <ul className="pr-1">
                  {targets.map((target, index) => (
                    <li
                      key={`${target}-${String(index)}`}
                      className="relative py-1 pl-6 before:absolute before:top-0 before:bottom-0 before:left-0 before:w-0.5 before:bg-theme-pink-500/60 last:before:bottom-1/2 after:absolute after:top-1/2 after:left-0 after:h-0.5 after:w-4 after:-translate-y-1/2 after:bg-theme-pink-500/60"
                    >
                      <svg viewBox="0 0 10 10" aria-hidden="true" className="absolute top-1/2 left-3.5 size-2.5 -translate-y-1/2 fill-theme-pink-500/80"><path d="M0 0 10 5 0 10z" /></svg>
                      <span className="flex min-w-0 items-center gap-1.5 rounded-md border border-border bg-surface px-1.5 py-1">
                        <span className="grid size-4.5 shrink-0 place-items-center rounded bg-theme-pink-500/10 text-theme-pink-500 dark:bg-theme-pink-500/20">
                          <CopyIcon className="size-2.75" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 truncate font-mono text-[11.5px] text-text-secondary" title={target}>{target}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        ) : null}
      </div>
      {sources.length > 0 ? (
        <p className="mt-2 text-[11px] text-text-muted">
          {t('recoveryInventory.fanOut.alsoTarget', { names: sources.join(', ') })}
        </p>
      ) : null}
    </div>
  )
}
