export interface Team {
  _id: string
  name: string
  logo: string
  member_count: number
  captain_id: string
  level: string
  description: string
  created_at: string
}

export interface TeamListParams {
  page: number
  page_size: number
  level?: string
}

export interface TeamListResult {
  items: Team[]
  total: number
}
