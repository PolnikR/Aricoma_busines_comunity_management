// Display formatting for absolute instants. Intl.DateTimeFormat applies the browser session's timezone
// whenever no `timeZone` option is passed. Strings are accepted only with `Z` or an explicit offset;
// naive and date-only strings are rejected instead of being guessed as UTC or local time.

export const DATE_FALLBACK = '—'

const EXPLICIT_TIMEZONE_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/
const FIELD_OPTIONS = ['weekday', 'era', 'year', 'month', 'day', 'dayPeriod', 'hour', 'minute', 'second', 'fractionalSecondDigits', 'timeZoneName'] as const

export type DateTimeInput = string | Date | null | undefined

export interface DateTimeFormatOptions extends Intl.DateTimeFormatOptions {
  /** App language (`sk`, `cs`, `en`). Omitted → the browser's default locale. */
  language?: string
}

export function getBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function toDateLocale(language?: string): string | undefined {
  if (language === undefined) return undefined
  if (language === 'sk') return 'sk-SK'
  if (language === 'cs') return 'cs-CZ'
  return 'en-GB'
}

export function hasExplicitTimeZone(value: string): boolean {
  return EXPLICIT_TIMEZONE_ISO.test(value)
}

export function parseTimestamp(value: DateTimeInput): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (!value || !hasExplicitTimeZone(value)) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function format(value: DateTimeInput, options: DateTimeFormatOptions, defaults: Intl.DateTimeFormatOptions): string {
  const date = parseTimestamp(value)
  if (!date) return DATE_FALLBACK
  const { language, ...intlOptions } = options
  const hasStyle = intlOptions.dateStyle !== undefined || intlOptions.timeStyle !== undefined
  const hasFields = FIELD_OPTIONS.some(key => intlOptions[key] !== undefined)
  const resolved = hasStyle || hasFields ? intlOptions : { ...defaults, ...intlOptions }
  return new Intl.DateTimeFormat(toDateLocale(language), resolved).format(date)
}

export function formatDateTime(value: DateTimeInput, options: DateTimeFormatOptions = {}): string {
  return format(value, options, { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatDate(value: DateTimeInput, options: DateTimeFormatOptions = {}): string {
  return format(value, options, { dateStyle: 'medium' })
}

export function formatTime(value: DateTimeInput, options: DateTimeFormatOptions = {}): string {
  return format(value, options, { timeStyle: 'short' })
}
