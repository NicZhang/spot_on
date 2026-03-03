import { request } from '../utils/request';
export function getUserProfile() {
    return request({
        url: '/users/me',
        method: 'GET'
    });
}
