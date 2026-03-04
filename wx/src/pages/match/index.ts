import { getSchedule } from '../../api/match'
import type { MatchRecord, MatchRecordStatus } from '../../types/match'

/** Tab 对应的状态集合 */
const TAB_STATUS_MAP: Record<number, MatchRecordStatus[]> = {
  0: ['upcoming', 'pending_report', 'waiting_confirmation', 'confirm_needed'],
  1: ['finished', 'cancelled']
}

/** 星期映射 */
const WEEKDAY_MAP: Record<number, string> = {
  0: '周日',
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六'
}

/** 状态文案映射 */
interface StatusConfig {
  text: string
  color: string
  bgColor: string
}

const STATUS_CONFIG: Record<MatchRecordStatus, StatusConfig> = {
  upcoming: { text: '待开赛', color: '#07c160', bgColor: 'rgba(7,193,96,0.1)' },
  pending_report: { text: '待填报', color: '#ff6f00', bgColor: 'rgba(255,111,0,0.1)' },
  waiting_confirmation: { text: '待确认', color: '#1989fa', bgColor: 'rgba(25,137,250,0.1)' },
  confirm_needed: { text: '待我确认', color: '#1989fa', bgColor: 'rgba(25,137,250,0.1)' },
  finished: { text: '已结束', color: '#999999', bgColor: 'rgba(153,153,153,0.1)' },
  cancelled: { text: '已取消', color: '#ee0a24', bgColor: 'rgba(238,10,36,0.1)' }
}

/** 解析日期字符串，返回展示用的日期对象 */
function parseDateDisplay(dateStr: string): { month: string; day: string; weekday: string } {
  const parts = dateStr.split('-')
  const year = parseInt(parts[0] || '0', 10)
  const month = parseInt(parts[1] || '0', 10)
  const day = parseInt(parts[2] || '0', 10)
  const dateObj = new Date(year, month - 1, day)
  const weekdayIdx = dateObj.getDay()
  return {
    month: String(month),
    day: String(day),
    weekday: WEEKDAY_MAP[weekdayIdx] || ''
  }
}

/** 格式化卡片展示数据 */
interface MatchCardData {
  id: string
  month: string
  day: string
  weekday: string
  time: string
  opponentName: string
  opponentLogo: string
  format: string
  location: string
  feePerPlayer: number
  status: MatchRecordStatus
  statusText: string
  statusColor: string
  statusBgColor: string
  hostTeamScore: number
  guestTeamScore: number
  showScore: boolean
  borderColor: string
}

function formatCardData(record: MatchRecord): MatchCardData {
  const dateInfo = parseDateDisplay(record.date)
  const config = STATUS_CONFIG[record.status]
  const showScore = record.status === 'finished' ||
    record.status === 'waiting_confirmation' ||
    record.status === 'confirm_needed'

  const borderColorMap: Record<MatchRecordStatus, string> = {
    upcoming: '#07c160',
    pending_report: '#ff6f00',
    waiting_confirmation: '#1989fa',
    confirm_needed: '#1989fa',
    finished: '#cccccc',
    cancelled: '#ee0a24'
  }

  return {
    id: record.id,
    month: dateInfo.month,
    day: dateInfo.day,
    weekday: dateInfo.weekday,
    time: record.time,
    opponentName: record.opponentName || '待定',
    opponentLogo: record.opponentLogo || '',
    format: record.format,
    location: record.location,
    feePerPlayer: record.feePerPlayer,
    status: record.status,
    statusText: config.text,
    statusColor: config.color,
    statusBgColor: config.bgColor,
    hostTeamScore: record.hostTeamScore ?? 0,
    guestTeamScore: record.guestTeamScore ?? 0,
    showScore: showScore,
    borderColor: borderColorMap[record.status]
  }
}

interface PageData {
  activeTab: number
  matchList: MatchCardData[]
  loading: boolean
  loadingMore: boolean
  noMore: boolean
  page: number
  pageSize: number
  total: number
  isEmpty: boolean
}

Page<PageData, WechatMiniprogram.Page.CustomOption>({
  data: {
    activeTab: 0,
    matchList: [],
    loading: true,
    loadingMore: false,
    noMore: false,
    page: 1,
    pageSize: 10,
    total: 0,
    isEmpty: false
  },

  onLoad() {
    this.loadData(true)
  },

  onShow() {
    // 每次页面展示时刷新数据，以获取最新状态
    if (!this.data.loading) {
      this.loadData(true)
    }
  },

  onPullDownRefresh() {
    this.loadData(true)
  },

  onReachBottom() {
    if (this.data.loadingMore || this.data.noMore) {
      return
    }
    this.loadMore()
  },

  /** Tab 切换 */
  onTabChange(e: WechatMiniprogram.CustomEvent<{ index: number }>) {
    const tabIndex = e.detail.index
    this.setData({ activeTab: tabIndex })
    this.loadData(true)
  },

  /** 加载数据（首次或刷新） */
  loadData(isRefresh: boolean) {
    if (isRefresh) {
      this.setData({ page: 1, noMore: false, matchList: [], loading: true, isEmpty: false })
    }

    const statuses = TAB_STATUS_MAP[this.data.activeTab] || []
    // 依次请求各状态的赛程并合并
    const allPromises = statuses.map((status) =>
      getSchedule({ status: status, page: 1, pageSize: this.data.pageSize })
    )

    Promise.all(allPromises)
      .then((results) => {
        const allItems: MatchRecord[] = []
        let totalCount = 0

        for (const result of results) {
          allItems.push(...result.items)
          totalCount += result.total
        }

        // 按日期排序：即将开赛按时间升序，已结束按时间降序
        if (this.data.activeTab === 0) {
          allItems.sort((a, b) => {
            const dateCompare = a.date.localeCompare(b.date)
            if (dateCompare !== 0) return dateCompare
            return a.time.localeCompare(b.time)
          })
        } else {
          allItems.sort((a, b) => {
            const dateCompare = b.date.localeCompare(a.date)
            if (dateCompare !== 0) return dateCompare
            return b.time.localeCompare(a.time)
          })
        }

        const cardList = allItems.map(formatCardData)

        this.setData({
          matchList: cardList,
          total: totalCount,
          loading: false,
          isEmpty: cardList.length === 0,
          noMore: cardList.length >= totalCount
        })

        wx.stopPullDownRefresh()
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.stopPullDownRefresh()
        wx.showToast({ title: '加载失败，请重试', icon: 'none' })
      })
  },

  /** 加载更多（上拉分页） */
  loadMore() {
    const nextPage = this.data.page + 1
    this.setData({ loadingMore: true })

    const statuses = TAB_STATUS_MAP[this.data.activeTab] || []
    const allPromises = statuses.map((status) =>
      getSchedule({ status: status, page: nextPage, pageSize: this.data.pageSize })
    )

    Promise.all(allPromises)
      .then((results) => {
        const newItems: MatchRecord[] = []
        for (const result of results) {
          newItems.push(...result.items)
        }

        if (newItems.length === 0) {
          this.setData({ noMore: true, loadingMore: false })
          return
        }

        const newCards = newItems.map(formatCardData)
        this.setData({
          matchList: [...this.data.matchList, ...newCards],
          page: nextPage,
          loadingMore: false,
          noMore: newCards.length < this.data.pageSize
        })
      })
      .catch(() => {
        this.setData({ loadingMore: false })
        wx.showToast({ title: '加载更多失败', icon: 'none' })
      })
  },

  /** 点击卡片跳转详情 */
  onCardTap(e: WechatMiniprogram.CustomEvent) {
    const id = e.currentTarget.dataset.id as string
    wx.navigateTo({ url: `/pages-sub/match/detail/index?id=${id}` })
  },

  /** 点击 FAB 跳转发起约球 */
  onCreateTap() {
    wx.navigateTo({ url: '/pages-sub/match/create/index' })
  }
})
