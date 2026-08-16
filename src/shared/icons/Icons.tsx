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

export function ExecutionIcon(props: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="m8.25 6.75 5 3.25-5 3.25v-6.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

export function MonitoringIcon(props: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M2.5 10h3l1.75-4.5 3.1 9 2.15-6 1.25 1.5h3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.333 3.333h13.334v13.334H3.333V3.333Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
    </svg>
  )
}

export function ApiIcon(props: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="m7.25 5-4 5 4 5M12.75 5l4 5-4 5M11.5 3.75l-3 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="m12.5 15-5-5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="m7.5 5 5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

export function MoonIcon(props: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M16.25 11.43A6.67 6.67 0 0 1 8.57 3.75 6.67 6.67 0 1 0 16.25 11.43Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CpuIcon(props: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <rect x="5" y="5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 8h4v4H8V8ZM7 2.5V5m3-2.5V5m3-2.5V5M7 15v2.5m3-2.5v2.5m3-2.5v2.5M2.5 7H5m-2.5 3H5m-2.5 3H5M15 7h2.5M15 10h2.5M15 13h2.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  )
}

export function MemoryIcon(props: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <rect x="2.5" y="5" width="15" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 8v4m2.667-4v4m2.666-4v4M14 8v4M5 15v2m3.333-2v2m3.334-2v2M15 15v2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  )
}

export function LayersIcon(props: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="m10 2.5 7.5 3.75L10 10 2.5 6.25 10 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="m2.5 10 7.5 3.75L17.5 10M2.5 13.75 10 17.5l7.5-3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function FilterIcon(props: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M16.667 4.167H3.333l5.334 6.308v4.358l2.666 1.334v-5.692l5.334-6.308Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="m4.167 10.417 3.333 3.333 8.333-8.333" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ExternalLinkIcon(props: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M8.333 5H5a1.667 1.667 0 0 0-1.667 1.667v8.333A1.667 1.667 0 0 0 5 16.667h8.333A1.667 1.667 0 0 0 15 15v-3.333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.667 3.333H16.667V8.333M16.667 3.333 9.167 10.833" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function SignOutIcon(props: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function RefreshIcon(props: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M17.5 8.333A6.667 6.667 0 0 0 5.417 4.167M2.5 11.667a6.667 6.667 0 0 0 12.083 4.166" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.5 6.667v1.666h-1.667M2.5 13.333v-1.666h1.667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M10 1.667 3.75 4.5v4.167c0 4.583 6.25 8.333 6.25 8.333s6.25-3.75 6.25-8.333V4.5L10 1.667Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="m7.5 10 1.667 1.667 3.333-3.334" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
