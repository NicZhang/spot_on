import { getEnvConfig } from '../env';
export function request(options) {
    const token = wx.getStorageSync('token');
    const { baseUrl } = getEnvConfig();
    return new Promise((resolve, reject) => {
        wx.request({
            url: `${baseUrl}${options.url}`,
            method: options.method || 'GET',
            data: options.data,
            header: {
                'Content-Type': 'application/json',
                Authorization: token ? `Bearer ${token}` : '',
                ...options.header
            },
            success: (res) => {
                const body = res.data;
                if (res.statusCode === 200 && body.code === 0) {
                    resolve(body.data);
                    return;
                }
                if (res.statusCode === 401) {
                    wx.removeStorageSync('token');
                    wx.reLaunch({ url: '/pages/index/index' });
                    reject(new Error('登录已过期'));
                    return;
                }
                const message = body?.message || '请求失败';
                wx.showToast({ title: message, icon: 'none' });
                reject(new Error(message));
            },
            fail: (error) => {
                wx.showToast({ title: '网络异常', icon: 'none' });
                reject(error);
            }
        });
    });
}
