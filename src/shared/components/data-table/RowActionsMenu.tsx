import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'

const MENU_WIDTH = 160
const VIEWPORT_GAP = 8
const TRIGGER_GAP = 4

interface RowActionsMenuProps {
  triggerRef: React.RefObject<HTMLButtonElement | null>
  open: boolean
  onClose: () => void
  ariaLabel: string
  editLabel: string
  editDisabled?: boolean
  editDisabledTitle?: string
  deleteLabel: string
  edit: () => void
  delete: () => void
  rollback?: {
    label: string
    onRollback: () => void
    disabled: boolean
    disabledTitle?: string
  }
}

export function RowActionsMenu({
  triggerRef,
  open,
  onClose,
  ariaLabel,
  editLabel,
  editDisabled = false,
  editDisabledTitle,
  deleteLabel,
  edit,
  delete: onDelete,
  rollback,
}: RowActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<CSSProperties>({})
  const menuId = useId()

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const width = MENU_WIDTH
    const maxLeft = Math.max(VIEWPORT_GAP, window.innerWidth - width - VIEWPORT_GAP)
    const left = Math.min(Math.max(rect.right - width, VIEWPORT_GAP), maxLeft)

    setPosition({
      left,
      top: rect.bottom + TRIGGER_GAP,
      width,
    })
  }, [triggerRef])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return

    const handleViewportChange = () => { updatePosition() }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        onClose()
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('scroll', handleViewportChange, true)
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('scroll', handleViewportChange, true)
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose, updatePosition, triggerRef])

  if (!open) return null

  return createPortal(
    <div
      ref={menuRef}
      id={menuId}
      role="menu"
      aria-label={ariaLabel}
      style={position}
      className="fixed z-50 min-w-40 bg-surface border border-border rounded-lg shadow-lg"
      onClick={(e) => { e.stopPropagation() }}
    >
      <button
        role="menuitem"
        disabled={editDisabled}
        title={editDisabled ? editDisabledTitle : undefined}
        aria-disabled={editDisabled}
        className={`w-full text-left px-4 py-2 text-sm transition-colors first:rounded-t-lg ${editDisabled ? 'cursor-not-allowed text-text-muted opacity-60' : 'text-text-primary hover:bg-surface-subtle'}`}
        onClick={(e) => {
          e.stopPropagation()
          if (editDisabled) return
          edit()
          onClose()
        }}
      >
        {editLabel}
      </button>
      <button
        role="menuitem"
        className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-subtle transition-colors border-t border-border"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
          onClose()
        }}
      >
        {deleteLabel}
      </button>
      {rollback && (
        <button
          role="menuitem"
          className={`w-full text-left px-4 py-2 text-sm transition-colors border-t border-border last:rounded-b-lg ${
            rollback.disabled
              ? 'text-red-400 opacity-50 cursor-not-allowed'
              : 'text-red-600 hover:bg-surface-subtle'
          }`}
          disabled={rollback.disabled}
          title={rollback.disabledTitle}
          onClick={(e) => {
            e.stopPropagation()
            if (!rollback.disabled) {
              rollback.onRollback()
              onClose()
            }
          }}
        >
          {rollback.label}
        </button>
      )}
    </div>,
    document.body,
  )
}
