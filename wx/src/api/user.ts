import { request } from '../utils/request'
import type { User, UpdateUserParams } from '../types/user'

/** 获取当前用户信息 */
export function getUserProfile() {
  return request<User>({
    url: '/users/me',
    method: 'GET'
  })
}

/** 更新用户信息 */
export function updateUserProfile(params: UpdateUserParams) {
  return request<User>({
    url: '/users/me',
    method: 'PATCH',
    data: params as WechatMiniprogram.IAnyObject
  })
}
