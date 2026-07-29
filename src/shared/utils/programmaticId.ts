export function toProgrammaticId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function isProgrammaticIdAvailable(
  value: string,
  existingIds: string[],
  currentId?: string,
): boolean {
  const normalizedId = toProgrammaticId(value)
  return normalizedId !== ''
    && (normalizedId === currentId || !existingIds.includes(normalizedId))
}

export function generateProgrammaticId(name: string, existingIds: string[]): string {
  const baseId = toProgrammaticId(name)
  if (baseId && !existingIds.includes(baseId)) return baseId

  let counter = 2
  while (existingIds.includes(`${baseId}_${String(counter)}`)) {
    counter++
  }
  return baseId ? `${baseId}_${String(counter)}` : ''
}
