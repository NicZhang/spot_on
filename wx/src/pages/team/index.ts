import { getMyTeams, getTeamPlayers, createInvite } from '../../api/team'
import type { Team, Player, RecentResult } from '../../types/team'

/** 位置颜色映射 */
const POSITION_COLOR_MAP: Record<string, string> = {
  '前锋': '#e74c3c',
  '中场': '#3498db',
  '后卫': '#27ae60',
  '门将': '#e67e22'
}

/** 比赛结果标签类型 */
function getResultLabel(result: RecentResult): { text: string; className: string } {
  if (result.myScore > result.opponentScore) {
    return { text: '胜', className: 'result-tag--win' }
  }
  if (result.myScore < result.opponentScore) {
    return { text: '负', className: 'result-tag--lose' }
  }
  return { text: '平', className: 'result-tag--draw' }
}

interface PageData {
  /** 状态栏高度 */
  statusBarHeight: number
  /** 是否加载中 */
  loading: boolean
  /** 是否有球队 */
  hasTeam: boolean
  /** 当前球队信息 */
  team: Team | null
  /** 球队队员列表 */
  players: Player[]
  /** 近期战绩 */
  recentResults: RecentResult[]
  /** 当前 Tab 索引：0=成员，1=战绩 */
  activeTab: number
  /** 位置颜色映射 */
  positionColorMap: Record<string, string>
  /** 性别标签文本 */
  genderLabel: string
  /** 胜率显示文本 */
  winRateText: string
}

Page<PageData, WechatMiniprogram.Page.CustomOption>({
  data: {
    statusBarHeight: 0,
    loading: true,
    hasTeam: false,
    team: null,
    players: [],
    recentResults: [],
    activeTab: 0,
    positionColorMap: POSITION_COLOR_MAP,
    genderLabel: '',
    winRateText: ''
  },

  onLoad() {
    const systemInfo = wx.getWindowInfo()
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight
    })
  },

  onShow() {
    this.loadTeamData()
  },

  onPullDownRefresh() {
    this.loadTeamData().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  /** 加载球队数据 */
  async loadTeamData(): Promise<void> {
    this.setData({ loading: true })

    try {
      const teams = await getMyTeams()

      if (!teams || teams.length === 0) {
        this.setData({
          loading: false,
          hasTeam: false,
          team: null,
          players: [],
          recentResults: []
        })
        return
      }

      const team = teams[0] as Team
      this.setData({
        team,
        hasTeam: true,
        genderLabel: team.gender === 'female' ? '女足' : '男足',
        winRateText: `${Math.round(team.winRate * 100)}%`,
        recentResults: team.recentResults || []
      })

      await this.loadPlayers(team.id)
    } catch (err) {
      const error = err as Error
      wx.showToast({ title: error.message || '加载失败', icon: 'none' })
      this.setData({ hasTeam: false })
    } finally {
      this.setData({ loading: false })
    }
  },

  /** 加载球队队员 */
  async loadPlayers(teamId: string): Promise<void> {
    try {
      const result = await getTeamPlayers(teamId)
      this.setData({
        players: result.items
      })
    } catch (err) {
      const error = err as Error
      wx.showToast({ title: error.message || '加载队员失败', icon: 'none' })
    }
  },

  /** Tab 切换 */
  onTabChange(e: WechatMiniprogram.CustomEvent<{ index: number }>) {
    this.setData({
      activeTab: e.detail.index
    })
  },

  /** 点击队员卡片 */
  onPlayerTap(e: WechatMiniprogram.BaseEvent<Record<string, never>, { userId: string }>) {
    const userId = e.currentTarget.dataset.userId as string
    if (!userId) return
    wx.navigateTo({
      url: `/pages-sub/user/profile/index?id=${userId}`
    })
  },

  /** 邀请队员 */
  async onInviteTap(): Promise<void> {
    const team = this.data.team
    if (!team) return

    wx.showLoading({ title: '生成邀请...' })

    try {
      const result = await createInvite(team.id)
      wx.hideLoading()

      wx.showModal({
        title: '邀请队员',
        content: `邀请链接已生成，有效期${Math.floor(result.expiresIn / 3600)}小时。\n邀请码：${result.inviteCode}`,
        confirmText: '复制链接',
        success: (res) => {
          if (res.confirm) {
            wx.setClipboardData({
              data: result.inviteLink,
              success: () => {
                wx.showToast({ title: '链接已复制', icon: 'success' })
              }
            })
          }
        }
      })
    } catch (err) {
      wx.hideLoading()
      const error = err as Error
      wx.showToast({ title: error.message || '生成邀请失败', icon: 'none' })
    }
  },

  /** 编辑球队 */
  onEditTeamTap() {
    const team = this.data.team
    if (!team) return
    wx.navigateTo({
      url: `/pages-sub/team/manage/index?id=${team.id}`
    })
  },

  /** 发起约球 */
  onCreateMatchTap() {
    wx.navigateTo({
      url: '/pages-sub/match/create/index'
    })
  },

  /** 创建球队 */
  onCreateTeamTap() {
    wx.navigateTo({
      url: '/pages-sub/team/manage/index'
    })
  },

  /** 获取位置标签颜色 */
  getPositionColor(position: string): string {
    return POSITION_COLOR_MAP[position] || '#999999'
  },

  /** 获取比赛结果标签信息 */
  getResultInfo(result: RecentResult): { text: string; className: string } {
    return getResultLabel(result)
  }
})
