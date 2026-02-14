export interface User {
  _id: string
  nickname: string
  avatar: string
  phone: string
  position: string
  credit_score: number
  team_id: string
  created_at: string
}

export interface LoginResult {
  token: string
  user: User
}
