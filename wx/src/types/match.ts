export interface Match {
  _id: string
  title: string
  status: string
}

export interface MatchListParams {
  page: number
  page_size: number
}

export interface MatchListResult {
  items: Match[]
}
