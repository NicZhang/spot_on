export interface Team {
  _id: string
  name: string
  member_count: number
}

export interface TeamListParams {
  page: number
  page_size: number
}

export interface TeamListResult {
  items: Team[]
}
