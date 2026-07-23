export function formatStartTime(isoTime: string): string {
  if (!isoTime) return '-'
  const match = /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(isoTime)
  const yy = match?.[1]
  const mm = match?.[2]
  const dd = match?.[3]
  const hh = match?.[4]
  const min = match?.[5]
  if (!yy || !mm || !dd || !hh || !min) return isoTime
  const year = `20${yy}`
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthName = monthNames[Number(mm) - 1] ?? 'Jan'
  return `${monthName} ${String(Number(dd))}, ${year} ${hh}:${min}`
}
