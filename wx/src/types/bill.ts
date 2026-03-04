/** 账单中的队员支付状态 */
export interface BillPlayer {
  playerId: string
  status: 'paid' | 'unpaid'
  paidAt?: string
}

/** 账单 */
export interface Bill {
  id: string
  matchRecordId: string
  teamId: string
  title: string
  date: string
  totalAmount: number
  perHead: number
  paidCount: number
  totalCount: number
  status: 'collecting' | 'completed'
  players: BillPlayer[]
  createdAt: string
  updatedAt: string
}

/** 交易流水 */
export interface Transaction {
  id: string
  teamId: string
  type: 'income' | 'expense'
  amount: number
  description: string
  category: string
  relatedMatchId?: string
  operator: string
  date: string
  createdAt: string
}
