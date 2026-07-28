export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
}

export function isTierIdAvailable(
  value: string,
  existingIds: string[],
  currentId?: string,
): boolean {
  const normalizedId = slugify(value)
  return normalizedId !== ''
    && (normalizedId === currentId || !existingIds.includes(normalizedId))
}

export function generateTierId(name: string, existingIds: string[]): string {
  const baseSlug = slugify(name)

  if (!existingIds.includes(baseSlug) && baseSlug !== '') {
    return baseSlug
  }

  let counter = baseSlug === '' ? 1 : 2
  while (existingIds.includes(`${baseSlug}_${String(counter)}`)) {
    counter++
  }

  return `${baseSlug}_${String(counter)}`
}
