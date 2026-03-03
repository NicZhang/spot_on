export interface EnvConfig {
  baseUrl: string
}

const ENV_CONFIG: Record<string, EnvConfig> = {
  develop: {
    baseUrl: 'https://api.example.com'
  },
  trial: {
    baseUrl: 'https://api.example.com'
  },
  release: {
    baseUrl: 'https://api.example.com'
  }
}

export function getEnvConfig(): EnvConfig {
  const accountInfo = wx.getAccountInfoSync()
  const envVersion = accountInfo.miniProgram.envVersion
  return ENV_CONFIG[envVersion] ?? { baseUrl: 'https://api.example.com' }
}
