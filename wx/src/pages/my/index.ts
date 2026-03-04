import { getUserProfile, updateUserProfile } from '../../api/user'
import { isLoggedIn } from '../../utils/auth'
import type { User, UserStats } from '../../types/user'

/** 默认统计数据（未登录 / 请求失败兜底） */
const DEFAULT_STATS: UserStats = {
  goals: 0,
  assists: 0,
  mvpCount: 0,
  appearances: 0,
  balance: 0
}

/** 默认用户信息（仅用于 setData 初始化） */
const DEFAULT_USER: User = {
  id: '',
  openId: '',
  name: '',
  avatar: '',
  gender: 'unknown',
  role: 'PLAYER',
  stats: DEFAULT_STATS,
  createdAt: '',
  updatedAt: ''
}

interface PageData {
  statusBarHeight: number
  isLoggedIn: boolean
  userInfo: User
  teamName: string
  loading: boolean
}

Page<PageData, WechatMiniprogram.Page.CustomOption>({
  data: {
    statusBarHeight: 0,
    isLoggedIn: false,
    userInfo: DEFAULT_USER,
    teamName: '',
    loading: false
  },

  onLoad() {
    const systemInfo = wx.getWindowInfo()
    this.setData({ statusBarHeight: systemInfo.statusBarHeight })
  },

  onShow() {
    this.loadUserProfile()
  },

  /** 加载用户信息 */
  async loadUserProfile() {
    if (!isLoggedIn()) {
      this.setData({ isLoggedIn: false, userInfo: DEFAULT_USER, teamName: '' })
      return
    }

    this.setData({ loading: true })
    wx.showLoading({ title: '加载中', mask: true })

    try {
      const user = await getUserProfile()
      this.setData({
        isLoggedIn: true,
        userInfo: user,
        teamName: user.currentTeamId ? '球队加载中...' : ''
      })

      // 同步 globalData
      const app = getApp<IAppOption>()
      app.globalData.userInfo = user

      // 如果有球队，后续可在此拉取球队名称
      // 目前暂时显示球队 ID
      if (user.currentTeamId) {
        this.setData({ teamName: `球队 ${user.currentTeamId}` })
      }
    } catch (err) {
      // request.ts 已统一处理 toast，这里只做状态重置
      const errorObj = err as Error
      console.error('[my] loadUserProfile failed:', errorObj.message)
      if (!isLoggedIn()) {
        this.setData({ isLoggedIn: false, userInfo: DEFAULT_USER, teamName: '' })
      }
    } finally {
      this.setData({ loading: false })
      wx.hideLoading()
    }
  },

  /** 点击头像更换 */
  onChangeAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0]?.tempFilePath
        if (!tempFilePath) return

        // 此处应调用上传接口获取 CDN URL，目前先用本地路径预览
        this.setData({ 'userInfo.avatar': tempFilePath })

        wx.showToast({ title: '头像已更新', icon: 'success' })

        // TODO: 调用上传接口后再 updateUserProfile
        // uploadFile(tempFilePath).then((cdnUrl) => {
        //   return updateUserProfile({ avatar: cdnUrl })
        // })
      },
      fail: () => {
        // 用户取消选择，不处理
      }
    })
  },

  /** 登录 */
  onLogin() {
    wx.navigateTo({ url: '/pages/login/index' })
  },

  /** 快捷操作 */
  onQuickAction(e: WechatMiniprogram.TouchEvent) {
    const action = e.currentTarget.dataset['action'] as string

    switch (action) {
      case 'team':
        wx.switchTab({ url: '/pages/team/index' })
        break
      case 'match':
        wx.navigateTo({ url: '/pages/match/index' })
        break
      case 'cert':
        if (this.data.userInfo.currentTeamId) {
          wx.navigateTo({
            url: `/pages-sub/team/detail/index?id=${this.data.userInfo.currentTeamId}`
          })
        } else {
          wx.showToast({ title: '请先加入球队', icon: 'none' })
        }
        break
      case 'vip':
        wx.showToast({ title: '功能开发中', icon: 'none' })
        break
      default:
        break
    }
  },

  /** 菜单项点击 */
  onMenuTap(e: WechatMiniprogram.TouchEvent) {
    const action = e.currentTarget.dataset['action'] as string

    switch (action) {
      case 'cert':
        if (this.data.userInfo.currentTeamId) {
          wx.navigateTo({
            url: `/pages-sub/team/detail/index?id=${this.data.userInfo.currentTeamId}`
          })
        } else {
          wx.showToast({ title: '请先加入球队', icon: 'none' })
        }
        break
      case 'settings':
        wx.showActionSheet({
          itemList: ['清除缓存', '关于我们'],
          success: (res) => {
            if (res.tapIndex === 0) {
              this.onClearCache()
            } else if (res.tapIndex === 1) {
              this.onAbout()
            }
          }
        })
        break
      default:
        break
    }
  },

  /** 清除缓存 */
  onClearCache() {
    wx.showModal({
      title: '确认清除',
      content: '将清除本地缓存数据，不影响账户信息',
      confirmText: '清除',
      confirmColor: '#fa5151',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.clearStorageSync()
            // 重新写回 token（保持登录态）
            const app = getApp<IAppOption>()
            if (app.globalData.token) {
              wx.setStorageSync('token', app.globalData.token)
            }
            wx.showToast({ title: '缓存已清除', icon: 'success' })
          } catch (err) {
            const errorObj = err as Error
            console.error('[my] clearCache failed:', errorObj.message)
            wx.showToast({ title: '清除失败', icon: 'none' })
          }
        }
      }
    })
  },

  /** 关于 */
  onAbout() {
    wx.showModal({
      title: 'Spot On 约球平台',
      content: '版本 v1.0.0\n业余足球约球 & 球队管理平台',
      showCancel: false,
      confirmText: '知道了'
    })
  }
})
