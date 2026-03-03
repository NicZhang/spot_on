import { request } from '../utils/request';
export function getMatchList(params) {
    return request({
        url: '/matches',
        method: 'GET',
        data: params
    });
}
export function getMatchDetail(match_id) {
    return request({
        url: `/matches/${match_id}`,
        method: 'GET'
    });
}
