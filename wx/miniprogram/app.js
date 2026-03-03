"use strict";
App({
    globalData: {
        userInfo: null,
        token: wx.getStorageSync('token') || ''
    },
    onLaunch() {
        const token = wx.getStorageSync('token');
        if (token) {
            this.globalData.token = token;
        }
    }
});
