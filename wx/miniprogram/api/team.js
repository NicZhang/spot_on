import { request } from '../utils/request';
export function getTeamList(params) {
    return request({
        url: '/teams',
        method: 'GET',
        data: params
    });
}
export function getTeamDetail(team_id) {
    return request({
        url: `/teams/${team_id}`,
        method: 'GET'
    });
}
