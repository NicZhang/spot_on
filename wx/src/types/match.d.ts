export interface Match {
  _id: string
  home_team_id: string
  away_team_id: string
  home_team_name: string
  away_team_name: string
  match_date: string
  location: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  format: string
  created_at: string
}

export interface MatchListParams {
  page: number
  page_size: number
  status?: string
}

export interface MatchListResult {
  items: Match[]
  total: number
}
