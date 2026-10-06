import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Badge } from '@/shared/components/badge/Badge'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { ResponseBodyViewer } from '@/shared/components/response-body/ResponseBodyViewer'
import { AlertTriangleIcon, ChevronDownIcon, DiskIcon } from '@/shared/icons/Icons'
import { cn } from '@/shared/utils/cn'
import { useTranslation } from '@/hooks/useTranslation'
import { useGetRecoveryGroupInventory } from '@/generated/query/recovery-groups/recovery-groups.gen'
import { selectRecoveryGroupInventory } from '../model/recoveryGroupTypes'
import { countLabel } from '../helpers/countLabel'
import { RecoveryGroupFlashCopyFanOut } from './RecoveryGroupFlashCopyFanOut'
import { RecoveryGroupMetroMirrorStatus } from './RecoveryGroupMetroMirrorStatus'
import { RecoveryGroupReplicationChain } from './RecoveryGroupReplicationChain'

interface RecoveryGroupInventoryProps {
  runId: string | null
  active: boolean
}

function GroupHeader({ title, description }: { title: ReactNode; description: string }) {
  return (
    <header className="mb-3.5">
      <h4 className="text-[13px] font-semibold leading-5 text-text-primary">{title}</h4>
      <p className="text-xs text-text-muted">{description}</p>
    </header>
  )
}

// Recovery group inventory: Metro Mirror status, the replication chain (master → Metro
// Mirror → auxiliary → FlashCopy → snapshots) and the auxiliary volumes with their
// FlashCopy fan-out. The chain and the list highlight each other's row, and the chain's
// auxiliary or snapshot nodes reveal the volume in the list.
export function RecoveryGroupInventory({ runId, active }: RecoveryGroupInventoryProps) {
  const { t, language } = useTranslation()
  const query = useGetRecoveryGroupInventory({ run_id: runId ?? '' }, { query: { select: selectRecoveryGroupInventory, enabled: active && Boolean(runId) } })
  const [openVolumes, setOpenVolumes] = useState<ReadonlySet<string>>(() => new Set())
  const [chainActive, setChainActive] = useState<string | null>(null)
  const [listActive, setListActive] = useState<string | null>(null)
  const [revealRequest, setRevealRequest] = useState<{ name: string } | null>(null)
  const rows = useRef(new Map<string, HTMLDetailsElement>())

  // After the requested row has rendered open: bring it into view and move focus to it.
  useEffect(() => {
    if (!revealRequest) return
    const details = rows.current.get(revealRequest.name)
    if (!details) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    details.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' })
    details.querySelector('summary')?.focus({ preventScroll: true })
  }, [revealRequest])

  if (!runId) return <p className="px-5 py-6 text-sm text-text-subtle">{t('recoveryInventory.noRun')}</p>
  if (query.isLoading) return <p className="px-5 py-6 text-sm text-text-subtle">{t('recoveryInventory.loading')}</p>
  if (query.error) {
    return <FetchErrorAlert className="m-5" title={t('recoveryInventory.error')} retryLabel={t('buttons.retry')} isRetrying={query.isFetching} onRetry={() => { void query.refetch() }} />
  }
  if (!query.data) return null

  const inventory = query.data
  const metroMirror = inventory.metro_mirror ?? null
  const volumes = Object.entries(inventory.volumes)
  const setOpen = (name: string, open: boolean) => {
    setOpenVolumes((current) => {
      if (current.has(name) === open) return current
      const next = new Set(current)
      if (open) next.add(name)
      else next.delete(name)
      return next
    })
  }
  const reveal = (name: string) => {
    setOpen(name, true)
    setRevealRequest({ name })
  }

  return (
    <div className="flex flex-col gap-7 px-5 py-4">
      {metroMirror ? (
        <>
          {metroMirror.error || metroMirror.consistency_group ? (
            <section>
              <GroupHeader title={t('recoveryInventory.metroMirror.title')} description={t('recoveryInventory.metroMirror.description')} />
              <RecoveryGroupMetroMirrorStatus metroMirror={metroMirror} />
            </section>
          ) : null}
          {metroMirror.error ? null : (
            <section>
              <GroupHeader title={t('recoveryInventory.chain.title')} description={t('recoveryInventory.chain.description')} />
              <RecoveryGroupReplicationChain
                metroMirror={metroMirror}
                volumes={inventory.volumes}
                activeAuxiliary={listActive}
                onActiveAuxiliaryChange={setChainActive}
                onReveal={reveal}
              />
            </section>
          )}
        </>
      ) : null}

      <section className={metroMirror ? 'border-t border-border/70 pt-7' : undefined}>
        <GroupHeader
          title={<>{t('recoveryInventory.auxiliary.title')} <span className="font-mono text-xs font-normal text-text-subtle">· {inventory.provider_id_volume ?? '—'}</span></>}
          description={t('recoveryInventory.auxiliary.description')}
        />
        {volumes.length === 0 ? <p className="text-sm text-text-subtle">{t('recoveryInventory.empty')}</p> : (
          <ul className="divide-y divide-border/60 border-y border-border/60">
            {volumes.map(([name, volume]) => {
              const relations = countLabel(t, language, 'recoveryInventory.summary.relations', volume.relations.length)
              return (
                <li
                  key={name}
                  data-highlight={chainActive === name ? 'on' : 'idle'}
                  className="rounded-lg transition-colors duration-150 data-[highlight=on]:bg-accent-soft/40 dark:data-[highlight=on]:bg-accent-soft/35"
                  onPointerEnter={() => { setListActive(name) }}
                  onPointerLeave={() => { setListActive(null) }}
                  onFocus={() => { setListActive(name) }}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) setListActive(null)
                  }}
                >
                  <details
                    ref={(element) => {
                      if (element) rows.current.set(name, element)
                      else rows.current.delete(name)
                    }}
                    open={openVolumes.has(name)}
                    onToggle={(event) => { setOpen(name, event.currentTarget.open) }}
                    className="group scroll-mt-4"
                  >
                    <summary className="grid cursor-pointer list-none grid-cols-[1rem_1.375rem_minmax(0,1fr)_auto] items-center gap-x-2.5 rounded-lg px-1.5 py-2 marker:hidden hover:bg-surface-hover/60 group-open:bg-surface-muted/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15 @min-[600px]/detail-content:grid-cols-[1rem_1.375rem_minmax(0,1fr)_auto_auto]">
                      <ChevronDownIcon className="size-4 -rotate-90 text-text-subtle transition-transform group-open:rotate-0" />
                      <span className={cn('grid size-5.5 place-items-center rounded-md', volume.found ? 'bg-accent-soft text-accent' : 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500')}>
                        {volume.found ? <DiskIcon className="size-3.25" aria-hidden="true" /> : <AlertTriangleIcon className="size-3.25" aria-hidden="true" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold text-text-primary" title={name}>{name}</span>
                        <span className="block text-[11px] text-text-muted @min-[600px]/detail-content:hidden">{relations}</span>
                      </span>
                      <span className="hidden text-xs text-text-muted @min-[600px]/detail-content:inline">{relations}</span>
                      <Badge color={volume.found ? 'success' : 'error'} size="sm">{t(volume.found ? 'recoveryInventory.found' : 'recoveryInventory.notFound')}</Badge>
                    </summary>
                    {openVolumes.has(name) ? (
                      <div className="px-1.5 pt-2 pb-3 @min-[600px]/detail-content:pl-11.5">
                        <RecoveryGroupFlashCopyFanOut name={name} volume={volume} />
                        <div className="mt-2" aria-label={t('recoveryInventory.showTechnicalJson')}>
                          <ResponseBodyViewer data={volume} defaultOpen={false} />
                        </div>
                      </div>
                    ) : null}
                  </details>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
