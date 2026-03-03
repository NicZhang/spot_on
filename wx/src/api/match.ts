import { request } from '../utils/request'
import type { Match, MatchListParams, MatchListResult } from '../types/match'

export function getMatchList(params: MatchListParams) {
  return request<MatchListResult>({
    url: '/matches',
    method: 'GET',
    data: params
  })
}

export function getMatchDetail(match_id: string) {
  return request<Match>({
    url: `/matches/${match_id}`,
    method: 'GET'
  })
}
