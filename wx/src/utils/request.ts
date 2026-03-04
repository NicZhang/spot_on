import { getEnvConfig } from '../env'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** wx.request 原生支持的方法 */
type WxMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS' | 'HEAD' | 'TRACE' | 'CONNECT'

export interface RequestOptions {
  url: string
  method?: HttpMethod
  data?: WechatMiniprogram.IAnyObject
  header?: Record<string, string>
}

interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

export function request<T>(options: RequestOptions): Promise<T> {
  const token = wx.getStorageSync('token') as string
  const { baseUrl } = getEnvConfig()

  /** wx.request 不支持 PATCH，使用 POST + X-HTTP-Method-Override */
  const isPatch = options.method === 'PATCH'
  const actualMethod: WxMethod = isPatch ? 'POST' : (options.method || 'GET') as WxMethod
  const extraHeaders: Record<string, string> = isPatch
    ? { 'X-HTTP-Method-Override': 'PATCH' }
    : {}

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseUrl}${options.url}`,
      method: actualMethod,
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
        ...extraHeaders,
        ...options.header
      },
      success: (res) => {
        const body = res.data as ApiResponse<T>

        if (res.statusCode === 200 && body.code === 0) {
          resolve(body.data)
          return
        }

        if (res.statusCode === 401) {
          wx.removeStorageSync('token')
          wx.reLaunch({ url: '/pages/login/index' })
          reject(new Error('登录已过期'))
          return
        }

        const message = body?.message || '请求失败'
        wx.showToast({ title: message, icon: 'none' })
        reject(new Error(message))
      },
      fail: (error) => {
        wx.showToast({ title: '网络异常', icon: 'none' })
        reject(error)
      }
    })
  })
}
