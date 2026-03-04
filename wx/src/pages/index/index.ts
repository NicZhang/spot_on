import { getMatchList, acceptMatch, checkConflict } from '../../api/match'
import type { MatchRequest, MatchListParams } from '../../types/match'
import type { PaginatedResult } from '../../types/common'

/** Filter chip definition */
interface FilterChip {
  label: string
  key: string
  group: 'sort' | 'format' | 'intensity' | 'time' | 'credit'
  value: string
  vip?: boolean
}

/** All filter chips in display order */
const FILTER_CHIPS: FilterChip[] = [
  { label: '智能推荐', key: 'sort_smart', group: 'sort', value: 'smart' },
  { label: '距离最近', key: 'sort_distance', group: 'sort', value: 'distance' },
  { label: '5v5', key: 'fmt_5v5', group: 'format', value: '5v5' },
  { label: '7v7', key: 'fmt_7v7', group: 'format', value: '7v7' },
  { label: '8v8', key: 'fmt_8v8', group: 'format', value: '8v8' },
  { label: '11v11', key: 'fmt_11v11', group: 'format', value: '11v11' },
  { label: '养生局', key: 'int_casual', group: 'intensity', value: '养生局' },
  { label: '竞技局', key: 'int_comp', group: 'intensity', value: '竞技局' },
  { label: '激战局', key: 'int_fierce', group: 'intensity', value: '激战局' },
  { label: '今天', key: 'time_today', group: 'time', value: 'today' },
  { label: '明天', key: 'time_tomorrow', group: 'time', value: 'tomorrow' },
  { label: '本周', key: 'time_week', group: 'time', value: 'this_week' },
  { label: '信用极好', key: 'credit_high', group: 'credit', value: 'high', vip: true }
]

/** Intensity → left-border color mapping */
const INTENSITY_COLOR: Record<string, string> = {
  '养生局': '#22c55e',
  '竞技局': '#f97316',
  '激战局': '#ef4444'
}

/** Filter option for bottom-sheet popups */
interface FilterOption {
  label: string
  value: string
}

/** Page data type */
interface IndexPageData {
  filterChips: FilterChip[]
  activeChipKeys: string[]
  matchList: MatchRequest[]
  page: number
  pageSize: number
  total: number
  loading: boolean
  hasMore: boolean
  isFirstLoad: boolean
  keyword: string
  genderMap: Record<string, string>
  /** Advanced filter popups */
  formatOptions: FilterOption[]
  intensityOptions: FilterOption[]
  genderOptions: FilterOption[]
  activeFormat: string
  activeIntensity: string
  activeGender: string
  showFormatPopup: boolean
  showIntensityPopup: boolean
  showGenderPopup: boolean
}

Page<IndexPageData, WechatMiniprogram.Page.CustomOption>({
  data: {
    filterChips: FILTER_CHIPS,
    activeChipKeys: ['sort_smart'],

    matchList: [],
    page: 1,
    pageSize: 10,
    total: 0,
    loading: false,
    hasMore: true,
    isFirstLoad: true,
    keyword: '',

    genderMap: {
      any: '不限',
      male: '男',
      female: '女'
    },

    formatOptions: [
      { label: '全部赛制', value: '' },
      { label: '5人制', value: '5v5' },
      { label: '7人制', value: '7v7' },
      { label: '8人制', value: '8v8' },
      { label: '11人制', value: '11v11' }
    ],
    intensityOptions: [
      { label: '全部强度', value: '' },
      { label: '养生局', value: '养生局' },
      { label: '竞技局', value: '竞技局' },
      { label: '激战局', value: '激战局' }
    ],
    genderOptions: [
      { label: '不限性别', value: '' },
      { label: '不限', value: 'any' },
      { label: '男', value: 'male' },
      { label: '女', value: 'female' }
    ],
    activeFormat: '',
    activeIntensity: '',
    activeGender: '',
    showFormatPopup: false,
    showIntensityPopup: false,
    showGenderPopup: false
  },

  onLoad() {
    this.loadMatchList(true)
  },

  onShow() {
    if (!this.data.isFirstLoad) {
      this.loadMatchList(true)
    }
  },

  onPullDownRefresh() {
    this.loadMatchList(true)
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMatchList(false)
    }
  },

  /** Load match list */
  loadMatchList(reset: boolean) {
    if (this.data.loading) return

    const page = reset ? 1 : this.data.page + 1
    this.setData({ loading: true })

    if (reset) {
      wx.showLoading({ title: '加载中', mask: false })
    }

    const params: MatchListParams = {
      page,
      pageSize: this.data.pageSize
    }

    // Derive params from active chips
    const activeKeys = this.data.activeChipKeys
    const chips = this.data.filterChips

    for (const key of activeKeys) {
      const chip = chips.find(c => c.key === key)
      if (!chip) continue

      switch (chip.group) {
        case 'time':
          params.timeRange = chip.value as MatchListParams['timeRange']
          break
        case 'format':
          // Collect all active format values
          if (!params.format) {
            params.format = chip.value
          }
          break
        case 'intensity':
          params.intensity = chip.value
          break
        case 'credit':
          params.minCredit = 90
          params.verifiedOnly = true
          break
        case 'sort':
          // sort_distance → use location-based sorting
          break
      }
    }

    // Apply keyword
    if (this.data.keyword) {
      params.keyword = this.data.keyword
    }

    // Apply advanced filters from popups
    if (this.data.activeFormat) {
      params.format = this.data.activeFormat
    }
    if (this.data.activeIntensity) {
      params.intensity = this.data.activeIntensity
    }
    if (this.data.activeGender) {
      params.gender = this.data.activeGender as MatchListParams['gender']
    }

    getMatchList(params)
      .then((result: PaginatedResult<MatchRequest>) => {
        const newList = reset ? result.items : this.data.matchList.concat(result.items)
        const hasMore = page < result.pageCount

        this.setData({
          matchList: newList,
          page: result.page,
          total: result.total,
          hasMore
        })
      })
      .catch(() => {
        // API unavailable — populate demo data on first load so UI is visible
        if (this.data.isFirstLoad) {
          this.setData({ matchList: this.getMockData(), hasMore: false })
        } else {
          wx.showToast({ title: '加载失败，请重试', icon: 'none' })
        }
      })
      .finally(() => {
        this.setData({ loading: false, isFirstLoad: false })
        wx.hideLoading()
        wx.stopPullDownRefresh()
      })
  },

  /** Toggle a filter chip */
  onChipTap(e: WechatMiniprogram.BaseEvent) {
    const key = e.currentTarget.dataset['key'] as string
    const chip = this.data.filterChips.find(c => c.key === key)
    if (!chip) return

    let activeKeys = [...this.data.activeChipKeys]
    const isActive = activeKeys.includes(key)

    if (isActive) {
      // Deactivate
      activeKeys = activeKeys.filter(k => k !== key)
    } else {
      // For sort/time/intensity/credit groups: single-select (deactivate others in same group)
      if (chip.group !== 'format') {
        activeKeys = activeKeys.filter(k => {
          const other = this.data.filterChips.find(c => c.key === k)
          return other ? other.group !== chip.group : true
        })
      }
      activeKeys.push(key)
    }

    this.setData({ activeChipKeys: activeKeys })
    this.loadMatchList(true)
  },

  /** Get intensity border color for a match */
  getIntensityColor(intensity: string): string {
    return INTENSITY_COLOR[intensity] || '#22c55e'
  },

  /** Search keyword change */
  onSearchChange(e: WechatMiniprogram.CustomEvent) {
    const value = e.detail as unknown as string
    this.setData({ keyword: value })
  },

  /** Search confirm */
  onSearchConfirm() {
    this.loadMatchList(true)
  },

  /** Clear search */
  onSearchClear() {
    this.setData({ keyword: '' })
    this.loadMatchList(true)
  },

  /** Open advanced filter popup */
  onOpenFilterPopup() {
    this.setData({ showFormatPopup: true })
  },

  onOpenFormatPopup() {
    this.setData({ showFormatPopup: true })
  },

  onOpenIntensityPopup() {
    this.setData({ showIntensityPopup: true })
  },

  onOpenGenderPopup() {
    this.setData({ showGenderPopup: true })
  },

  onClosePopup() {
    this.setData({
      showFormatPopup: false,
      showIntensityPopup: false,
      showGenderPopup: false
    })
  },

  onSelectFormat(e: WechatMiniprogram.BaseEvent) {
    const value = e.currentTarget.dataset['value'] as string
    this.setData({ activeFormat: value, showFormatPopup: false })
    this.loadMatchList(true)
  },

  onSelectIntensity(e: WechatMiniprogram.BaseEvent) {
    const value = e.currentTarget.dataset['value'] as string
    this.setData({ activeIntensity: value, showIntensityPopup: false })
    this.loadMatchList(true)
  },

  onSelectGender(e: WechatMiniprogram.BaseEvent) {
    const value = e.currentTarget.dataset['value'] as string
    this.setData({ activeGender: value, showGenderPopup: false })
    this.loadMatchList(true)
  },

  /** Navigate to match detail */
  onCardTap(e: WechatMiniprogram.BaseEvent) {
    const matchId = e.currentTarget.dataset['id'] as string
    wx.navigateTo({
      url: `/pages-sub/match/detail/index?id=${matchId}`
    })
  },

  /** Accept match challenge */
  onAcceptTap(e: WechatMiniprogram.BaseEvent) {
    const matchId = e.currentTarget.dataset['id'] as string
    const teamName = e.currentTarget.dataset['team'] as string

    wx.showLoading({ title: '检查中', mask: true })

    checkConflict(matchId)
      .then((result) => {
        wx.hideLoading()

        if (result.hasConflict && result.conflictingMatch) {
          const conflict = result.conflictingMatch
          wx.showModal({
            title: '时间冲突',
            content: `你的球队在 ${conflict.date} ${conflict.time} 已有一场与「${conflict.opponentName}」的比赛（${conflict.location}），是否仍要应战？`,
            confirmText: '继续应战',
            confirmColor: '#07c160',
            success: (modalRes) => {
              if (modalRes.confirm) {
                this.doAccept(matchId, teamName)
              }
            }
          })
          return
        }

        this.showAcceptConfirm(matchId, teamName)
      })
      .catch(() => {
        wx.hideLoading()
        this.showAcceptConfirm(matchId, teamName)
      })
  },

  showAcceptConfirm(matchId: string, teamName: string) {
    wx.showModal({
      title: '确认应战',
      content: `确认应战「${teamName}」？应战后将扣除保证金。`,
      confirmText: '确认应战',
      confirmColor: '#07c160',
      success: (res) => {
        if (res.confirm) {
          this.doAccept(matchId, teamName)
        }
      }
    })
  },

  doAccept(matchId: string, _teamName: string) {
    wx.showLoading({ title: '应战中', mask: true })

    acceptMatch(matchId)
      .then(() => {
        wx.hideLoading()
        wx.showToast({ title: '应战成功', icon: 'success' })
        this.loadMatchList(true)
      })
      .catch(() => {
        wx.hideLoading()
      })
  },

  /** FAB: navigate to create match */
  onFabTap() {
    wx.navigateTo({ url: '/pages-sub/match/create/index' })
  },

  /** VIP upsell banner tap */
  onVipBannerTap() {
    wx.showToast({ title: 'VIP 功能开发中', icon: 'none' })
  },

  /** Demo data for development (no backend running) */
  getMockData(): MatchRequest[] {
    const base = {
      costBreakdown: { pitchFee: 300, refereeFee: 100, waterFee: 0 },
      vas: { videoService: false, insurancePlayerIds: [] },
      status: 'open' as const,
      createdAt: '2026-03-04T10:00:00Z',
      updatedAt: '2026-03-04T10:00:00Z'
    }
    return [
      {
        ...base,
        id: 'demo-1',
        hostTeam: {
          id: 't1', name: '铁血战队', logo: '', creditScore: 95,
          isVerified: true, memberCount: 18, winRate: 72
        },
        date: '03月08日', time: '15:00', duration: 90,
        format: '7v7', location: '奥体中心足球场',
        fieldName: '奥体中心足球场', distance: 2.3,
        intensity: '竞技局', genderReq: 'male',
        jerseyColor: '#e53935', totalPrice: 400,
        amenities: ['有裁判', '有饮水'], urgentTop: true, memo: ''
      },
      {
        ...base,
        id: 'demo-2',
        hostTeam: {
          id: 't2', name: '快乐星球FC', logo: '', creditScore: 88,
          isVerified: false, memberCount: 22, winRate: 55
        },
        date: '03月09日', time: '10:00', duration: 120,
        format: '8v8', location: '大学城体育场',
        fieldName: '大学城体育场', distance: 5.1,
        intensity: '养生局', genderReq: 'any',
        jerseyColor: '#1e88e5', totalPrice: 300,
        amenities: ['免费停车', '有饮水'], urgentTop: false,
        memo: '欢迎新队来踢友谊赛'
      },
      {
        ...base,
        id: 'demo-3',
        hostTeam: {
          id: 't3', name: '闪电突击', logo: '', creditScore: 92,
          isVerified: true, memberCount: 15, winRate: 80
        },
        date: '03月10日', time: '19:30', duration: 90,
        format: '5v5', location: '城市运动公园',
        fieldName: '城市运动公园', distance: 1.2,
        intensity: '激战局', genderReq: 'male',
        jerseyColor: '#ff9800', totalPrice: 500,
        amenities: ['有裁判', '有录像', '免费停车'], urgentTop: false
      },
      {
        ...base,
        id: 'demo-4',
        hostTeam: {
          id: 't4', name: '周末踢球群', logo: '', creditScore: 78,
          isVerified: false, memberCount: 30, winRate: 45
        },
        date: '03月11日', time: '09:00', duration: 90,
        format: '11v11', location: '人民体育场',
        fieldName: '人民体育场', distance: 8.5,
        intensity: '养生局', genderReq: 'any',
        jerseyColor: '#43a047', totalPrice: 250,
        amenities: ['有饮水'], urgentTop: false,
        memo: '轻松踢球，重在参与'
      }
    ]
  }
})
