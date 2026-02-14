import { request } from '@/utils/request'
import type { Team, TeamListParams, TeamListResult } from '@/types/team'

/** 获取球队列表 */
export function getTeamList(params: TeamListParams) {
  return request<TeamListResult>({
    url: '/teams',
    method: 'GET',
    data: params,
  })
}

/** 获取球队详情 */
export function getTeamDetail(team_id: string) {
  return request<Team>({
    url: `/teams/${team_id}`,
    method: 'GET',
  })
}

/** 创建球队 */
export function createTeam(data: Partial<Team>) {
  return request<Team>({
    url: '/teams',
    method: 'POST',
    data,
  })
}
