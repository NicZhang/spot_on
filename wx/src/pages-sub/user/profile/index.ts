import { getPlayerDetail, updatePlayer } from '../../../api/team'
import type { Player, PlayerStats, UpdatePlayerParams } from '../../../types/team'

interface UserProfileData {
  playerId: string
  loading: boolean
  player: Player | null

  /** display */
  avatar: string
  stats: PlayerStats

  /** form fields */
  name: string
  number: string
  position: string
  positionOptions: string[]
  level: string
  levelOptions: string[]
  height: string
  weight: string
  strongFoot: string
  strongFootOptions: Array<{ label: string; value: string }>

  submitting: boolean
}

Page<UserProfileData, WechatMiniprogram.Page.CustomOption>({
  data: {
    playerId: '',
    loading: true,
    player: null,

    avatar: '',
    stats: { goals: 0, assists: 0, mvpCount: 0 },

    name: '',
    number: '',
    position: '',
    positionOptions: ['前锋', '中场', '后卫', '门将', '自由人'],
    level: '',
    levelOptions: ['入门', '业余', '校队', '青训', '退役职业'],
    height: '',
    weight: '',
    strongFoot: 'right',
    strongFootOptions: [
      { label: '右脚', value: 'right' },
      { label: '左脚', value: 'left' },
      { label: '双脚', value: 'both' }
    ],

    submitting: false
  },

  onLoad(options: Record<string, string | undefined>) {
    const id = options['id']
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      wx.navigateBack()
      return
    }
    this.setData({ playerId: id })
    this.loadDetail()
  },

  async loadDetail(): Promise<void> {
    const { playerId } = this.data
    if (!playerId) return

    wx.showLoading({ title: '加载中' })
    try {
      const player = await getPlayerDetail(playerId)
      this.setData({
        loading: false,
        player,
        avatar: player.avatar,
        stats: player.stats,
        name: player.name,
        number: String(player.number),
        position: player.position,
        level: player.level || '',
        height: player.height ? String(player.height) : '',
        weight: player.weight ? String(player.weight) : '',
        strongFoot: player.strongFoot || 'right'
      })
    } catch (_err) {
      this.setData({ loading: false })
    } finally {
      wx.hideLoading()
    }
  },

  // --- Avatar ---
  onChangeAvatar(): void {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0]?.tempFilePath
        if (tempFilePath) {
          this.setData({ avatar: tempFilePath })
        }
      }
    })
  },

  // --- Name ---
  onNameInput(e: WechatMiniprogram.CustomEvent<{ value: string }>): void {
    this.setData({ name: e.detail as unknown as string })
  },

  // --- Number ---
  onNumberInput(e: WechatMiniprogram.CustomEvent<{ value: string }>): void {
    this.setData({ number: e.detail as unknown as string })
  },

  // --- Position ---
  onSelectPosition(e: WechatMiniprogram.BaseEvent): void {
    const position = e.currentTarget.dataset['value'] as string
    this.setData({ position })
  },

  // --- Level ---
  onSelectLevel(e: WechatMiniprogram.BaseEvent): void {
    const level = e.currentTarget.dataset['value'] as string
    this.setData({ level })
  },

  // --- Height ---
  onHeightInput(e: WechatMiniprogram.CustomEvent<{ value: string }>): void {
    this.setData({ height: e.detail as unknown as string })
  },

  // --- Weight ---
  onWeightInput(e: WechatMiniprogram.CustomEvent<{ value: string }>): void {
    this.setData({ weight: e.detail as unknown as string })
  },

  // --- Strong Foot ---
  onSelectStrongFoot(e: WechatMiniprogram.BaseEvent): void {
    const strongFoot = e.currentTarget.dataset['value'] as string
    this.setData({ strongFoot })
  },

  // --- Save ---
  async onSave(): Promise<void> {
    if (this.data.submitting) return

    const { name, number } = this.data
    if (!name.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }
    if (!number) {
      wx.showToast({ title: '请输入球衣号码', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '保存中' })

    const params: UpdatePlayerParams = {
      name: name.trim(),
      number: Number(number),
      position: this.data.position || undefined,
      avatar: this.data.avatar || undefined,
      height: this.data.height ? Number(this.data.height) : undefined,
      weight: this.data.weight ? Number(this.data.weight) : undefined,
      strongFoot: (this.data.strongFoot as UpdatePlayerParams['strongFoot']) || undefined,
      level: (this.data.level as UpdatePlayerParams['level']) || undefined
    }

    try {
      await updatePlayer(this.data.playerId, params)
      wx.hideLoading()
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (_err) {
      wx.hideLoading()
    } finally {
      this.setData({ submitting: false })
    }
  }
})
