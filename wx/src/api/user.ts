import { request } from '../utils/request'
import type { UserProfile } from '../types/user'

export function getUserProfile() {
  return request<UserProfile>({
    url: '/users/me',
    method: 'GET'
  })
}
