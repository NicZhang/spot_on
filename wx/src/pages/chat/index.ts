import { getChatList } from '../../api/chat'
import { isLoggedIn } from '../../utils/auth'
import type { ChatSession } from '../../types/chat'
import type { PaginatedResult } from '../../types/common'

/** 格式化聊天时间：今天显示时间，昨天显示"昨天"，7天内显示星期，更早显示日期 */
function formatChatTime(timeStr: string): string {
  if (['刚刚', '今天', '昨天'].includes(timeStr)) return timeStr
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) return timeStr

  const date = new Date(timeStr)
  if (isNaN(date.getTime())) return timeStr

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return weekdays[date.getDay()] as string
  }
  return `${date.getMonth() + 1}/${date.getDate()}`
}

interface PageData {
  loading: boolean
  chatList: ChatSession[]
  filteredList: ChatSession[]
  searchValue: string
  isLoggedIn: boolean
}

Page<PageData, WechatMiniprogram.Page.CustomOption>({
  data: {
    loading: false,
    chatList: [],
    filteredList: [],
    searchValue: '',
    isLoggedIn: false
  },

  onShow() {
    this.loadChatList()
  },

  onPullDownRefresh() {
    this.loadChatList().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  /** 加载聊天列表 */
  async loadChatList(): Promise<void> {
    if (!isLoggedIn()) {
      this.setData({ isLoggedIn: false, chatList: [], filteredList: [] })
      return
    }

    this.setData({ loading: true, isLoggedIn: true })

    try {
      const result: PaginatedResult<ChatSession> = await getChatList({ page: 1, pageSize: 50 })
      const list = result.items.map((item) => ({
        ...item,
        lastTime: formatChatTime(item.lastTime)
      }))
      this.setData({ chatList: list, filteredList: list })
    } catch (err) {
      const errorObj = err as Error
      console.error('[chat] loadChatList failed:', errorObj.message)
    } finally {
      this.setData({ loading: false })
    }
  },

  /** 搜索过滤 */
  onSearchChange(e: WechatMiniprogram.CustomEvent) {
    const detail = e.detail as string | { value: string }
    const query = (typeof detail === 'string' ? detail : detail.value || '').toLowerCase()
    this.setData({ searchValue: query })

    if (!query.trim()) {
      this.setData({ filteredList: this.data.chatList })
      return
    }

    const filtered = this.data.chatList.filter(
      (c) => c.name.toLowerCase().includes(query) || c.lastMessage.toLowerCase().includes(query)
    )
    this.setData({ filteredList: filtered })
  },

  /** 清除搜索 */
  onSearchClear() {
    this.setData({ searchValue: '', filteredList: this.data.chatList })
  },

  /** 进入聊天详情 */
  onChatTap(e: WechatMiniprogram.TouchEvent) {
    const sessionId = e.currentTarget.dataset['id'] as string
    if (sessionId) {
      wx.navigateTo({ url: `/pages-sub/chat/detail/index?id=${sessionId}` })
    }
  },

  /** 未登录时跳转登录 */
  onLogin() {
    wx.navigateTo({ url: '/pages/login/index' })
  },

  /** 去约球大厅 */
  onGoLobby() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
