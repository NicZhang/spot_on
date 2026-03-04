# 约球平台 API 快速参考指南

## 快速导航

### 认证相关
| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/auth/wechat/login` | 微信登录 |
| POST | `/auth/phone/login` | 手机登录 |
| POST | `/auth/phone/send-code` | 发送验证码 |
| POST | `/auth/phone/bind` | 绑定手机号 |
| POST | `/auth/refresh` | 刷新 Token |
| POST | `/auth/logout` | 退出登录 |

### 用户相关
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/users/me` | 获取当前用户 |
| PATCH | `/users/me` | 更新用户信息 |
| GET | `/users/me/notifications` | 获取通知设置 |
| PATCH | `/users/me/notifications` | 更新通知设置 |

### 球队相关
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/teams/mine` | 我的球队 |
| GET | `/teams/search` | 搜索球队 |
| GET | `/teams/{id}` | 球队详情 |
| POST | `/teams` | 创建球队 |
| PATCH | `/teams/{id}` | 更新球队 |
| PUT | `/teams/{id}/switch` | 切换球队 |
| POST | `/teams/{id}/verification` | 提交实名认证 |
| GET | `/teams/{id}/verification` | 查询认证状态 |
| POST | `/teams/{id}/report` | 举报球队 |

### 队员相关
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/teams/{id}/players` | 队员列表 |
| GET | `/players/{id}` | 队员详情 |
| PATCH | `/players/{id}` | 更新队员 |
| POST | `/teams/{id}/invite` | 生成邀请 |
| POST | `/teams/join/{code}` | 接受邀请 |
| DELETE | `/teams/{teamId}/players/{playerId}` | 移除队员 |

### 约球相关
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/matches` | 约球列表 |
| GET | `/matches/{id}` | 约球详情 |
| POST | `/matches` | 发起约球 |
| POST | `/matches/{id}/accept` | 应战 |
| POST | `/matches/{id}/cancel` | 取消应战 |
| GET | `/matches/{id}/conflict-check` | 冲突检查 |

### 赛程相关
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/matches/schedule` | 我的赛程 |
| GET | `/matches/history` | 历史战绩 |
| POST | `/matches/{id}/report` | 录入数据 |
| PATCH | `/matches/{id}/report` | 修改数据 |
| POST | `/matches/{id}/confirm` | 确认结果 |
| GET | `/matches/{id}/report-image` | 战报图片 |

### 财务相关
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/teams/{id}/bills` | 账单列表 |
| GET | `/teams/{id}/transactions` | 交易流水 |
| POST | `/teams/{id}/transactions` | 记录交易 |
| POST | `/bills/{id}/remind` | 催收提醒 |
| POST | `/bills/{id}/players/{playerId}/pay` | 标记付款 |
| GET | `/teams/{id}/finance/export` | 导出报表 |

### 聊天相关
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/chats` | 会话列表 |
| GET | `/chats/{id}/messages` | 消息列表 |
| POST | `/chats/{id}/messages` | 发送消息 |
| POST | `/chats` | 创建会话 |
| DELETE | `/chats/{id}` | 删除会话 |
| POST | `/chats/ai/messages` | AI 助手对话 |

### VIP 相关
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/vip/plans` | VIP 方案 |
| POST | `/vip/subscribe` | 订阅 VIP |
| GET | `/vip/status` | VIP 状态 |
| POST | `/vip/restore` | 恢复购买 |

### 文件上传
| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/upload` | 上传文件（头像/Logo/认证材料） |

---

## HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | OK - 成功 |
| 201 | Created - 资源已创建 |
| 400 | Bad Request - 请求参数错误 |
| 401 | Unauthorized - 未认证 |
| 403 | Forbidden - 权限不足 |
| 404 | Not Found - 资源不存在 |
| 409 | Conflict - 资源冲突 |
| 422 | Unprocessable Entity - 业务规则验证失败 |
| 429 | Too Many Requests - 请求过于频繁 |
| 500 | Internal Server Error - 服务器错误 |

---

## 常用错误码

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 1 | 系统错误 |
| 1001 | 数据库错误 |
| 4000 | 请求参数错误 |
| 4001 | 用户未认证 |
| 4002 | 权限不足（VIP） |
| 4003 | 权限不足（其他） |
| 4004 | 资源不存在 |
| 4005 | 资源冲突 |
| 4006 | 请求过于频繁 |
| 4007 | 业务规则验证失败 |

---

## 认证流程

### 1. 微信登录
```bash
curl -X POST https://api.spoton.example.com/api/v1/auth/wechat/login \
  -H "Content-Type: application/json" \
  -d '{
    "code": "081xxxxxxxxxxxx"
  }'
```

### 2. 使用 Token
```bash
curl -X GET https://api.spoton.example.com/api/v1/users/me \
  -H "Authorization: Bearer <jwt_token>"
```

### 3. 刷新 Token
```bash
curl -X POST https://api.spoton.example.com/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refresh_token>"
  }'
```

---

## 分页查询示例

```bash
# 获取第 1 页，每页 20 条
GET /teams/search?page=1&pageSize=20

# 按距离排序，升序
GET /teams/search?sortBy=distance&order=asc

# 合并多个筛选条件
GET /matches?format=11人制&intensity=竞技局&minCredit=80&page=1
```

---

## 常见业务场景

### 场景 1：注册并创建球队

1. 微信登录获取 token
   ```
   POST /auth/wechat/login
   ```

2. 创建球队
   ```
   POST /teams
   ```

3. 邀请队员
   ```
   POST /teams/{teamId}/invite
   ```

### 场景 2：发起约球流程

1. 检查赛程冲突
   ```
   GET /matches/schedule
   ```

2. 发起约球
   ```
   POST /matches
   ```

3. 等待应战
   ```
   GET /matches/{id}  (轮询)
   ```

4. 获得应战后，赛后录入数据
   ```
   POST /matches/{id}/report
   ```

5. 等待对方确认
   ```
   POST /matches/{id}/confirm  (对方调用)
   ```

### 场景 3：查询战绩

1. 获取历史战绩
   ```
   GET /matches/history
   ```

2. 查看详细数据
   ```
   GET /matches/{id}/report
   ```

3. 生成战报图片
   ```
   GET /matches/{id}/report-image?template=classic
   ```

### 场景 4：财务管理

1. 查询账单
   ```
   GET /teams/{id}/bills
   ```

2. 查询交易流水
   ```
   GET /teams/{id}/transactions?startDate=2026-03-01&endDate=2026-03-31
   ```

3. 催收提醒
   ```
   POST /bills/{id}/remind
   ```

4. 标记付款
   ```
   POST /bills/{id}/players/{playerId}/pay
   ```

### 场景 5：球队认证

1. 上传认证材料
   ```
   POST /upload (type=id_front/id_back/team_photo)
   ```

2. 提交认证
   ```
   POST /teams/{id}/verification
   ```

3. 查询状态
   ```
   GET /teams/{id}/verification
   ```

### 场景 6：AI 助手

1. 发送消息
   ```
   POST /chats/ai/messages
   ```

2. AI 返回文本或卡片建议（team/match 类型）

---

## 权限级别速览

| 功能 | PLAYER | FREE_CAPTAIN | VIP_CAPTAIN |
|------|--------|--------------|-------------|
| 查看约球 | ✓ | ✓ | ✓ |
| 发起约球 | ✗ | ✓ | ✓ |
| 创建球队 | ✗ | ✓(1支) | ✓(无限) |
| 高级筛选 | ✗ | ✗ | ✓ |
| 战报模板 | ✗ | ✗ | ✓ |
| 财务导出 | ✗ | ✗ | ✓ |
| 屏蔽球队 | ✗ | ✗ | ✓ |
| 查看对手信用历史 | ✗ | ✗ | ✓ |
| 智能催收 | ✗ | ✗ | ✓ |

---

## 请求响应示例

### 成功响应

```json
{
  "success": true,
  "code": 0,
  "message": "操作成功",
  "data": {
    "id": "user_123",
    "name": "张三",
    "role": "FREE_CAPTAIN"
  },
  "timestamp": "2026-03-04T14:30:00Z"
}
```

### 分页响应

```json
{
  "success": true,
  "code": 0,
  "message": "查询成功",
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "pageCount": 5
  },
  "timestamp": "2026-03-04T14:30:00Z"
}
```

### 错误响应

```json
{
  "success": false,
  "code": 4002,
  "message": "该功能仅 VIP 用户可用",
  "data": null,
  "timestamp": "2026-03-04T14:30:00Z"
}
```

---

## 联系方式

- API 文档完整版: `/docs/API_SPEC.md`
- 技术支持: api-support@spoton.example.com
- Bug 反馈: github.com/spotOn/api/issues
- 最后更新: 2026-03-04 (v1.2)
