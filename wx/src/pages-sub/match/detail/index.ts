import { getMatchDetail, acceptMatch, cancelMatch, checkConflict } from '../../../api/match'
import type { MatchRequest, MatchHostTeam, CostBreakdown, Vas } from '../../../types/match'

interface MatchDetailData {
  matchId: string
  loading: boolean
  match: MatchRequest | null
  hostTeam: MatchHostTeam | null
  guestTeam: MatchHostTeam | null
  date: string
  time: string
  duration: number
  format: string
  location: string
  intensity: string
  genderReq: string
  jerseyColor: string
  costBreakdown: CostBreakdown | null
  totalPrice: number
  amenities: string[]
  vas: Vas | null
  memo: string
  status: string
  isOwnMatch: boolean
  hasConflict: boolean
  conflictInfo: string
  submitting: boolean
}

Page<MatchDetailData, WechatMiniprogram.Page.CustomOption>({
  data: {
    matchId: '',
    loading: true,
    match: null,
    hostTeam: null,
    guestTeam: null,
    date: '',
    time: '',
    duration: 0,
    format: '',
    location: '',
    intensity: '',
    genderReq: '',
    jerseyColor: '',
    costBreakdown: null,
    totalPrice: 0,
    amenities: [],
    vas: null,
    memo: '',
    status: '',
    isOwnMatch: false,
    hasConflict: false,
    conflictInfo: '',
    submitting: false
  },

  onLoad(options: Record<string, string | undefined>) {
    const id = options['id']
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      wx.navigateBack()
      return
    }
    this.setData({ matchId: id })
    this.loadDetail()
  },

  onPullDownRefresh() {
    this.loadDetail().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  async loadDetail(): Promise<void> {
    const { matchId } = this.data
    if (!matchId) return

    wx.showLoading({ title: '加载中' })
    try {
      const match = await getMatchDetail(matchId)
      const genderMap: Record<string, string> = {
        any: '不限',
        male: '男',
        female: '女'
      }
      this.setData({
        loading: false,
        match,
        hostTeam: match.hostTeam,
        guestTeam: match.guestTeam || null,
        date: match.date,
        time: match.time,
        duration: match.duration,
        format: match.format,
        location: match.location,
        intensity: match.intensity,
        genderReq: genderMap[match.genderReq] || match.genderReq,
        jerseyColor: match.jerseyColor,
        costBreakdown: match.costBreakdown,
        totalPrice: match.totalPrice,
        amenities: match.amenities,
        vas: match.vas,
        memo: match.memo || '',
        status: match.status
      })

      // Check if this is the current user's match
      const currentTeamId = wx.getStorageSync('currentTeamId') as string
      if (currentTeamId && match.hostTeam.id === currentTeamId) {
        this.setData({ isOwnMatch: true })
      }
    } catch (_err) {
      this.setData({ loading: false })
    } finally {
      wx.hideLoading()
    }
  },

  async onAcceptMatch(): Promise<void> {
    if (this.data.submitting) return
    this.setData({ submitting: true })

    try {
      // Check for time conflict first
      const conflictResult = await checkConflict(this.data.matchId)
      if (conflictResult.hasConflict && conflictResult.conflictingMatch) {
        const c = conflictResult.conflictingMatch
        this.setData({
          hasConflict: true,
          conflictInfo: `${c.date} ${c.time} vs ${c.opponentName}`,
          submitting: false
        })
        wx.showModal({
          title: '时间冲突',
          content: `你的球队在 ${c.date} ${c.time} 已有一场与 ${c.opponentName} 的比赛，确定继续应战吗？`,
          success: (res) => {
            if (res.confirm) {
              this.doAccept()
            }
          }
        })
        return
      }

      await this.doAccept()
    } catch (_err) {
      this.setData({ submitting: false })
    }
  },

  async doAccept(): Promise<void> {
    try {
      await acceptMatch(this.data.matchId)
      wx.showToast({ title: '应战成功', icon: 'success' })
      this.loadDetail()
    } catch (_err) {
      // Error toast handled by request util
    } finally {
      this.setData({ submitting: false })
    }
  },

  onCancelMatch(): void {
    wx.showModal({
      title: '确认取消',
      content: '取消应战可能会影响信用分，确定取消吗？',
      confirmColor: '#ee0a24',
      success: (res) => {
        if (res.confirm) {
          this.doCancelMatch()
        }
      }
    })
  },

  async doCancelMatch(): Promise<void> {
    if (this.data.submitting) return
    this.setData({ submitting: true })

    try {
      await cancelMatch(this.data.matchId)
      wx.showToast({ title: '已取消应战', icon: 'success' })
      this.loadDetail()
    } catch (_err) {
      // Error toast handled by request util
    } finally {
      this.setData({ submitting: false })
    }
  },

  onViewHostTeam(): void {
    const { hostTeam } = this.data
    if (hostTeam) {
      wx.navigateTo({ url: `/pages-sub/team/detail/index?id=${hostTeam.id}` })
    }
  },

  onViewGuestTeam(): void {
    const { guestTeam } = this.data
    if (guestTeam) {
      wx.navigateTo({ url: `/pages-sub/team/detail/index?id=${guestTeam.id}` })
    }
  }
})
