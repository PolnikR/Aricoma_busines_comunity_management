import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

export function GridIcon(props: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M4.167 4.167h4.166v4.166H4.167V4.167ZM11.667 4.167h4.166v4.166h-4.166V4.167ZM4.167 11.667h4.166v4.166H4.167v-4.166ZM11.667 11.667h4.166v4.166h-4.166v-4.166Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

export function ServerIcon(props: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M4.167 4.167h11.666v4.166H4.167V4.167ZM4.167 11.667h11.666v4.166H4.167v-4.166Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M6.667 6.25h.008M6.667 13.75h.008" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15.833 10a5.83 5.83 0 0 0-.075-.917l1.55-1.2-1.667-2.886-1.824.733a5.86 5.86 0 0 0-1.592-.917L11.95 2.5H8.617l-.275 2.313a5.86 5.86 0 0 0-1.592.917l-1.824-.733-1.667 2.886 1.55 1.2a5.78 5.78 0 0 0 0 1.834l-1.55 1.2 1.667 2.886 1.824-.733a5.86 5.86 0 0 0 1.592.917l.275 2.317h3.333l.275-2.317a5.86 5.86 0 0 0 1.592-.917l1.824.733 1.667-2.886-1.55-1.2c.05-.3.075-.606.075-.917Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
    </svg>
  )
}

export function PlugIcon(props: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M7.5 2.5v4.167M12.5 2.5v4.167M6.667 6.667h6.666v2.5a3.333 3.333 0 0 1-6.666 0v-2.5ZM10 12.5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function MenuIcon(props: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M3.333 5h13.334M3.333 10h13.334M3.333 15h13.334" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M9.167 15.833a6.667 6.667 0 1 0 0-13.333 6.667 6.667 0 0 0 0 13.333ZM14.167 14.167l3.333 3.333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}