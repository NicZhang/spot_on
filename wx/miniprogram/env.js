const ENV_CONFIG = {
    develop: {
        baseUrl: 'https://api.example.com'
    },
    trial: {
        baseUrl: 'https://api.example.com'
    },
    release: {
        baseUrl: 'https://api.example.com'
    }
};
export function getEnvConfig() {
    const accountInfo = wx.getAccountInfoSync();
    const envVersion = accountInfo.miniProgram.envVersion;
    return ENV_CONFIG[envVersion] ?? { baseUrl: 'https://api.example.com' };
}
