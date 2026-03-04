import { request } from './request'
import type { User } from '../types/user'

interface LoginResult {
  token: string
  refreshToken: string
  expiresIn: number
  user: User
}

export async function wxLogin(): Promise<LoginResult> {
  const loginRes = await wx.login()
  const code = loginRes.code

  const res = await request<LoginResult>({
    url: '/auth/wechat/login',
    method: 'POST',
    data: { code }
  })

  wx.setStorageSync('token', res.token)
  wx.setStorageSync('refreshToken', res.refreshToken)
  return res
}

export function isLoggedIn(): boolean {
  return !!wx.getStorageSync('token')
}

export function logout() {
  wx.removeStorageSync('token')
  wx.removeStorageSync('refreshToken')
  wx.reLaunch({ url: '/pages/login/index' })
}
