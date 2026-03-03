import { request } from './request'

export async function wxLogin(): Promise<string> {
  const loginRes = await wx.login()
  const code = loginRes.code

  const res = await request<{ token: string }>({
    url: '/auth/wx-login',
    method: 'POST',
    data: { code }
  })

  wx.setStorageSync('token', res.token)
  return res.token
}

export function isLoggedIn(): boolean {
  return !!wx.getStorageSync('token')
}

export function logout() {
  wx.removeStorageSync('token')
  wx.reLaunch({ url: '/pages/index/index' })
}
