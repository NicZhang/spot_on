import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@/types/user'

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<User | null>(null)
  const token = ref(uni.getStorageSync('token') || '')

  function setUser(user: User) {
    userInfo.value = user
  }

  function setToken(newToken: string) {
    token.value = newToken
    uni.setStorageSync('token', newToken)
  }

  function clearUser() {
    userInfo.value = null
    token.value = ''
    uni.removeStorageSync('token')
  }

  return { userInfo, token, setUser, setToken, clearUser }
})
