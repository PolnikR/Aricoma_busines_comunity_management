const UNIT_MULTIPLIERS: Record<string, number> = {
  B: 1,
  KB: 1_000,
  MB: 1_000_000,
  GB: 1_000_000_000,
  TB: 1_000_000_000_000,
  KIB: 1_024,
  MIB: 1_048_576,
  GIB: 1_073_741_824,
  TIB: 1_099_511_627_776,
}

export function parseCapacityBytes(value: string): number | null {
  const match = /^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB|KiB|MiB|GiB|TiB)$/i.exec(value.trim())
  if (!match) return null

  const amountText = match[1]
  const unit = match[2]
  if (amountText === undefined || unit === undefined) return null
  const amount = Number(amountText)
  const multiplier = UNIT_MULTIPLIERS[unit.toUpperCase()]
  if (!Number.isFinite(amount) || multiplier === undefined) return null
  return amount * multiplier
}

export function formatCapacityBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1000)), units.length - 1)
  const value = bytes / (1000 ** exponent)
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${units[exponent] ?? 'B'}`
}
