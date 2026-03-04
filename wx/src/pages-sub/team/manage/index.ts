import { getTeamDetail, updateTeam, createTeam } from '../../../api/team'
import type { Team, UpdateTeamParams, CreateTeamParams } from '../../../types/team'

interface ColorOption {
  color: string
  name: string
}

interface TeamManageData {
  isCreateMode: boolean
  teamId: string
  loading: boolean
  team: Team | null
  name: string
  logo: string
  gender: string
  location: string
  genderOptions: Array<{ label: string; value: string }>
  announcement: string
  homeJerseyColor: string
  awayJerseyColor: string
  colorOptions: ColorOption[]
  showHomePicker: boolean
  showAwayPicker: boolean
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

Page<TeamManageData, WechatMiniprogram.Page.CustomOption>({
  data: {
    isCreateMode: false,
    teamId: '',
    loading: true,
    team: null,
    name: '',
    logo: '',
    gender: '',
    location: '',
    genderOptions: [
      { label: '男子', value: 'male' },
      { label: '女子', value: 'female' }
    ],
    announcement: '',
    homeJerseyColor: '#FF0000',
    awayJerseyColor: '#FFFFFF',
    colorOptions: COLOR_LIST,
    showHomePicker: false,
    showAwayPicker: false,
    submitting: false
  },

  onLoad(options: Record<string, string | undefined>) {
    const id = options['id']
    if (!id) {
      // Create mode
      wx.setNavigationBarTitle({ title: '创建球队' })
      this.setData({ isCreateMode: true, loading: false })
      return
    }
    this.setData({ teamId: id })
    this.loadDetail()
  },

  async loadDetail(): Promise<void> {
    const { teamId } = this.data
    if (!teamId) return

    wx.showLoading({ title: '加载中' })
    try {
      const team = await getTeamDetail(teamId)
      this.setData({
        loading: false,
        team,
        name: team.name,
        logo: team.logo,
        gender: team.gender,
        announcement: team.announcement || '',
        homeJerseyColor: team.homeJerseyColor || '#FF0000',
        awayJerseyColor: team.awayJerseyColor || '#FFFFFF'
      })
    } catch (_err) {
      this.setData({ loading: false })
    } finally {
      wx.hideLoading()
    }
  },

  // --- Logo Upload ---
  onChangeLogo(): void {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0]?.tempFilePath
        if (tempFilePath) {
          // Upload to server and get URL
          // For now, set the temp path for preview
          this.setData({ logo: tempFilePath })
        }
      }
    })
  },

  // --- Name ---
  onNameInput(e: WechatMiniprogram.CustomEvent<{ value: string }>): void {
    this.setData({ name: e.detail as unknown as string })
  },

  // --- Gender ---
  onSelectGender(e: WechatMiniprogram.BaseEvent): void {
    const gender = e.currentTarget.dataset['value'] as string
    this.setData({ gender })
  },

  // --- Announcement ---
  onAnnouncementInput(e: WechatMiniprogram.CustomEvent<{ value: string }>): void {
    this.setData({ announcement: e.detail as unknown as string })
  },

  // --- Location ---
  onLocationInput(e: WechatMiniprogram.CustomEvent<{ value: string }>): void {
    this.setData({ location: e.detail as unknown as string })
  },

  // --- Home Jersey Color ---
  onShowHomePicker(): void {
    this.setData({ showHomePicker: true })
  },

  onCloseHomePicker(): void {
    this.setData({ showHomePicker: false })
  },

  onSelectHomeColor(e: WechatMiniprogram.BaseEvent): void {
    const color = e.currentTarget.dataset['color'] as string
    this.setData({ homeJerseyColor: color, showHomePicker: false })
  },

  // --- Away Jersey Color ---
  onShowAwayPicker(): void {
    this.setData({ showAwayPicker: true })
  },

  onCloseAwayPicker(): void {
    this.setData({ showAwayPicker: false })
  },

  onSelectAwayColor(e: WechatMiniprogram.BaseEvent): void {
    const color = e.currentTarget.dataset['color'] as string
    this.setData({ awayJerseyColor: color, showAwayPicker: false })
  },

  // --- Save ---
  async onSave(): Promise<void> {
    if (this.data.submitting) return

    const { name, isCreateMode, gender, location } = this.data
    if (!name.trim()) {
      wx.showToast({ title: '请输入球队名称', icon: 'none' })
      return
    }

    if (isCreateMode) {
      if (!gender) {
        wx.showToast({ title: '请选择球队性别', icon: 'none' })
        return
      }
      if (!location.trim()) {
        wx.showToast({ title: '请输入球队所在地', icon: 'none' })
        return
      }
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '保存中' })

    try {
      if (isCreateMode) {
        const params: CreateTeamParams = {
          name: name.trim(),
          gender: gender as 'male' | 'female',
          location: location.trim()
        }
        await createTeam(params)
        wx.hideLoading()
        wx.showToast({ title: '创建成功', icon: 'success' })
      } else {
        const params: UpdateTeamParams = {
          name: name.trim(),
          announcement: this.data.announcement || undefined,
          logo: this.data.logo || undefined,
          homeJerseyColor: this.data.homeJerseyColor,
          awayJerseyColor: this.data.awayJerseyColor
        }
        await updateTeam(this.data.teamId, params)
        wx.hideLoading()
        wx.showToast({ title: '保存成功', icon: 'success' })
      }
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
