import type { PaginationParams } from './common'

/** 近期战绩 */
export interface RecentResult {
  opponent: string
  myScore: number
  opponentScore: number
  date: string
}

/** 信用历史 */
export interface CreditHistoryItem {
  date: string
  change: number
  reason: string
}

/** 球队 */
export interface Team {
  id: string
  name: string
  logo: string
  gender: 'male' | 'female'
  avgAge: number
  creditScore: number
  winRate: number
  tags: string[]
  location: string
  isVerified: boolean
  homeJerseyColor?: string
  awayJerseyColor?: string
  fundBalance: number
  announcement?: string
  captainId: string
  memberCount: number
  recentResults?: RecentResult[]
  creditHistory?: CreditHistoryItem[]
  createdAt: string
  updatedAt: string
}

/** 球队搜索列表项（精简版） */
export interface TeamSearchItem {
  id: string
  name: string
  logo: string
  gender: 'male' | 'female'
  avgAge: number
  creditScore: number
  winRate: number
  location: string
  distance?: number
  isVerified: boolean
  tags: string[]
  memberCount: number
}

/** 搜索球队请求参数 */
export interface TeamSearchParams extends PaginationParams {
  keyword?: string
  location?: string
  gender?: 'male' | 'female'
  minCredit?: number
  minWinRate?: number
  verifiedOnly?: boolean
  hasTag?: string[]
  latitude?: number
  longitude?: number
}

/** 创建球队请求体 */
export interface CreateTeamParams {
  name: string
  gender: 'male' | 'female'
  location: string
}

/** 更新球队请求体 */
export interface UpdateTeamParams {
  name?: string
  announcement?: string
  logo?: string
  homeJerseyColor?: string
  awayJerseyColor?: string
}

/** 球队认证请求体 */
export interface TeamVerificationParams {
  realName: string
  idCard: string
  phone: string
  description?: string
  idFrontImageId: string
  idBackImageId: string
  teamPhotoImageId?: string
}

/** 球队认证状态 */
export interface TeamVerificationStatus {
  status: 'none' | 'reviewing' | 'verified' | 'rejected'
  submittedAt?: string
  reviewedAt?: string
  rejectReason?: string
  benefits: string[]
}

/** 举报球队请求体 */
export interface ReportTeamParams {
  reason: '虚假信息' | '恶意爽约' | '比赛中暴力行为' | '虚报信用分' | '其他'
  description?: string
}

/** 队员统计 */
export interface PlayerStats {
  goals: number
  assists: number
  mvpCount: number
}

/** 队员 */
export interface Player {
  id: string
  teamId: string
  userId: string
  name: string
  number: number
  position: string
  avatar: string
  height?: number
  weight?: number
  strongFoot?: 'right' | 'left' | 'both'
  level?: '入门' | '业余' | '校队' | '青训' | '退役职业'
  phone?: string
  stats: PlayerStats
  createdAt: string
  updatedAt: string
}

/** 更新队员请求体 */
export interface UpdatePlayerParams {
  name?: string
  number?: number
  position?: string
  avatar?: string
  height?: number
  weight?: number
  strongFoot?: 'right' | 'left' | 'both'
  level?: '入门' | '业余' | '校队' | '青训' | '退役职业'
}

/** 邀请链接结果 */
export interface InviteResult {
  inviteCode: string
  inviteLink: string
  qrCode: string
  expiresIn: number
}
