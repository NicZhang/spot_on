/** 用户角色 */
export type UserRole = 'PLAYER' | 'FREE_CAPTAIN' | 'VIP_CAPTAIN'

/** 用户统计 */
export interface UserStats {
  goals: number
  assists: number
  mvpCount: number
  appearances: number
  balance: number
}

/** 用户 */
export interface User {
  id: string
  openId: string
  unionId?: string
  phone?: string
  name: string
  avatar: string
  gender: 'male' | 'female' | 'unknown'
  role: UserRole
  stats: UserStats
  currentTeamId?: string
  createdAt: string
  updatedAt: string
}

/** 更新用户请求体 */
export interface UpdateUserParams {
  name?: string
  avatar?: string
  gender?: 'male' | 'female' | 'unknown'
}
