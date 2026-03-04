import { request } from '../utils/request'
import type { PaginatedResult, PaginationParams } from '../types/common'
import type { ChatSession, ChatMessage } from '../types/chat'

/** 获取聊天列表 */
export function getChatList(params?: PaginationParams) {
  return request<PaginatedResult<ChatSession>>({
    url: '/chats',
    method: 'GET',
    data: params as WechatMiniprogram.IAnyObject
  })
}

/** 获取聊天消息 */
export function getChatMessages(sessionId: string, page: number = 1, pageSize: number = 20) {
  return request<PaginatedResult<ChatMessage>>({
    url: `/chats/${sessionId}/messages`,
    method: 'GET',
    data: { page, pageSize }
  })
}

/** 发送消息 */
export function sendMessage(sessionId: string, text: string) {
  return request<ChatMessage>({
    url: `/chats/${sessionId}/messages`,
    method: 'POST',
    data: { text }
  })
}

/** 创建聊天会话 */
export function createChat(targetUserId: string) {
  return request<ChatSession>({
    url: '/chats',
    method: 'POST',
    data: { targetUserId }
  })
}
