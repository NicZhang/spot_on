import { wxLogin, isLoggedIn } from '../../utils/auth'

/** Show a short toast message */
function showToast(message: string) {
  wx.showToast({ title: message, icon: 'none', duration: 2000 })
}

interface LoginPageData {
  agreed: boolean
  animReady: boolean
  shakeAgreement: boolean
  logging: boolean
}

Page<LoginPageData, WechatMiniprogram.Page.CustomOption>({
  data: {
    agreed: false,
    animReady: false,
    shakeAgreement: false,
    logging: false
  },

  onLoad() {
    // Already logged in, go to main page
    if (isLoggedIn()) {
      wx.switchTab({ url: '/pages/index/index' })
      return
    }

    // Trigger entrance animation
    setTimeout(() => {
      this.setData({ animReady: true })
    }, 100)
  },

  /** Toggle agreement checkbox */
  onAgreementChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ agreed: e.detail as unknown as boolean })
  },

  /** WeChat login */
  async onWxLogin() {
    if (!this.data.agreed) {
      this.setData({ shakeAgreement: true })
      showToast('请先阅读并同意用户协议')
      setTimeout(() => {
        this.setData({ shakeAgreement: false })
      }, 500)
      return
    }

    if (this.data.logging) return
    this.setData({ logging: true })

    wx.showLoading({ title: '登录中', mask: true })

    try {
      await wxLogin()
      wx.hideLoading()
      wx.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' })
      }, 500)
    } catch (err) {
      wx.hideLoading()
      const errorObj = err as Error
      showToast(errorObj.message || '登录失败，请重试')
    } finally {
      this.setData({ logging: false })
    }
  },

  /** Phone login placeholder */
  onPhoneLogin() {
    if (!this.data.agreed) {
      this.setData({ shakeAgreement: true })
      showToast('请先阅读并同意用户协议')
      setTimeout(() => {
        this.setData({ shakeAgreement: false })
      }, 500)
      return
    }
    showToast('手机号登录功能开发中')
  },

  /** View user agreement */
  onViewUserAgreement() {
    wx.showModal({
      title: '用户协议',
      content: '用户协议内容将在正式版中提供。',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  /** View privacy policy */
  onViewPrivacyPolicy() {
    wx.showModal({
      title: '隐私政策',
      content: '隐私政策内容将在正式版中提供。',
      showCancel: false,
      confirmText: '知道了'
    })
  }
})
