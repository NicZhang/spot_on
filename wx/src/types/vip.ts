/** VIP 订阅计划 */
export interface VipPlan {
  id: string
  name: string
  price: number
  originalPrice: number
  period: string
  label?: string
  recommended?: boolean
}

/** VIP 订阅 */
export interface VipSubscription {
  id: string
  userId: string
  planId: string
  planName: string
  price: number
  status: 'active' | 'expired' | 'cancelled'
  startDate: string
  endDate: string
  autoRenew: boolean
  paymentMethod: 'apple_pay' | 'wechat_pay'
  createdAt: string
  updatedAt: string
}
