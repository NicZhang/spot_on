import { request } from '../utils/request'
import type { User } from '../types/user'

interface LoginResult {
  token: string
  refreshToken: string
  expiresIn: number
  user: User
}

/** 微信登录 */
export function wechatLogin(code: string) {
  return request<LoginResult>({
    url: '/auth/wechat/login',
    method: 'POST',
    data: { code }
  })
}

/** 手机号登录 */
export function phoneLogin(phone: string, code: string) {
  return request<LoginResult>({
    url: '/auth/phone/login',
    method: 'POST',
    data: { phone, code }
  })
}

/** 发送短信验证码 */
export function sendSmsCode(phone: string) {
  return request<{ expiresIn: number }>({
    url: '/auth/phone/send-code',
    method: 'POST',
    data: { phone }
  })
}

/** 绑定手机号 */
export function bindPhone(phone: string, code: string) {
  return request<{ phone: string }>({
    url: '/auth/phone/bind',
    method: 'POST',
    data: { phone, code }
  })
}

/** 刷新 Token */
export function refreshToken(refreshToken: string) {
  return request<{ token: string; expiresIn: number }>({
    url: '/auth/refresh',
    method: 'POST',
    data: { refreshToken }
  })
}

/** 退出登录 */
export function authLogout() {
  return request<null>({
    url: '/auth/logout',
    method: 'POST'
  })
}
