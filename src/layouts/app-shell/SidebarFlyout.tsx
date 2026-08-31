import type { KeyboardEvent } from 'react'
import { NavLink } from 'react-router'

interface SidebarFlyoutItem {
  name: string
  path: string
}

interface SidebarFlyoutProps {
  title: string
  items: SidebarFlyoutItem[]
  isItemActive: (path: string) => boolean
  onNavigate: () => void
}

/**
 * Sub-navigation shown beside the collapsed icon rail. With no items it is a
 * plain label, which is what the top-level entries without a submenu need.
 */
export function SidebarFlyout({ title, items, isItemActive, onNavigate }: SidebarFlyoutProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      // Releasing focus closes the flyout, which is driven by group-focus-within.
      (document.activeElement as HTMLElement | null)?.blur()
    }
  }

  return (
    <div
      onKeyDown={handleKeyDown}
      className="pointer-events-none invisible absolute left-full top-0 z-50 ml-2 min-w-[192px] rounded-xl border border-border-strong bg-surface p-1.5 opacity-0 shadow-[0_18px_40px_-18px_rgba(20,50,90,0.45)] transition duration-150 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100"
    >
      <p className={`px-2 text-[11px] font-semibold text-text-primary ${items.length > 0 ? 'border-b border-border pb-1.5 pt-1' : 'py-1'}`}>
        {title}
      </p>

      {items.length > 0 ? (
        <ul className="mt-1.5 space-y-0.5">
          {items.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                onClick={onNavigate}
                className={`block rounded-lg px-2 py-1.5 text-xs font-medium transition ${isItemActive(item.path) ? 'bg-accent-soft text-accent' : 'text-text-muted hover:bg-surface-muted hover:text-text-secondary'}`}
              >
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
