/** 通用分页响应 */
export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

/** 通用分页请求参数 */
export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  order?: 'asc' | 'desc'
}
