import { request } from '../utils/request'
import type { Team, TeamListParams, TeamListResult } from '../types/team'

export function getTeamList(params: TeamListParams) {
  return request<TeamListResult>({
    url: '/teams',
    method: 'GET',
    data: params
  })
}

export function getTeamDetail(team_id: string) {
  return request<Team>({
    url: `/teams/${team_id}`,
    method: 'GET'
  })
}
