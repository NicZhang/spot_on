/** 聊天会话 */
export interface ChatSession {
  id: string
  participants: string[]
  name: string
  avatar: string
  lastMessage: string
  lastTime: string
  unreadCount: number
  isAi?: boolean
  createdAt: string
  updatedAt: string
}

/** 聊天消息卡片数据 */
export interface ChatCardData {
  type: 'team' | 'match'
  data: Record<string, unknown>
}

/** 聊天消息 */
export interface ChatMessage {
  id: string
  sessionId: string
  senderId: string
  text: string
  timestamp: number
  type: 'text' | 'card'
  cardData?: ChatCardData
  isRead: boolean
  createdAt: string
}
