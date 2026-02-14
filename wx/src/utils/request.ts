const BASE_URL = import.meta.env.VITE_API_BASE_URL

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: Record<string, unknown>
  header?: Record<string, string>
}

interface ApiResponse<T = unknown> {
  code: number
  data: T
  message: string
}

export function request<T>(options: RequestOptions): Promise<T> {
  const token = uni.getStorageSync('token')
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.header,
      },
      success: (res) => {
        const data = res.data as ApiResponse<T>
        if (res.statusCode === 200 && data.code === 0) {
          resolve(data.data)
        } else if (res.statusCode === 401) {
          uni.removeStorageSync('token')
          uni.reLaunch({ url: '/pages/login/index' })
          reject(new Error('登录已过期'))
        } else {
          uni.showToast({ title: data.message || '请求失败', icon: 'none' })
          reject(new Error(data.message))
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络异常', icon: 'none' })
        reject(err)
      },
    })
  })
}
