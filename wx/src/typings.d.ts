import type { User } from './types/user'

declare global {
  interface IAppOption {
    globalData: {
      userInfo: User | null
      token: string
    }
  }
}

export {}
