import { request } from '../utils/request'
import type { PaginatedResult } from '../types/common'
import type {
  MatchRequest,
  MatchListParams,
  CreateMatchParams,
  MatchRecord,
  ScheduleParams,
  MatchReport
} from '../types/match'

/** 获取约球大厅列表 */
export function getMatchList(params: MatchListParams) {
  return request<PaginatedResult<MatchRequest>>({
    url: '/matches',
    method: 'GET',
    data: params as WechatMiniprogram.IAnyObject
  })
}

/** 获取约球详情 */
export function getMatchDetail(matchId: string) {
  return request<MatchRequest>({
    url: `/matches/${matchId}`,
    method: 'GET'
  })
}

/** 发起约球 */
export function createMatch(params: CreateMatchParams) {
  return request<{ id: string; hostTeamId: string; status: string; totalPrice: number; deposit: number; createdAt: string }>({
    url: '/matches',
    method: 'POST',
    data: params as WechatMiniprogram.IAnyObject
  })
}

/** 应战约球 */
export function acceptMatch(matchId: string) {
  return request<{ matchId: string; guestTeamId: string; status: string; deposit: number; deductedAt: string }>({
    url: `/matches/${matchId}/accept`,
    method: 'POST'
  })
}

/** 取消应战 */
export function cancelMatch(matchId: string) {
  return request<{ matchId: string; status: string; refunded: number; refundedAt: string }>({
    url: `/matches/${matchId}/cancel`,
    method: 'POST'
  })
}

/** 时间冲突检查 */
export function checkConflict(matchId: string) {
  return request<{
    hasConflict: boolean
    conflictingMatch: {
      id: string
      opponentName: string
      date: string
      time: string
      location: string
    } | null
  }>({
    url: `/matches/${matchId}/conflict-check`,
    method: 'GET'
  })
}

/** 获取我的赛程 */
export function getSchedule(params: ScheduleParams) {
  return request<PaginatedResult<MatchRecord>>({
    url: '/matches/schedule',
    method: 'GET',
    data: params as WechatMiniprogram.IAnyObject
  })
}

/** 提交赛果 */
export function submitReport(recordId: string, report: MatchReport) {
  return request<MatchRecord>({
    url: `/matches/records/${recordId}/report`,
    method: 'POST',
    data: report as unknown as WechatMiniprogram.IAnyObject
  })
}

/** 确认赛果 */
export function confirmReport(recordId: string) {
  return request<MatchRecord>({
    url: `/matches/records/${recordId}/confirm`,
    method: 'POST'
  })
}
