import { request } from '../utils/request'
import type { PaginatedResult } from '../types/common'
import type {
  Team,
  TeamSearchItem,
  TeamSearchParams,
  CreateTeamParams,
  UpdateTeamParams,
  TeamVerificationParams,
  TeamVerificationStatus,
  ReportTeamParams,
  Player,
  UpdatePlayerParams,
  InviteResult
} from '../types/team'

/** 获取我的球队列表 */
export function getMyTeams() {
  return request<Team[]>({
    url: '/teams/mine',
    method: 'GET'
  })
}

/** 创建球队 */
export function createTeam(params: CreateTeamParams) {
  return request<Team>({
    url: '/teams',
    method: 'POST',
    data: params as WechatMiniprogram.IAnyObject
  })
}

/** 切换当前球队 */
export function switchTeam(teamId: string) {
  return request<{ currentTeamId: string; teamName: string }>({
    url: `/teams/${teamId}/switch`,
    method: 'PUT'
  })
}

/** 更新球队信息 */
export function updateTeam(teamId: string, params: UpdateTeamParams) {
  return request<Team>({
    url: `/teams/${teamId}`,
    method: 'PATCH',
    data: params as WechatMiniprogram.IAnyObject
  })
}

/** 获取球队详情 */
export function getTeamDetail(teamId: string) {
  return request<Team>({
    url: `/teams/${teamId}`,
    method: 'GET'
  })
}

/** 搜索球队列表 */
export function searchTeams(params: TeamSearchParams) {
  return request<PaginatedResult<TeamSearchItem>>({
    url: '/teams/search',
    method: 'GET',
    data: params as WechatMiniprogram.IAnyObject
  })
}

/** 提交球队实名认证 */
export function submitTeamVerification(teamId: string, params: TeamVerificationParams) {
  return request<{ verificationId: string; status: string; submittedAt: string; estimatedDays: number }>({
    url: `/teams/${teamId}/verification`,
    method: 'POST',
    data: params as WechatMiniprogram.IAnyObject
  })
}

/** 查询球队认证状态 */
export function getTeamVerificationStatus(teamId: string) {
  return request<TeamVerificationStatus>({
    url: `/teams/${teamId}/verification`,
    method: 'GET'
  })
}

/** 举报球队 */
export function reportTeam(teamId: string, params: ReportTeamParams) {
  return request<{ reportId: string; status: string; createdAt: string }>({
    url: `/teams/${teamId}/report`,
    method: 'POST',
    data: params as WechatMiniprogram.IAnyObject
  })
}

/** 获取球队队员列表 */
export function getTeamPlayers(teamId: string, page: number = 1, pageSize: number = 20) {
  return request<PaginatedResult<Player>>({
    url: `/teams/${teamId}/players`,
    method: 'GET',
    data: { page, pageSize }
  })
}

/** 生成邀请链接 */
export function createInvite(teamId: string) {
  return request<InviteResult>({
    url: `/teams/${teamId}/invite`,
    method: 'POST',
    data: { type: 'link' }
  })
}

/** 接受邀请加入球队 */
export function acceptInvite(inviteCode: string) {
  return request<{ teamId: string; teamName: string; playerId: string }>({
    url: `/teams/join/${inviteCode}`,
    method: 'POST'
  })
}

/** 移除队员 */
export function removePlayer(teamId: string, playerId: string) {
  return request<null>({
    url: `/teams/${teamId}/players/${playerId}`,
    method: 'DELETE'
  })
}

/** 获取队员详情 */
export function getPlayerDetail(playerId: string) {
  return request<Player>({
    url: `/players/${playerId}`,
    method: 'GET'
  })
}

/** 更新队员信息 */
export function updatePlayer(playerId: string, params: UpdatePlayerParams) {
  return request<Player>({
    url: `/players/${playerId}`,
    method: 'PATCH',
    data: params as WechatMiniprogram.IAnyObject
  })
}
