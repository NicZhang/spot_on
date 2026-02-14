<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'

onLaunch(() => {
  const token = uni.getStorageSync('token')
  if (!token) {
    console.log('[App] 用户未登录')
  }
})
</script>

<style>
page {
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
  font-size: 28rpx;
  color: #333333;
}
</style>
