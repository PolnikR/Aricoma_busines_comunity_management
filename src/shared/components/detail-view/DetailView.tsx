import { Children, createContext, Fragment, isValidElement, useContext, useEffect, useId, useRef, useState } from 'react'
import type { ComponentType, CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactElement, ReactNode, SVGProps } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { useResizablePanel } from '@/shared/hooks/useResizablePanel'
import { CloseIcon, MaximizeIcon, PanelRightIcon } from '@/shared/icons/Icons'
import { cn } from '@/shared/utils/cn'

export type DetailViewMode = 'expanded' | 'compact'

interface DetailViewProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  // Object type above the title, e.g. "Recovery group".
  entityLabel?: ReactNode
  // Important states next to the title (badges). Falsy items are skipped.
  statuses?: readonly ReactNode[]
  // One short line of secondary information after the statuses.
  meta?: ReactNode
  // Small actions before the built-in mode toggle and Close, e.g. help.
  headerActions?: ReactNode
  // Right-hand (primary) footer group.
  footer?: ReactNode
  // Left-hand footer group, typically the destructive action.
  footerStart?: ReactNode
  ariaLabel: string
  closeLabel: string
  // DetailViewSection elements (directly or in fragments). Falsy children are skipped.
  children: ReactNode
}

interface DetailViewSectionProps {
  id: string
  title: string
  // Shorter text for the navigation, when the title is long.
  navLabel?: string
  icon?: ComponentType<SVGProps<SVGSVGElement>>
  // Small count or status next to the navigation item.
  count?: ReactNode
  // One line under the section title.
  description?: ReactNode
  // Status or count next to the section title.
  aside?: ReactNode
  // Supporting section (e.g. technical identifiers), listed last and set apart.
  secondary?: boolean
  // Drop the content padding for content that brings its own (inventories, edge-to-edge tables).
  flush?: boolean
  children?: ReactNode
}

const SectionContext = createContext<{ headingId: string; flush: boolean }>({ headingId: '', flush: false })

// Elements hidden by CSS (e.g. the resize handle below `lg`) are not tabbable, so the
// focus trap must skip them too. jsdom has no checkVisibility and keeps them.
function isVisible(element: HTMLElement) {
  return typeof element.checkVisibility !== 'function' || element.checkVisibility()
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// One section of a DetailView. DetailView renders only the active section, so its content
// (and any data it fetches) mounts only while the section is shown. Children are arbitrary
// React content: field groups, status blocks, tables, inventories, loading or error states.
export function DetailViewSection({ title, description, aside, children }: DetailViewSectionProps) {
  const { headingId, flush } = useContext(SectionContext)
  return (
    <>
      <header className={cn('flex items-start gap-4', flush ? 'px-(--detail-gutter) pt-6 pb-4' : 'mb-6')}>
        <div className="min-w-0 flex-1">
          <h3 id={headingId} className="text-base font-semibold leading-6 text-text-primary">{title}</h3>
          {description ? <p className="mt-0.5 text-[13px] text-text-muted">{description}</p> : null}
        </div>
        {aside ? <div className="flex shrink-0 items-center gap-2">{aside}</div> : null}
      </header>
      <div className="flex flex-col gap-7">{children}</div>
    </>
  )
}

// Sections may be passed directly or inside fragments (e.g. `cond ? <>…</> : null`).
function sectionsOf(children: ReactNode): ReactElement<DetailViewSectionProps>[] {
  return Children.toArray(children).flatMap((child) => {
    if (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment) return sectionsOf(child.props.children)
    return isValidElement(child) && child.type === DetailViewSection ? [child as ReactElement<DetailViewSectionProps>] : []
  })
}

// Shared detail surface that replaces DetailDrawer. It opens EXPANDED as a large centred
// dialog: compact header, a vertical section list and exactly one section's content, with
// pinned footer actions. The header toggle switches the same instance into a COMPACT right
// panel (resizable from `lg`) and back; the object, active section and mounted content are
// kept because both modes are one DOM tree with different frame classes. Escape, the
// backdrop and Close close the whole detail; closing resets to expanded on the first section.
// With a single section the navigation is omitted.
export function DetailView({ open, onClose, title, entityLabel, statuses = [], meta, headerActions, footer, footerStart, ariaLabel, closeLabel, children }: DetailViewProps) {
  const { t } = useTranslation()
  const id = useId()
  const [mode, setMode] = useState<DetailViewMode>('expanded')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [wasOpen, setWasOpen] = useState(open)
  // Reset while rendering (React's "adjust state on prop change" pattern), not in an effect.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (!open) {
      setMode('expanded')
      setActiveId(null)
    }
  }
  const compact = mode === 'compact'
  const { width, handleProps } = useResizablePanel({ open: open && compact, resizeLabel: t('detailView.resize') })
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)

  const sections = sectionsOf(children)
  const ordered = [...sections.filter(section => !section.props.secondary), ...sections.filter(section => section.props.secondary)]
  const active = sections.find(section => section.props.id === activeId) ?? sections[0]
  const showNavigation = sections.length > 1
  const headingId = `${id}-${active?.props.id ?? 'section'}-title`
  const statusItems = statuses.filter(Boolean)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
        // tabIndex < 0 drops roving-tabindex items that Tab never reaches.
        .filter(element => !element.hasAttribute('hidden') && element.tabIndex >= 0 && isVisible(element))
      const first = focusable[0]
      const last = focusable.at(-1)
      if (!first || !last) {
        event.preventDefault()
        dialogRef.current?.focus()
        return
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      opener?.focus()
    }
  }, [open])

  if (!open) return null

  // Arrow keys move focus through the section list; Enter/Space select (native buttons).
  const onNavigationKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    const forward = event.key === 'ArrowDown' || event.key === 'ArrowRight'
    const backward = event.key === 'ArrowUp' || event.key === 'ArrowLeft'
    if (!forward && !backward) return
    const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')]
    const index = items.indexOf(document.activeElement as HTMLButtonElement)
    const next = items[(index + (forward ? 1 : -1) + items.length) % items.length]
    event.preventDefault()
    next?.focus()
  }

  return (
    <>
      <div
        className={cn('fixed inset-0 z-40', compact ? 'bg-black/45' : 'bg-black/30')}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        data-mode={mode}
        className={cn(
          'fixed z-50 flex flex-col overflow-hidden bg-surface',
          compact
            ? 'inset-y-0 right-0 w-[min(420px,92vw)] border-l border-border shadow-[-14px_0_40px_-20px_rgba(20,35,70,0.4)] lg:w-(--detail-view-width) lg:max-w-[92vw] [--detail-gutter:1.25rem]'
            : 'top-1/2 left-1/2 h-[min(46rem,calc(100dvh-2rem))] w-[min(60rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border shadow-lg [--detail-gutter:1.25rem] sm:[--detail-gutter:2rem]',
        )}
        style={compact ? { '--detail-view-width': `${String(width)}px` } as CSSProperties : undefined}
      >
        {compact ? (
          <div
            {...handleProps}
            className="absolute inset-y-0 left-0 z-10 hidden w-1.5 cursor-col-resize bg-transparent transition hover:bg-accent/30 focus:bg-accent/40 focus:outline-none lg:block"
          />
        ) : null}

        <header className="flex shrink-0 items-start gap-3 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            {entityLabel ? <p className="text-xs font-medium text-text-muted">{entityLabel}</p> : null}
            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
              <h2 className="line-clamp-2 min-w-0 text-lg font-semibold leading-7 text-text-primary wrap-anywhere">{title}</h2>
              {statusItems.length > 0 ? <div className="flex flex-wrap items-center gap-1.5">{statusItems.map((status, index) => (
                // Statuses are positional and rendered in the given order.
                <span key={index} className="inline-flex">{status}</span>
              ))}</div> : null}
              {meta ? <span className="min-w-0 text-xs text-text-muted wrap-anywhere">{meta}</span> : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => { setMode(compact ? 'expanded' : 'compact') }}
              className="hidden h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-text-secondary transition hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15 sm:inline-flex"
            >
              {compact ? <MaximizeIcon className="size-3.5" /> : <PanelRightIcon className="size-3.5" />}
              {compact ? t('detailView.expand') : t('detailView.compactView')}
            </button>
            {headerActions}
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15"
            >
              <CloseIcon className="size-4" />
            </button>
          </div>
        </header>

        <div className={cn('flex min-h-0 flex-1 flex-col', compact ? undefined : 'sm:flex-row')}>
          {showNavigation ? (
            <nav
              aria-label={t('detailView.sections')}
              onKeyDown={onNavigationKeyDown}
              className={cn(
                'flex shrink-0 gap-1 overflow-x-auto border-b border-border px-4 py-2 [scrollbar-width:none]',
                compact ? undefined : 'sm:w-52 sm:flex-col sm:overflow-y-auto sm:border-r sm:border-b-0 sm:px-3 sm:py-4',
              )}
            >
              {ordered.map((section) => {
                const { id: sectionId, title: sectionTitle, navLabel, icon: Icon, count, secondary } = section.props
                const selected = section === active
                return (
                  <button
                    key={sectionId}
                    type="button"
                    aria-current={selected ? 'true' : undefined}
                    onClick={() => { setActiveId(sectionId) }}
                    className={cn(
                      'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] leading-5 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15',
                      selected ? 'bg-accent-soft font-semibold text-accent' : 'font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                      secondary && !compact ? 'sm:mt-auto' : undefined,
                    )}
                  >
                    {Icon ? <Icon className={cn('size-4 shrink-0', selected ? undefined : 'text-text-subtle')} aria-hidden="true" /> : null}
                    <span className="min-w-0 flex-1 whitespace-nowrap sm:whitespace-normal">{navLabel ?? sectionTitle}</span>
                    {count !== undefined && count !== null ? (
                      <span aria-hidden="true" className={cn('text-[11px] tabular-nums', selected ? undefined : 'text-text-subtle')}>{count}</span>
                    ) : null}
                  </button>
                )
              })}
            </nav>
          ) : null}

          {active ? (
            <div
              // Keyed by section, so a newly selected section starts at the top.
              key={active.props.id}
              role="region"
              aria-labelledby={headingId}
              className={cn(
                'custom-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto @container/detail-content',
                active.props.flush ? 'pb-6' : 'px-(--detail-gutter) py-6',
              )}
            >
              <SectionContext.Provider value={{ headingId, flush: Boolean(active.props.flush) }}>
                {active}
              </SectionContext.Provider>
            </div>
          ) : null}
        </div>

        {footer || footerStart ? (
          <footer className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-t border-border px-5 py-3 sm:px-6">
            {footerStart ? <div className="flex flex-wrap items-center gap-3">{footerStart}</div> : null}
            {footer ? <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-3">{footer}</div> : null}
          </footer>
        ) : null}
      </div>
    </>
  )
}
