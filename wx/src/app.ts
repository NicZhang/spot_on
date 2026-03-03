App<IAppOption>({
  globalData: {
    userInfo: null,
    token: wx.getStorageSync('token') || ''
  },

  onLaunch() {
    const token = wx.getStorageSync('token') as string
    if (token) {
      this.globalData.token = token
    }
  }
})
