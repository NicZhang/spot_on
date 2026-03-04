import { getTeamDetail, reportTeam } from '../../../api/team'
import type { Team, RecentResult, ReportTeamParams } from '../../../types/team'

type ReportReason = ReportTeamParams['reason']

interface ResultDisplay extends RecentResult {
  result: 'win' | 'draw' | 'loss'
  resultText: string
  scoreText: string
}

interface TeamDetailData {
  teamId: string
  loading: boolean
  team: Team | null
  name: string
  logo: string
  gender: string
  location: string
  isVerified: boolean
  creditScore: number
  winRate: number
  winCount: number
  drawCount: number
  lossCount: number
  tags: string[]
  recentResults: ResultDisplay[]
  showReportSheet: boolean
  reportReasons: Array<{ name: string }>
  submitting: boolean
}

const REPORT_REASONS: ReportReason[] = [
  '虚假信息',
  '恶意爽约',
  '比赛中暴力行为',
  '虚报信用分',
  '其他'
]

Page<TeamDetailData, WechatMiniprogram.Page.CustomOption>({
  data: {
    teamId: '',
    loading: true,
    team: null,
    name: '',
    logo: '',
    gender: '',
    location: '',
    isVerified: false,
    creditScore: 0,
    winRate: 0,
    winCount: 0,
    drawCount: 0,
    lossCount: 0,
    tags: [],
    recentResults: [],
    showReportSheet: false,
    reportReasons: REPORT_REASONS.map((r) => ({ name: r })),
    submitting: false
  },

  onLoad(options: Record<string, string | undefined>) {
    const id = options['id']
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      wx.navigateBack()
      return
    }
    this.setData({ teamId: id })
    this.loadDetail()
  },

  onPullDownRefresh() {
    this.loadDetail().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  async loadDetail(): Promise<void> {
    const { teamId } = this.data
    if (!teamId) return

    wx.showLoading({ title: '加载中' })
    try {
      const team = await getTeamDetail(teamId)
      const genderMap: Record<string, string> = { male: '男子', female: '女子' }

      // Process recent results
      const recent: ResultDisplay[] = (team.recentResults || []).map((r) => {
        let result: ResultDisplay['result'] = 'draw'
        let resultText = '平'
        if (r.myScore > r.opponentScore) {
          result = 'win'
          resultText = '胜'
        } else if (r.myScore < r.opponentScore) {
          result = 'loss'
          resultText = '负'
        }
        return {
          ...r,
          result,
          resultText,
          scoreText: `${r.myScore} : ${r.opponentScore}`
        }
      })

      // Calculate W/D/L counts
      let winCount = 0
      let drawCount = 0
      let lossCount = 0
      recent.forEach((r) => {
        if (r.result === 'win') winCount++
        else if (r.result === 'draw') drawCount++
        else lossCount++
      })

      this.setData({
        loading: false,
        team,
        name: team.name,
        logo: team.logo,
        gender: genderMap[team.gender] || team.gender,
        location: team.location,
        isVerified: team.isVerified,
        creditScore: team.creditScore,
        winRate: team.winRate,
        winCount,
        drawCount,
        lossCount,
        tags: team.tags,
        recentResults: recent
      })
    } catch (_err) {
      this.setData({ loading: false })
    } finally {
      wx.hideLoading()
    }
  },

  onInviteMatch(): void {
    wx.navigateTo({
      url: `/pages-sub/match/create/index?opponentId=${this.data.teamId}`
    })
  },

  onShowReport(): void {
    this.setData({ showReportSheet: true })
  },

  onCloseReport(): void {
    this.setData({ showReportSheet: false })
  },

  async onSelectReport(e: WechatMiniprogram.CustomEvent<{ name: string }>): Promise<void> {
    const reason = e.detail.name as ReportReason
    this.setData({ showReportSheet: false })

    if (this.data.submitting) return
    this.setData({ submitting: true })

    wx.showLoading({ title: '提交中' })
    try {
      const params: ReportTeamParams = { reason }
      await reportTeam(this.data.teamId, params)
      wx.hideLoading()
      wx.showToast({ title: '举报已提交', icon: 'success' })
    } catch (_err) {
      wx.hideLoading()
    } finally {
      this.setData({ submitting: false })
    }
  }
})
