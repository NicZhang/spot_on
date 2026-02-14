import { request } from '@/utils/request'
import type { Match, MatchListParams, MatchListResult } from '@/types/match'

/** 获取比赛列表 */
export function getMatchList(params: MatchListParams) {
  return request<MatchListResult>({
    url: '/matches',
    method: 'GET',
    data: params,
  })
}

/** 获取比赛详情 */
export function getMatchDetail(match_id: string) {
  return request<Match>({
    url: `/matches/${match_id}`,
    method: 'GET',
  })
}
