import type { PaginationParams } from './common'

/** 费用明细 */
export interface CostBreakdown {
  pitchFee: number
  refereeFee: number
  waterFee: number
}

/** 增值服务 */
export interface Vas {
  videoService: boolean
  insurancePlayerIds: string[]
}

/** 约球帖主队精简信息 */
export interface MatchHostTeam {
  id: string
  name: string
  logo: string
  creditScore: number
  isVerified: boolean
  memberCount: number
  tags?: string[]
  winRate?: number
  recentResults?: Array<{
    opponent: string
    myScore: number
    opponentScore: number
    date: string
  }>
}

/** 约球状态 */
export type MatchRequestStatus = 'open' | 'matched' | 'finished' | 'cancelled'

/** 约球帖（大厅列表项） */
export interface MatchRequest {
  id: string
  hostTeam: MatchHostTeam
  guestTeam?: MatchHostTeam
  date: string
  time: string
  duration: number
  format: string
  location: string
  fieldName?: string
  distance?: number
  intensity: '养生局' | '竞技局' | '激战局'
  genderReq: 'any' | 'male' | 'female'
  jerseyColor: string
  costBreakdown: CostBreakdown
  totalPrice: number
  amenities: string[]
  vas: Vas
  urgentTop: boolean
  memo?: string
  status: MatchRequestStatus
  createdAt: string
  updatedAt: string
}

/** 约球大厅列表请求参数 */
export interface MatchListParams extends PaginationParams {
  keyword?: string
  format?: string
  intensity?: string
  gender?: 'any' | 'male' | 'female'
  location?: string
  date?: string
  timeRange?: 'today' | 'tomorrow' | 'this_week' | 'all'
  maxDistance?: number
  minCredit?: number
  verifiedOnly?: boolean
  latitude?: number
  longitude?: number
}

/** 发起约球请求体 */
export interface CreateMatchParams {
  date: string
  time: string
  duration: number
  format: string
  location: string
  fieldName?: string
  intensity: '养生局' | '竞技局' | '激战局'
  genderReq: 'any' | 'male' | 'female'
  jerseyColor: string
  costBreakdown: CostBreakdown
  amenities: string[]
  vas: Vas
  urgentTop?: boolean
  memo?: string
}

/** 赛程状态 */
export type MatchRecordStatus =
  | 'upcoming'
  | 'pending_report'
  | 'waiting_confirmation'
  | 'confirm_needed'
  | 'finished'
  | 'cancelled'

/** 比赛报告 */
export interface MatchReport {
  myScore: number
  opponentScore: number
  mvpPlayerId?: string
  goals: Array<{ playerId: string; count: number }>
  assists: Array<{ playerId: string; count: number }>
  lineup: string[]
}

/** 赛程记录 */
export interface MatchRecord {
  id: string
  hostTeamId: string
  guestTeamId: string
  hostTeamScore?: number
  guestTeamScore?: number
  opponentName?: string
  opponentLogo?: string
  opponentId?: string
  date: string
  time: string
  location: string
  format: string
  duration: number
  status: MatchRecordStatus
  report?: MatchReport
  totalFee: number
  feePerPlayer: number
  createdAt: string
  updatedAt: string
}

/** 赛程列表请求参数 */
export interface ScheduleParams extends PaginationParams {
  status?: MatchRecordStatus
}
