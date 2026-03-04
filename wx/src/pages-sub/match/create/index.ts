import { createMatch } from '../../../api/match'
import type { CreateMatchParams, CostBreakdown, Vas } from '../../../types/match'

interface ColorOption {
  color: string
  name: string
}

interface CreateMatchData {
  /** date picker */
  showDatePicker: boolean
  currentDate: number
  minDate: number
  maxDate: number
  dateText: string
  dateValue: string

  /** time picker */
  showTimePicker: boolean
  timeText: string
  timeValue: string

  /** form fields */
  duration: number
  durationOptions: number[]
  location: string
  format: string
  formatOptions: string[]
  intensity: string
  intensityOptions: string[]
  genderReq: string
  genderOptions: Array<{ label: string; value: string }>

  /** cost */
  pitchFee: string
  refereeFee: string
  waterFee: string
  totalPrice: number

  /** jersey color */
  jerseyColor: string
  colorOptions: ColorOption[]
  showColorPicker: boolean

  /** amenities */
  amenityOptions: string[]
  selectedAmenities: string[]

  /** misc */
  memo: string
  submitting: boolean
}

const COLOR_LIST: ColorOption[] = [
  { color: '#FF0000', name: '红' },
  { color: '#FF6600', name: '橙' },
  { color: '#FFCC00', name: '黄' },
  { color: '#33CC33', name: '绿' },
  { color: '#0099FF', name: '天蓝' },
  { color: '#0033CC', name: '深蓝' },
  { color: '#9933FF', name: '紫' },
  { color: '#FF3399', name: '粉' },
  { color: '#000000', name: '黑' },
  { color: '#666666', name: '深灰' },
  { color: '#CCCCCC', name: '浅灰' },
  { color: '#FFFFFF', name: '白' }
]

const AMENITY_LIST: string[] = [
  '停车场', '淋浴间', '更衣室', '灯光', '饮水机', '看台', '储物柜'
]

Page<CreateMatchData, WechatMiniprogram.Page.CustomOption>({
  data: {
    showDatePicker: false,
    currentDate: Date.now(),
    minDate: Date.now(),
    maxDate: Date.now() + 90 * 24 * 60 * 60 * 1000,
    dateText: '',
    dateValue: '',

    showTimePicker: false,
    timeText: '',
    timeValue: '',

    duration: 90,
    durationOptions: [60, 90, 120],
    location: '',
    format: '7人制',
    formatOptions: ['5人制', '7人制', '8人制', '11人制'],
    intensity: '竞技局',
    intensityOptions: ['养生局', '竞技局', '激战局'],
    genderReq: 'any',
    genderOptions: [
      { label: '不限', value: 'any' },
      { label: '男', value: 'male' },
      { label: '女', value: 'female' }
    ],

    pitchFee: '',
    refereeFee: '',
    waterFee: '',
    totalPrice: 0,

    jerseyColor: '#FF0000',
    colorOptions: COLOR_LIST,
    showColorPicker: false,

    amenityOptions: AMENITY_LIST,
    selectedAmenities: [],

    memo: '',
    submitting: false
  },

  onLoad() {
    const now = new Date()
    const dateStr = this.formatDate(now)
    this.setData({
      dateText: dateStr,
      dateValue: dateStr,
      currentDate: now.getTime()
    })
  },

  formatDate(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  },

  // --- Date Picker ---
  onShowDatePicker(): void {
    this.setData({ showDatePicker: true })
  },

  onCloseDatePicker(): void {
    this.setData({ showDatePicker: false })
  },

  onDateConfirm(e: WechatMiniprogram.CustomEvent<{ value: number }>): void {
    const val = e.detail as unknown as number
    const d = new Date(val)
    const dateStr = this.formatDate(d)
    this.setData({
      showDatePicker: false,
      dateText: dateStr,
      dateValue: dateStr,
      currentDate: val
    })
  },

  // --- Time Picker ---
  onShowTimePicker(): void {
    this.setData({ showTimePicker: true })
  },

  onCloseTimePicker(): void {
    this.setData({ showTimePicker: false })
  },

  onTimeConfirm(e: WechatMiniprogram.CustomEvent<{ value: string }>): void {
    const val = e.detail as unknown as string
    this.setData({
      showTimePicker: false,
      timeText: val,
      timeValue: val
    })
  },

  // --- Duration ---
  onSelectDuration(e: WechatMiniprogram.BaseEvent): void {
    const duration = Number(e.currentTarget.dataset['value'])
    this.setData({ duration })
  },

  // --- Location ---
  onLocationInput(e: WechatMiniprogram.CustomEvent<{ value: string }>): void {
    this.setData({ location: e.detail as unknown as string })
  },

  // --- Format ---
  onSelectFormat(e: WechatMiniprogram.BaseEvent): void {
    const format = e.currentTarget.dataset['value'] as string
    this.setData({ format })
  },

  // --- Intensity ---
  onSelectIntensity(e: WechatMiniprogram.BaseEvent): void {
    const intensity = e.currentTarget.dataset['value'] as string
    this.setData({ intensity })
  },

  // --- Gender ---
  onSelectGender(e: WechatMiniprogram.BaseEvent): void {
    const genderReq = e.currentTarget.dataset['value'] as string
    this.setData({ genderReq })
  },

  // --- Cost ---
  onPitchFeeInput(e: WechatMiniprogram.CustomEvent<{ value: string }>): void {
    this.setData({ pitchFee: e.detail as unknown as string })
    this.calcTotal()
  },

  onRefereeFeeInput(e: WechatMiniprogram.CustomEvent<{ value: string }>): void {
    this.setData({ refereeFee: e.detail as unknown as string })
    this.calcTotal()
  },

  onWaterFeeInput(e: WechatMiniprogram.CustomEvent<{ value: string }>): void {
    this.setData({ waterFee: e.detail as unknown as string })
    this.calcTotal()
  },

  calcTotal(): void {
    const { pitchFee, refereeFee, waterFee } = this.data
    const total = (Number(pitchFee) || 0) + (Number(refereeFee) || 0) + (Number(waterFee) || 0)
    this.setData({ totalPrice: total })
  },

  // --- Jersey Color ---
  onShowColorPicker(): void {
    this.setData({ showColorPicker: true })
  },

  onCloseColorPicker(): void {
    this.setData({ showColorPicker: false })
  },

  onSelectColor(e: WechatMiniprogram.BaseEvent): void {
    const color = e.currentTarget.dataset['color'] as string
    this.setData({ jerseyColor: color, showColorPicker: false })
  },

  // --- Amenities ---
  onToggleAmenity(e: WechatMiniprogram.BaseEvent): void {
    const item = e.currentTarget.dataset['item'] as string
    const selected = [...this.data.selectedAmenities]
    const idx = selected.indexOf(item)
    if (idx >= 0) {
      selected.splice(idx, 1)
    } else {
      selected.push(item)
    }
    this.setData({ selectedAmenities: selected })
  },

  // --- Memo ---
  onMemoInput(e: WechatMiniprogram.CustomEvent<{ value: string }>): void {
    this.setData({ memo: e.detail as unknown as string })
  },

  // --- Submit ---
  async onSubmit(): Promise<void> {
    if (this.data.submitting) return

    const { dateValue, timeValue, location, format, intensity, genderReq, jerseyColor, duration } = this.data
    if (!dateValue) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }
    if (!timeValue) {
      wx.showToast({ title: '请选择时间', icon: 'none' })
      return
    }
    if (!location.trim()) {
      wx.showToast({ title: '请输入地点', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '发布中' })

    const costBreakdown: CostBreakdown = {
      pitchFee: Number(this.data.pitchFee) || 0,
      refereeFee: Number(this.data.refereeFee) || 0,
      waterFee: Number(this.data.waterFee) || 0
    }

    const vas: Vas = {
      videoService: false,
      insurancePlayerIds: []
    }

    const params: CreateMatchParams = {
      date: dateValue,
      time: timeValue,
      duration,
      format,
      location: location.trim(),
      intensity: intensity as CreateMatchParams['intensity'],
      genderReq: genderReq as CreateMatchParams['genderReq'],
      jerseyColor,
      costBreakdown,
      amenities: this.data.selectedAmenities,
      vas,
      memo: this.data.memo || undefined
    }

    try {
      await createMatch(params)
      wx.hideLoading()
      wx.showToast({ title: '发布成功', icon: 'success' })
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
