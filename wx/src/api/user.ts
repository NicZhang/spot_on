import { request } from '@/utils/request'
import type { User, LoginResult } from '@/types/user'

/** 微信登录 */
export function wxLoginApi(code: string) {
  return request<LoginResult>({
    url: '/auth/wx-login',
    method: 'POST',
    data: { code },
  })
}

/** 获取用户信息 */
export function getUserInfo() {
  return request<User>({
    url: '/users/me',
    method: 'GET',
  })
}

/** 更新用户信息 */
export function updateUserInfo(data: Partial<User>) {
  return request<User>({
    url: '/users/me',
    method: 'PUT',
    data,
  })
}
