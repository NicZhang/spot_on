import { request } from './request'

export async function wxLogin(): Promise<string> {
  const { code } = await uni.login({ provider: 'weixin' })
  const res = await request<{ token: string }>({
    url: '/auth/wx-login',
    method: 'POST',
    data: { code },
  })
  uni.setStorageSync('token', res.token)
  return res.token
}

export function isLoggedIn(): boolean {
  return !!uni.getStorageSync('token')
}

export function logout() {
  uni.removeStorageSync('token')
  uni.reLaunch({ url: '/pages/index/index' })
}
