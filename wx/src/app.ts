App<IAppOption>({
  globalData: {
    userInfo: null,
    token: wx.getStorageSync('token') || ''
  },

  onLaunch() {
    const token = wx.getStorageSync('token') as string
    if (token) {
      this.globalData.token = token
    } else {
      // No token, redirect to login page after current lifecycle
      // Must use reLaunch since redirectTo cannot leave a tabBar page
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/login/index' })
      }, 0)
    }
  }
})
