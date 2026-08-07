export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginationResult<T> {
  data: T[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number,
): PaginationResult<T> {
  const totalItems = items.length
  const totalPages = Math.ceil(totalItems / pageSize)
  const start = (page - 1) * pageSize
  const end = start + pageSize

  return {
    data: items.slice(start, end),
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  }
}

export function calculateTotalPages(totalItems: number, pageSize: number): number {
  return Math.ceil(totalItems / pageSize)
}
