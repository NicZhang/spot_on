# 约球平台 API 规范

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.2 |
| 发布日期 | 2026-03-04 |
| 作者 | API 设计团队 |
| 状态 | 草案（Draft） |
| 后端框架 | FastAPI v0.110+ + SQLModel + PostgreSQL |

---

## 一、通用约定

### 1.1 基础信息

- **API 基础路径**: `https://api.spoton.example.com/api/v1`
- **请求格式**: JSON
- **响应格式**: JSON
- **字符编码**: UTF-8
- **时间格式**: ISO 8601（例：`2026-03-04T14:30:00Z`）
- **分页**: 默认每页 20 条，最多 100 条

### 1.2 通用请求头

所有请求应包含以下标准请求头：

| 请求头 | 值 | 必需 | 说明 |
|--------|-----|------|------|
| `Content-Type` | `application/json` | 是 | JSON 请求体 |
| `Accept` | `application/json` | 是 | 期望响应格式 |
| `Authorization` | `Bearer <jwt_token>` | 否* | JWT 令牌（登录后需要） |
| `X-Client-Version` | `2.1.0` | 否 | 客户端版本号 |
| `X-Device-Id` | UUID | 否 | 设备唯一标识 |

*标记为"否"的接口表示不需要认证（如登录）；其他接口默认需要认证。

### 1.3 统一响应格式

所有 API 响应采用以下通用包装结构：

**成功响应 (HTTP 200 / 201)**

```json
{
  "success": true,
  "code": 0,
  "message": "操作成功",
  "data": {
    // 具体业务数据
  },
  "timestamp": "2026-03-04T14:30:00Z"
}
```

**分页响应**

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

**错误响应 (HTTP 4xx / 5xx)**

```json
{
  "success": false,
  "code": 4001,
  "message": "用户未认证",
  "data": null,
  "timestamp": "2026-03-04T14:30:00Z",
  "errors": [
    {
      "field": "email",
      "message": "邮箱格式不正确"
    }
  ]
}
```

### 1.4 通用错误码

| 错误码 | HTTP 状态 | 说明 |
|--------|----------|------|
| 0 | 200 | 成功 |
| 1 | 500 | 系统错误 |
| 1001 | 500 | 数据库错误 |
| 4000 | 400 | 请求参数错误 |
| 4001 | 401 | 用户未认证 |
| 4002 | 403 | 权限不足（需要 VIP） |
| 4003 | 403 | 权限不足（其他） |
| 4004 | 404 | 资源不存在 |
| 4005 | 409 | 资源冲突（如重复创建） |
| 4006 | 429 | 请求过于频繁 |
| 4007 | 422 | 业务规则验证失败 |

### 1.5 分页参数

使用以下查询参数实现分页：

| 参数 | 类型 | 默认值 | 范围 | 说明 |
|------|------|--------|------|------|
| `page` | integer | 1 | >= 1 | 页码 |
| `pageSize` | integer | 20 | 1-100 | 每页条数 |
| `sortBy` | string | - | - | 排序字段（见具体接口） |
| `order` | string | asc | asc/desc | 排序顺序 |

### 1.6 认证机制

#### JWT Token 获取流程

1. 用户通过微信登录或手机号登录获得 JWT token
2. 在后续请求的 `Authorization` 头中添加：`Bearer <token>`
3. Token 有效期为 7 天，可通过刷新端点延期
4. Token 过期后需要重新登录

#### 权限级别

| 角色 | 权限说明 |
|------|---------|
| 未登录用户 | 仅可访问公开接口（登录、注册等） |
| 普通玩家 (PLAYER) | 可查看约球、申请加入球队等 |
| 免费队长 (FREE_CAPTAIN) | 可创建 1 支球队，发起约球、管理队员 |
| VIP 队长 (VIP_CAPTAIN) | 可创建多支球队，使用高级功能（高级筛选、战报模板、财务导出等） |

### 1.7 通用业务规则

#### 时间冲突检查

约球应战前系统自动检查时间冲突：
- 同一球队不能在时间重叠的两场比赛中都报名
- 检查逻辑：新约球时间 与 已有赛程 有 > 30 分钟重叠则冲突

#### 资金相关

- 应战约球时扣除 50% 订金（防止爽约）
- 比赛完成后结算全额球费
- 取消应战时返还订金
- 球队资金余额不足时无法应战

#### 信用评分

- 初始信用分：100
- 爽约一次：-30
- 打假球或争议：-20
- 完成一场赛事：+2
- 最低信用分：0
- 信用分 < 70 时，VIP 方可屏蔽该球队

---

## 二、数据模型

### 2.1 用户 (User)

```typescript
interface User {
  id: string;              // 用户 ID（UUID）
  openId: string;          // 微信 OpenID
  unionId?: string;        // 微信 UnionID
  phone?: string;          // 绑定的手机号
  name: string;            // 用户昵称
  avatar: string;          // 头像 URL
  gender: 'male' | 'female' | 'unknown';  // 性别
  role: 'PLAYER' | 'FREE_CAPTAIN' | 'VIP_CAPTAIN';
  stats: {
    goals: number;         // 进球总数
    assists: number;       // 助攻总数
    mvpCount: number;      // MVP 次数
    appearances: number;   // 出场次数
    balance: number;       // 账户余额（元）
  };
  currentTeamId?: string;  // 当前球队 ID
  createdAt: string;       // 创建时间
  updatedAt: string;       // 更新时间
}
```

### 2.2 球队 (Team)

```typescript
interface Team {
  id: string;
  name: string;
  logo: string;            // Logo URL
  gender: 'male' | 'female';
  avgAge: number;          // 平均年龄
  creditScore: number;     // 0-100 信用分
  winRate: number;         // 0-100 胜率
  tags: string[];          // 标签，如 "球风干净", "传中强手", "裁判争议"
  location: string;        // 常驻地点
  isVerified: boolean;     // 是否实名认证
  homeJerseyColor?: string;  // 主场球衣颜色（HEX）
  awayJerseyColor?: string;  // 客场球衣颜色（HEX）
  fundBalance: number;     // 队费余额（元）
  announcement?: string;   // 球队公告
  captainId: string;       // 队长 ID
  memberCount: number;     // 队员数
  recentResults?: Array<{  // 近 10 场战绩
    opponent: string;
    myScore: number;
    opponentScore: number;
    date: string;
  }>;
  creditHistory?: Array<{  // 信用历史（VIP 可见）
    date: string;
    change: number;        // 变化值（+/-）
    reason: string;        // 原因
  }>;
  createdAt: string;
  updatedAt: string;
}
```

### 2.3 队员 (Player)

```typescript
interface Player {
  id: string;
  teamId: string;
  userId: string;
  name: string;
  number: number;          // 球衣号码
  position: string;        // 位置（如 ST, CM, CB 等）
  avatar: string;
  height?: number;         // 身高（cm）
  weight?: number;         // 体重（kg）
  strongFoot?: 'right' | 'left' | 'both';
  level?: '入门' | '业余' | '校队' | '青训' | '退役职业';
  phone?: string;
  stats: {
    goals: number;
    assists: number;
    mvpCount: number;
  };
  createdAt: string;
  updatedAt: string;
}
```

### 2.4 约球 (Match Request)

```typescript
interface MatchRequest {
  id: string;
  hostTeamId: string;
  hostTeam?: Team;         // 关联的球队信息
  guestTeamId?: string;    // 应战球队 ID
  guestTeam?: Team;        // 应战球队信息

  // 基本信息
  date: string;            // 比赛日期（YYYY-MM-DD）
  time: string;            // 比赛时间（HH:mm）
  duration: number;        // 时长（分钟）
  location: string;        // 比赛地点
  fieldName?: string;      // 具体场地名称（如 "5号场"）
  format: string;          // 赛制（"7人制", "11人制"）

  // 要求
  intensity: '养生局' | '竞技局' | '激战局';  // 比赛强度
  genderReq: 'any' | 'male' | 'female';  // 性别要求

  // 费用
  costBreakdown: {
    pitchFee: number;      // 场地费（元）
    refereeFee: number;    // 裁判费（元）
    waterFee: number;      // 水/饮料费（元）
  };
  totalPrice: number;      // 总费用（元）

  // 其他
  status: 'open' | 'matched' | 'finished' | 'cancelled';
  distance?: number;       // 距离（km）
  jerseyColor: string;     // 主队球衣颜色
  amenities: string[];     // 设施（如 "更衣室", "停车场", "餐厅"）

  // 增值服务
  vas: {
    videoService: boolean;        // 视频录制
    insurancePlayerIds: string[]; // 买保险的队员 ID
  };

  // 置顶 & 排序
  urgentTop: boolean;             // 是否紧急置顶（VIP 功能）

  // 备注
  memo?: string;                  // 约球备注（如 "欢迎新手参加"）

  createdAt: string;
  updatedAt: string;
}
```

### 2.5 赛程记录 (Match Record)

```typescript
interface MatchRecord {
  id: string;
  hostTeamId: string;
  guestTeamId: string;
  hostTeamScore?: number;
  guestTeamScore?: number;

  // 对手信息（通过 join 返回，便于前端展示）
  opponentName?: string;         // 对手球队名称
  opponentLogo?: string;         // 对手球队 Logo
  opponentId?: string;           // 对手球队 ID

  date: string;            // 比赛日期
  time: string;
  location: string;
  format: string;
  duration: number;

  status: 'upcoming' | 'pending_report' | 'waiting_confirmation'
         | 'confirm_needed' | 'finished' | 'cancelled';
  // 状态流转：upcoming → pending_report → waiting_confirmation → confirm_needed → finished
  // 取消路径：upcoming/pending_report → cancelled

  // 比赛数据（主队输入）
  report?: {
    myScore: number;
    opponentScore: number;
    mvpPlayerId?: string;
    goals: Array<{
      playerId: string;
      count: number;
    }>;
    assists: Array<{
      playerId: string;
      count: number;
    }>;
    lineup: string[];      // 首发队员 ID 列表
  };

  // 费用结算
  totalFee: number;
  feePerPlayer: number;

  createdAt: string;
  updatedAt: string;
}
```

### 2.6 账单 (Bill)

```typescript
interface Bill {
  id: string;
  matchRecordId: string;
  teamId: string;
  title: string;           // 账单标题
  date: string;            // 账单日期

  totalAmount: number;     // 总金额（元）
  perHead: number;         // 人均金额（元）
  paidCount: number;       // 已付人数
  totalCount: number;      // 总人数
  status: 'collecting' | 'completed';

  players: Array<{
    playerId: string;
    status: 'paid' | 'unpaid';
    paidAt?: string;
  }>;

  createdAt: string;
  updatedAt: string;
}
```

### 2.7 交易流水 (Transaction)

```typescript
interface Transaction {
  id: string;
  teamId: string;
  type: 'income' | 'expense';
  amount: number;          // 金额（元）
  description: string;     // 描述
  category: string;        // 分类（如 "场地费", "裁判费", "手续费"）
  relatedMatchId?: string; // 关联的比赛 ID
  operator: string;        // 操作人 ID
  date: string;            // 交易日期
  createdAt: string;
}
```

### 2.8 聊天会话 (Chat Session)

```typescript
interface ChatSession {
  id: string;
  participants: string[];  // 参与者 ID（包括自己）
  name: string;            // 会话名称（通常是对方昵称）
  avatar: string;          // 头像
  lastMessage: string;     // 最后一条消息
  lastTime: string;        // 最后消息时间
  unreadCount: number;     // 未读数
  isAi?: boolean;          // 是否为 AI 助手
  createdAt: string;
  updatedAt: string;
}
```

### 2.9 聊天消息 (Chat Message)

```typescript
interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  text: string;            // 消息内容
  timestamp: number;       // Unix 时间戳
  type: 'text' | 'card';   // 消息类型

  cardData?: {             // 卡片数据（type=card 时）
    type: 'team' | 'match';  // 卡片类型
    data: any;               // 卡片具体数据
  };

  isRead: boolean;
  createdAt: string;
}
```

### 2.10 VIP 订阅 (VIP Subscription)

```typescript
interface VipSubscription {
  id: string;
  userId: string;
  planId: string;
  planName: string;        // 如 "month_trial", "season", "year"
  price: number;           // 订阅价格（元）

  status: 'active' | 'expired' | 'cancelled';
  startDate: string;
  endDate: string;         // 过期日期

  autoRenew: boolean;      // 是否自动续费
  paymentMethod: 'apple_pay' | 'wechat_pay';

  createdAt: string;
  updatedAt: string;
}
```

---

## 三、模块 API 详细说明

### 3.1 认证模块

#### 3.1.1 微信登录

**请求**

```
POST /auth/wechat/login
```

**描述**: 使用微信授权码进行登录，返回 JWT token。

**请求头**

| 请求头 | 值 | 必需 |
|--------|-----|------|
| `Content-Type` | `application/json` | 是 |

**请求体**

```json
{
  "code": "081xxxxxxxxxxxx",  // 微信授权码
  "encryptedData": "base64...",  // 加密数据（可选，用于获取手机号）
  "iv": "base64..."             // 初始化向量（可选）
}
```

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 604800,  // 7 天（秒）
    "user": {
      "id": "user_123",
      "openId": "oxxxxxxxxxxxx",
      "name": "微信昵称",
      "avatar": "https://...",
      "role": "PLAYER",
      "currentTeamId": null
    }
  }
}
```

**错误码**

| 错误码 | 说明 |
|--------|------|
| 4000 | 授权码无效或过期 |
| 1001 | 微信服务异常 |

**权限**: 无需认证

---

#### 3.1.2 手机号登录

**请求**

```
POST /auth/phone/login
```

**描述**: 使用手机号和验证码进行登录。

**请求体**

```json
{
  "phone": "13800138000",
  "code": "123456"  // SMS 验证码
}
```

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "登录成功",
  "data": {
    "token": "...",
    "refreshToken": "...",
    "expiresIn": 604800,
    "user": { ... }
  }
}
```

**权限**: 无需认证

---

#### 3.1.3 获取短信验证码

**请求**

```
POST /auth/phone/send-code
```

**描述**: 发送 SMS 验证码到指定手机号。

**请求体**

```json
{
  "phone": "13800138000"
}
```

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "验证码已发送",
  "data": {
    "expiresIn": 600  // 验证码有效期（秒）
  }
}
```

**权限**: 无需认证

---

#### 3.1.4 绑定手机号

**请求**

```
POST /auth/phone/bind
```

**描述**: 为当前微信账户绑定手机号。

**请求体**

```json
{
  "phone": "13800138000",
  "code": "123456"
}
```

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "绑定成功",
  "data": {
    "phone": "13800138000"
  }
}
```

**权限**: 需要登录

---

#### 3.1.5 刷新 Token

**请求**

```
POST /auth/refresh
```

**描述**: 使用 refreshToken 获取新的 JWT token。

**请求体**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "刷新成功",
  "data": {
    "token": "...",
    "expiresIn": 604800
  }
}
```

**权限**: 无需认证

---

#### 3.1.6 退出登录

**请求**

```
POST /auth/logout
```

**描述**: 登出当前用户。

**请求体**

```json
{}
```

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "已退出登录",
  "data": null
}
```

**权限**: 需要登录

---

### 3.2 用户中心模块

#### 3.2.1 获取当前用户信息

**请求**

```
GET /users/me
```

**描述**: 获取当前登录用户的详细信息。

**查询参数**: 无

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "查询成功",
  "data": {
    "id": "user_123",
    "openId": "oxxxxxxxxxxxx",
    "phone": "13800138000",
    "name": "张三",
    "avatar": "https://...",
    "gender": "male",
    "role": "FREE_CAPTAIN",
    "stats": {
      "goals": 12,
      "assists": 5,
      "mvpCount": 2,
      "appearances": 15,
      "balance": 500.50
    },
    "currentTeamId": "team_001",
    "createdAt": "2026-02-01T10:00:00Z",
    "updatedAt": "2026-03-04T14:30:00Z"
  }
}
```

**权限**: 需要登录

---

#### 3.2.2 更新用户信息

**请求**

```
PATCH /users/me
```

**描述**: 更新当前用户的信息（名字、头像、性别等）。

**请求体**

```json
{
  "name": "新昵称",
  "avatar": "https://new-avatar-url.jpg",
  "gender": "female"
}
```

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "更新成功",
  "data": {
    "id": "user_123",
    "name": "新昵称",
    "avatar": "https://new-avatar-url.jpg",
    "gender": "female",
    "updatedAt": "2026-03-04T14:35:00Z"
  }
}
```

**权限**: 需要登录

---

### 3.3 球队管理模块

#### 3.3.1 获取我的球队列表

**请求**

```
GET /teams/mine
```

**描述**: 获取当前用户作为队长创建的所有球队。

**查询参数**: 无

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "查询成功",
  "data": [
    {
      "id": "team_001",
      "name": "暴力鸭",
      "logo": "https://...",
      "gender": "male",
      "avgAge": 28,
      "creditScore": 92,
      "winRate": 65,
      "tags": ["球风干净", "传中强手"],
      "location": "朝阳区",
      "isVerified": true,
      "homeJerseyColor": "#FF0000",
      "awayJerseyColor": "#FFFFFF",
      "fundBalance": 1500.00,
      "announcement": "欢迎加入！",
      "captainId": "user_123",
      "memberCount": 12,
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-03-04T14:30:00Z"
    }
  ]
}
```

**权限**: 需要登录，角色为队长

---

#### 3.3.2 创建球队

**请求**

```
POST /teams
```

**描述**: 创建新球队。FREE_CAPTAIN 最多创建 1 支，VIP_CAPTAIN 无限制。

**请求体**

```json
{
  "name": "新球队名称",
  "gender": "male",
  "location": "朝阳区"
}
```

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "创建成功",
  "data": {
    "id": "team_new",
    "name": "新球队名称",
    "logo": "https://default-logo.png",
    "gender": "male",
    "avgAge": 0,
    "creditScore": 100,
    "winRate": 0,
    "tags": [],
    "location": "朝阳区",
    "isVerified": false,
    "fundBalance": 0,
    "captainId": "user_123",
    "memberCount": 0,
    "createdAt": "2026-03-04T14:35:00Z"
  }
}
```

**错误码**

| 错误码 | 说明 |
|--------|------|
| 4002 | FREE_CAPTAIN 已达到创建球队上限（1 支） |
| 4007 | 球队名称不能为空或过长（max 30） |

**权限**: 需要登录，角色为队长

---

#### 3.3.3 切换当前球队

**请求**

```
PUT /teams/{id}/switch
```

**描述**: 将指定球队设为当前球队。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 球队 ID |

**请求体**

```json
{}
```

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "切换成功",
  "data": {
    "currentTeamId": "team_001",
    "teamName": "暴力鸭"
  }
}
```

**权限**: 需要登录，必须是球队队长或队员

---

#### 3.3.4 更新球队信息

**请求**

```
PATCH /teams/{id}
```

**描述**: 更新球队基本信息。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 球队 ID |

**请求体**

```json
{
  "name": "更新后的球队名",
  "announcement": "新的公告",
  "logo": "https://new-logo.png",
  "homeJerseyColor": "#0000FF",
  "awayJerseyColor": "#FFFF00"
}
```

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "更新成功",
  "data": {
    "id": "team_001",
    "name": "更新后的球队名",
    "announcement": "新的公告",
    "logo": "https://new-logo.png",
    "homeJerseyColor": "#0000FF",
    "awayJerseyColor": "#FFFF00",
    "updatedAt": "2026-03-04T14:40:00Z"
  }
}
```

**权限**: 需要登录，必须是球队队长

---

#### 3.3.5 提交球队实名认证

**请求**

```
POST /teams/{id}/verification
```

**描述**: 提交球队实名认证材料，进入审核流程。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 球队 ID |

**请求体**

```json
{
  "realName": "王大雷",
  "idCard": "110101199001011234",
  "phone": "13800138000",
  "description": "北京朝阳区业余足球队，成立于2023年",
  "idFrontImageId": "file_001",
  "idBackImageId": "file_002",
  "teamPhotoImageId": "file_003"
}
```

**字段说明**

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `realName` | string | 是 | 真实姓名（身份证上的姓名） |
| `idCard` | string | 是 | 18 位身份证号 |
| `phone` | string | 是 | 联系电话 |
| `description` | string | 否 | 球队简介 |
| `idFrontImageId` | string | 是 | 身份证正面照片文件 ID（通过上传接口获取） |
| `idBackImageId` | string | 是 | 身份证反面照片文件 ID |
| `teamPhotoImageId` | string | 否 | 球队合照/Logo 文件 ID |

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "认证材料已提交",
  "data": {
    "verificationId": "verify_001",
    "status": "reviewing",
    "submittedAt": "2026-03-04T15:00:00Z",
    "estimatedDays": 3
  }
}
```

**错误码**

| 错误码 | 说明 |
|--------|------|
| 4000 | 身份证号格式不正确 |
| 4005 | 该球队已认证或正在审核中 |
| 4007 | 缺少必填的认证材料 |

**权限**: 需要登录，必须是球队队长

---

#### 3.3.6 查询球队认证状态

**请求**

```
GET /teams/{id}/verification
```

**描述**: 查询球队的实名认证审核状态。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 球队 ID |

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "查询成功",
  "data": {
    "status": "reviewing",
    "submittedAt": "2026-03-04T15:00:00Z",
    "reviewedAt": null,
    "rejectReason": null,
    "benefits": [
      "专属认证标识",
      "优先匹配特权（匹配率提升50%）",
      "赛事报名资格"
    ]
  }
}
```

**认证状态值**

| 状态 | 说明 |
|------|------|
| `none` | 未提交认证 |
| `reviewing` | 审核中（预计 1-3 个工作日） |
| `verified` | 已认证 |
| `rejected` | 审核未通过（附带 rejectReason） |

**权限**: 需要登录

---

#### 3.3.7 举报球队

**请求**

```
POST /teams/{id}/report
```

**描述**: 举报球队的不当行为（如虚假信息、恶意爽约、暴力行为等）。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 球队 ID |

**请求体**

```json
{
  "reason": "恶意爽约",
  "description": "比赛当天无故缺席，未提前通知"
}
```

**字段说明**

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `reason` | string | 是 | 举报原因，枚举值：`虚假信息` / `恶意爽约` / `比赛中暴力行为` / `虚报信用分` / `其他` |
| `description` | string | 否 | 详细描述 |

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "举报已提交，我们会尽快处理",
  "data": {
    "reportId": "report_001",
    "status": "pending",
    "createdAt": "2026-03-04T16:00:00Z"
  }
}
```

**业务规则**:
- 同一用户对同一球队 24 小时内只能举报一次
- 举报将由人工审核

**权限**: 需要登录

---

#### 3.3.8 搜索球队列表

**请求**

```
GET /teams/search
```

**描述**: 搜索和筛选球队列表。

**查询参数**

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `keyword` | string | - | 球队名称、地点关键词 |
| `location` | string | - | 地点筛选 |
| `gender` | string | - | 性别筛选（male/female） |
| `minCredit` | integer | - | 最低信用分 |
| `minWinRate` | integer | - | 最低胜率 |
| `verifiedOnly` | boolean | false | 仅显示已认证 |
| `hasTag` | string[] | - | 包含特定标签 |
| `sortBy` | string | distance | 排序：distance/credit/winRate |
| `latitude` | float | - | 当前纬度（用于距离计算） |
| `longitude` | float | - | 当前经度（用于距离计算） |
| `page` | integer | 1 | 页码 |
| `pageSize` | integer | 20 | 每页条数 |

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "搜索成功",
  "data": {
    "items": [
      {
        "id": "team_001",
        "name": "暴力鸭",
        "logo": "https://...",
        "gender": "male",
        "avgAge": 28,
        "creditScore": 92,
        "winRate": 65,
        "location": "朝阳区",
        "distance": 2.3,
        "isVerified": true,
        "tags": ["球风干净"],
        "memberCount": 12
      }
    ],
    "total": 150,
    "page": 1,
    "pageSize": 20,
    "pageCount": 8
  }
}
```

**业务规则**:
- VIP 用户：可使用 verifiedOnly、minCredit 等高级筛选
- 非 VIP 用户：只能看到信用分 >= 60 的球队
- FREE_CAPTAIN 用户：无法看到其他球队的高级信息（如信用历史）

**权限**: 需要登录

---

#### 3.3.9 获取球队详情

**请求**

```
GET /teams/{id}
```

**描述**: 获取指定球队的详细信息，包括近期战绩和信用历史（VIP 可见）。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 球队 ID |

**查询参数**: 无

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "查询成功",
  "data": {
    "id": "team_001",
    "name": "暴力鸭",
    "logo": "https://...",
    "gender": "male",
    "avgAge": 28,
    "creditScore": 92,
    "winRate": 65,
    "tags": ["球风干净", "传中强手"],
    "location": "朝阳区",
    "isVerified": true,
    "homeJerseyColor": "#FF0000",
    "awayJerseyColor": "#FFFFFF",
    "fundBalance": 1500.00,
    "announcement": "欢迎加入！",
    "captainId": "user_123",
    "memberCount": 12,
    "recentResults": [
      {
        "opponent": "飞天队",
        "myScore": 4,
        "opponentScore": 2,
        "date": "2026-02-28"
      }
    ],
    "creditHistory": [
      {
        "date": "2026-02-28",
        "change": 2,
        "reason": "完成比赛"
      }
    ],
    "createdAt": "2026-01-15T10:00:00Z",
    "updatedAt": "2026-03-04T14:30:00Z"
  }
}
```

**权限**: 需要登录

---

### 3.4 队员管理模块

#### 3.4.1 获取球队队员列表

**请求**

```
GET /teams/{id}/players
```

**描述**: 获取指定球队的所有队员。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 球队 ID |

**查询参数**

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `page` | integer | 1 | 页码 |
| `pageSize` | integer | 20 | 每页条数 |

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "查询成功",
  "data": {
    "items": [
      {
        "id": "player_001",
        "userId": "user_001",
        "name": "张三",
        "number": 7,
        "position": "ST",
        "avatar": "https://avatar.jpg",
        "height": 180,
        "weight": 75,
        "strongFoot": "right",
        "level": "业余",
        "stats": {
          "goals": 12,
          "assists": 5,
          "mvpCount": 2
        }
      }
    ],
    "total": 15,
    "page": 1,
    "pageSize": 20,
    "pageCount": 1
  }
}
```

**权限**: 需要登录

---

#### 3.4.2 邀请队员

**请求**

```
POST /teams/{id}/invite
```

**描述**: 生成邀请链接/邀请码，用于邀请其他玩家加入球队。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 球队 ID |

**请求体**

```json
{
  "type": "link"
}
```

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "邀请链接已生成",
  "data": {
    "inviteCode": "TEAM123ABC",
    "inviteLink": "https://spoton.example.com/invite/TEAM123ABC",
    "qrCode": "https://qr-code-url.png",
    "expiresIn": 2592000
  }
}
```

**权限**: 需要登录，必须是球队队长

---

#### 3.4.3 接受邀请加入球队

**请求**

```
POST /teams/join/{inviteCode}
```

**描述**: 使用邀请码加入指定球队。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `inviteCode` | string | 邀请码 |

**请求体**

```json
{}
```

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "加入球队成功",
  "data": {
    "teamId": "team_001",
    "teamName": "暴力鸭",
    "playerId": "player_new"
  }
}
```

**权限**: 需要登录

---

#### 3.4.4 移除队员

**请求**

```
DELETE /teams/{teamId}/players/{playerId}
```

**描述**: 将队员从球队中移除。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `teamId` | string | 球队 ID |
| `playerId` | string | 队员 ID |

**请求体**

```json
{}
```

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "已移除队员",
  "data": null
}
```

**权限**: 需要登录，必须是球队队长

---

#### 3.4.5 获取队员详情

**请求**

```
GET /players/{id}
```

**描述**: 获取指定队员的详细信息。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 队员 ID |

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "查询成功",
  "data": {
    "id": "player_001",
    "userId": "user_001",
    "teamId": "team_001",
    "name": "张三",
    "number": 7,
    "position": "ST",
    "avatar": "https://avatar.jpg",
    "height": 180,
    "weight": 75,
    "strongFoot": "right",
    "level": "业余",
    "phone": "13800138000",
    "stats": {
      "goals": 12,
      "assists": 5,
      "mvpCount": 2
    },
    "createdAt": "2026-01-20T10:00:00Z",
    "updatedAt": "2026-03-04T14:50:00Z"
  }
}
```

**权限**: 需要登录

---

#### 3.4.6 更新队员信息

**请求**

```
PATCH /players/{id}
```

**描述**: 更新队员的基本信息。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 队员 ID |

**请求体**

```json
{
  "number": 9,
  "position": "CM",
  "height": 182,
  "weight": 76,
  "strongFoot": "left",
  "level": "校队"
}
```

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "更新成功",
  "data": {
    "id": "player_001",
    "number": 9,
    "position": "CM",
    "height": 182,
    "weight": 76,
    "strongFoot": "left",
    "level": "校队",
    "updatedAt": "2026-03-04T14:55:00Z"
  }
}
```

**权限**: 需要登录，必须是球队队长或队员本人

---

### 3.5 约球大厅模块

#### 3.5.1 获取约球列表

**请求**

```
GET /matches
```

**描述**: 获取约球列表，支持多条件筛选和排序。

**查询参数**

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `keyword` | string | - | 搜索关键词（球队名、地点模糊匹配） |
| `format` | string | - | 赛制筛选（5人制/7人制/8人制/11人制） |
| `intensity` | string | - | 强度筛选（养生局/竞技局/激战局） |
| `gender` | string | any | 性别要求（any/male/female） |
| `location` | string | - | 地点筛选 |
| `date` | string | - | 日期范围（支持 today/tomorrow/this_week 或 ISO 日期） |
| `timeRange` | string | all | 快捷时间筛选：today/tomorrow/this_week/all |
| `maxDistance` | float | - | 最大距离 |
| `minCredit` | integer | - | 最低信用分（VIP） |
| `verifiedOnly` | boolean | false | 仅认证球队（VIP） |
| `excludeTeams` | string[] | - | 屏蔽球队（VIP） |
| `sortBy` | string | smart | 排序方式 |
| `latitude` | float | - | 当前纬度 |
| `longitude` | float | - | 当前经度 |
| `page` | integer | 1 | 页码 |
| `pageSize` | integer | 20 | 每页条数 |

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "查询成功",
  "data": {
    "items": [
      {
        "id": "match_001",
        "hostTeam": {
          "id": "team_001",
          "name": "暴力鸭",
          "logo": "https://...",
          "creditScore": 92,
          "isVerified": true,
          "memberCount": 12
        },
        "date": "2026-03-15",
        "time": "19:00",
        "duration": 90,
        "format": "11人制",
        "location": "朝阳公园",
        "distance": 2.3,
        "intensity": "竞技局",
        "genderReq": "any",
        "jerseyColor": "#FF0000",
        "costBreakdown": {
          "pitchFee": 300,
          "refereeFee": 100,
          "waterFee": 50
        },
        "totalPrice": 450,
        "amenities": ["更衣室", "停车场", "饮料"],
        "status": "open"
      }
    ],
    "total": 45,
    "page": 1,
    "pageSize": 20,
    "pageCount": 3
  }
}
```

**权限**: 需要登录

---

#### 3.5.2 发起约球

**请求**

```
POST /matches
```

**描述**: 当前球队发起一场约球。

**请求体**

```json
{
  "date": "2026-03-15",
  "time": "19:00",
  "duration": 90,
  "format": "11人制",
  "location": "朝阳公园",
  "fieldName": "5号场",
  "intensity": "竞技局",
  "genderReq": "any",
  "jerseyColor": "#FF0000",
  "costBreakdown": {
    "pitchFee": 300,
    "refereeFee": 100,
    "waterFee": 50
  },
  "amenities": ["更衣室", "停车场"],
  "vas": {
    "videoService": false,
    "insurancePlayerIds": []
  },
  "urgentTop": true,
  "memo": "欢迎新手参加"
}
```

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "约球已发布",
  "data": {
    "id": "match_new",
    "hostTeamId": "team_001",
    "status": "open",
    "totalPrice": 450,
    "deposit": 225,
    "createdAt": "2026-03-04T15:00:00Z"
  }
}
```

**权限**: 需要登录，必须是队长

---

#### 3.5.3 应战约球

**请求**

```
POST /matches/{id}/accept
```

**描述**: 使用当前球队应战指定约球。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 约球 ID |

**请求体**

```json
{}
```

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "应战成功",
  "data": {
    "matchId": "match_001",
    "guestTeamId": "team_002",
    "status": "matched",
    "deposit": 225,
    "deductedAt": "2026-03-04T15:05:00Z"
  }
}
```

**权限**: 需要登录，必须是队长

---

#### 3.5.4 取消应战

**请求**

```
POST /matches/{id}/cancel
```

**描述**: 取消对指定约球的应战。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 约球 ID |

**请求体**

```json
{}
```

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "已取消应战",
  "data": {
    "matchId": "match_001",
    "status": "open",
    "refunded": 225,
    "refundedAt": "2026-03-04T15:10:00Z"
  }
}
```

**权限**: 需要登录，必须是队长且是应战方

---

#### 3.5.5 约球时间冲突检查

**请求**

```
GET /matches/{id}/conflict-check
```

**描述**: 在应战前检查当前球队是否存在时间冲突。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 约球 ID |

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "无时间冲突",
  "data": {
    "hasConflict": false,
    "conflictingMatch": null
  }
}
```

**冲突响应**

```json
{
  "success": true,
  "code": 0,
  "message": "存在时间冲突",
  "data": {
    "hasConflict": true,
    "conflictingMatch": {
      "id": "record_003",
      "opponentName": "飞天队",
      "date": "2026-03-15",
      "time": "19:00",
      "location": "朝阳公园"
    }
  }
}
```

**业务规则**:
- 时间重叠超过 30 分钟视为冲突
- 仅检查状态为 upcoming 和 pending_report 的赛程

**权限**: 需要登录

---

#### 3.5.6 获取约球详情

**请求**

```
GET /matches/{id}
```

**描述**: 获取指定约球帖子的详细信息。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 约球 ID |

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "查询成功",
  "data": {
    "id": "match_001",
    "hostTeam": {
      "id": "team_001",
      "name": "暴力鸭",
      "logo": "https://...",
      "creditScore": 92,
      "winRate": 65,
      "isVerified": true,
      "memberCount": 12,
      "tags": ["球风干净", "传中强手"],
      "recentResults": [
        { "opponent": "飞天队", "myScore": 4, "opponentScore": 2, "date": "2026-02-28" }
      ]
    },
    "guestTeam": null,
    "date": "2026-03-15",
    "time": "19:00",
    "duration": 90,
    "format": "11人制",
    "location": "朝阳公园",
    "fieldName": "5号场",
    "distance": 2.3,
    "intensity": "竞技局",
    "genderReq": "any",
    "jerseyColor": "#FF0000",
    "costBreakdown": {
      "pitchFee": 300,
      "refereeFee": 100,
      "waterFee": 50
    },
    "totalPrice": 450,
    "amenities": ["更衣室", "停车场", "饮料"],
    "vas": {
      "videoService": true,
      "insurancePlayerIds": []
    },
    "urgentTop": false,
    "memo": "欢迎新手参加",
    "status": "open",
    "createdAt": "2026-03-04T15:00:00Z"
  }
}
```

**业务规则**:
- VIP 用户可查看 hostTeam 的完整信息（信用历史、详细战绩）
- 非 VIP 用户看到的 hostTeam 信息有部分字段被遮蔽

**权限**: 需要登录

---

### 3.6 赛程与比赛记录模块

#### 3.6.1 获取我的赛程

**请求**

```
GET /matches/schedule
```

**描述**: 获取当前球队的赛程。

**查询参数**

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `status` | string | - | 按状态筛选 |
| `page` | integer | 1 | 页码 |
| `pageSize` | integer | 20 | 每页条数 |

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "查询成功",
  "data": {
    "items": [
      {
        "id": "record_001",
        "hostTeamId": "team_001",
        "guestTeamId": "team_002",
        "opponentId": "team_002",
        "opponentName": "飞天队",
        "opponentLogo": "https://...",
        "date": "2026-03-15",
        "time": "19:00",
        "location": "朝阳公园",
        "format": "11人制",
        "duration": 90,
        "status": "upcoming",
        "totalFee": 450,
        "feePerPlayer": 30
      }
    ],
    "total": 8,
    "page": 1,
    "pageSize": 20,
    "pageCount": 1
  }
}
```

**权限**: 需要登录

---

#### 3.6.2 获取历史战绩

**请求**

```
GET /matches/history
```

**描述**: 获取当前球队已完成的比赛记录。

**查询参数**

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `page` | integer | 1 | 页码 |
| `pageSize` | integer | 20 | 每页条数 |

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "查询成功",
  "data": {
    "items": [
      {
        "id": "record_001",
        "opponentId": "team_002",
        "opponentName": "飞天队",
        "opponentLogo": "https://...",
        "date": "2026-02-28",
        "location": "朝阳公园",
        "status": "finished",
        "myScore": 4,
        "opponentScore": 2,
        "mvpPlayerId": "player_007",
        "goals": [
          { "playerId": "player_001", "count": 2 },
          { "playerId": "player_003", "count": 1 }
        ],
        "assists": [
          { "playerId": "player_005", "count": 2 }
        ],
        "totalFee": 450,
        "feePerPlayer": 30
      }
    ],
    "total": 42,
    "page": 1,
    "pageSize": 20,
    "pageCount": 3
  }
}
```

**权限**: 需要登录

---

#### 3.6.3 录入比赛数据

**请求**

```
POST /matches/{id}/report
```

**描述**: 比赛后由主队队长录入比赛数据。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 赛程记录 ID |

**请求体**

```json
{
  "myScore": 4,
  "opponentScore": 2,
  "mvpPlayerId": "player_007",
  "goals": [
    { "playerId": "player_001", "count": 2 },
    { "playerId": "player_003", "count": 1 }
  ],
  "assists": [
    { "playerId": "player_005", "count": 2 }
  ],
  "lineup": ["player_001", "player_002", "player_003"],
  "totalFee": 450
}
```

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "比赛数据已录入",
  "data": {
    "recordId": "record_001",
    "status": "waiting_confirmation",
    "feePerPlayer": 30,
    "billId": "bill_001"
  }
}
```

**权限**: 需要登录，必须是主队队长

---

#### 3.6.4 确认比赛结果

**请求**

```
POST /matches/{id}/confirm
```

**描述**: 客队队长确认比赛结果。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 赛程记录 ID |

**请求体**

```json
{}
```

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "比赛结果已确认",
  "data": {
    "recordId": "record_001",
    "status": "finished",
    "hostCreditChange": 2,
    "guestCreditChange": -2,
    "confirmedAt": "2026-03-04T21:30:00Z"
  }
}
```

**权限**: 需要登录，必须是客队队长

---

#### 3.6.5 生成战报图片

**请求**

```
GET /matches/{id}/report-image
```

**描述**: 生成比赛战报图片（仅 VIP 用户可使用高级模板）。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 赛程记录 ID |

**查询参数**

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `template` | string | classic | 模板类型 |

**响应**: 返回图片或错误

**权限**: 需要登录

---

### 3.7 财务模块

#### 3.7.1 获取账单列表

**请求**

```
GET /teams/{id}/bills
```

**描述**: 获取指定球队的账单列表。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 球队 ID |

**查询参数**

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `status` | string | - | 按状态筛选 |
| `page` | integer | 1 | 页码 |
| `pageSize` | integer | 20 | 每页条数 |

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "查询成功",
  "data": {
    "items": [
      {
        "id": "bill_001",
        "matchRecordId": "record_001",
        "title": "2026-03-04 vs 飞天队 球费",
        "date": "2026-03-04",
        "totalAmount": 450,
        "perHead": 30,
        "paidCount": 8,
        "totalCount": 15,
        "status": "collecting",
        "players": [
          {
            "playerId": "player_001",
            "status": "paid",
            "paidAt": "2026-03-04T21:30:00Z"
          }
        ]
      }
    ],
    "total": 12,
    "page": 1,
    "pageSize": 20,
    "pageCount": 1
  }
}
```

**权限**: 需要登录

---

#### 3.7.2 获取交易流水

**请求**

```
GET /teams/{id}/transactions
```

**描述**: 获取球队的收入/支出交易流水。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 球队 ID |

**查询参数**

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `type` | string | - | 按类型筛选 |
| `startDate` | string | - | 开始日期 |
| `endDate` | string | - | 结束日期 |
| `page` | integer | 1 | 页码 |
| `pageSize` | integer | 20 | 每页条数 |

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "查询成功",
  "data": {
    "items": [
      {
        "id": "txn_001",
        "type": "expense",
        "amount": 450,
        "description": "vs 飞天队 球费结算",
        "category": "场地费",
        "relatedMatchId": "record_001",
        "operator": "user_123",
        "date": "2026-03-04",
        "createdAt": "2026-03-04T21:00:00Z"
      }
    ],
    "total": 45,
    "page": 1,
    "pageSize": 20,
    "pageCount": 3
  }
}
```

**权限**: 需要登录，必须是球队队长

---

#### 3.7.3 记录收入/支出

**请求**

```
POST /teams/{id}/transactions
```

**描述**: 手动记录一笔收入或支出。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 球队 ID |

**请求体**

```json
{
  "type": "income",
  "amount": 200,
  "description": "李四补缴队费",
  "category": "补缴"
}
```

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "交易已记录",
  "data": {
    "id": "txn_new",
    "type": "income",
    "amount": 200,
    "teamBalance": 1700.00,
    "createdAt": "2026-03-04T22:00:00Z"
  }
}
```

**权限**: 需要登录，必须是球队队长

---

#### 3.7.4 催收提醒

**请求**

```
POST /bills/{id}/remind
```

**描述**: 向未付款的队员发送催收提醒。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 账单 ID |

**请求体**

```json
{}
```

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "提醒已发送",
  "data": {
    "billId": "bill_001",
    "remindersSent": 7,
    "sentAt": "2026-03-04T22:10:00Z"
  }
}
```

**权限**: 需要登录，必须是球队队长

---

#### 3.7.5 导出财务报表（VIP）

**请求**

```
GET /teams/{id}/finance/export
```

**描述**: 导出球队的年度/月度财务报表。仅 VIP 队长可用。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 球队 ID |

**查询参数**

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `period` | string | year | 报表周期：month/quarter/year |
| `year` | integer | 当前年 | 年份 |
| `month` | integer | - | 月份（period=month 时必填） |
| `format` | string | excel | 导出格式：excel/pdf |

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "报表已生成",
  "data": {
    "downloadUrl": "https://cdn.spoton.example.com/reports/team_001_2026.xlsx",
    "expiresIn": 3600,
    "summary": {
      "totalIncome": 12500.00,
      "totalExpense": 9800.00,
      "balance": 2700.00,
      "matchCount": 42,
      "averageCostPerMatch": 233.33
    }
  }
}
```

**错误码**

| 错误码 | 说明 |
|--------|------|
| 4002 | 需要 VIP 权限 |

**权限**: 需要登录，VIP 队长

---

#### 3.7.6 标记账单付款

**请求**

```
POST /bills/{billId}/players/{playerId}/pay
```

**描述**: 标记指定队员的账单为已付款。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `billId` | string | 账单 ID |
| `playerId` | string | 队员 ID |

**请求体**

```json
{}
```

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "已标记为已付款",
  "data": {
    "billId": "bill_001",
    "playerId": "player_003",
    "status": "paid",
    "paidAt": "2026-03-04T22:15:00Z",
    "paidCount": 9,
    "totalCount": 15,
    "billStatus": "collecting"
  }
}
```

**业务规则**:
- 当所有队员均已付款时，账单状态自动变为 `completed`
- 仅队长可标记其他队员的付款状态

**权限**: 需要登录，必须是球队队长

---

### 3.8 聊天模块

#### 3.8.1 获取聊天会话列表

**请求**

```
GET /chats
```

**描述**: 获取当前用户的聊天会话列表。

**查询参数**

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `page` | integer | 1 | 页码 |
| `pageSize` | integer | 20 | 每页条数 |

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "查询成功",
  "data": {
    "items": [
      {
        "id": "session_ai",
        "name": "球队智能助手",
        "avatar": "https://ai-avatar.png",
        "lastMessage": "我可以帮你推荐对手或发起约球",
        "lastTime": "2026-03-04T20:00:00Z",
        "unreadCount": 0,
        "isAi": true
      },
      {
        "id": "session_001",
        "name": "飞天队队长",
        "avatar": "https://avatar.jpg",
        "lastMessage": "下周有空吗？",
        "lastTime": "2026-03-04T14:30:00Z",
        "unreadCount": 2,
        "isAi": false
      }
    ],
    "total": 5,
    "page": 1,
    "pageSize": 20,
    "pageCount": 1
  }
}
```

**权限**: 需要登录

---

#### 3.8.2 获取聊天消息

**请求**

```
GET /chats/{sessionId}/messages
```

**描述**: 获取指定会话的聊天消息历史。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `sessionId` | string | 会话 ID |

**查询参数**

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `page` | integer | 1 | 页码 |
| `pageSize` | integer | 50 | 每页条数 |

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "查询成功",
  "data": {
    "items": [
      {
        "id": "msg_001",
        "senderId": "user_123",
        "text": "下周六有时间吗",
        "timestamp": 1709556600000,
        "type": "text",
        "isRead": true
      }
    ],
    "total": 30,
    "page": 1,
    "pageSize": 50,
    "pageCount": 1
  }
}
```

**权限**: 需要登录

---

#### 3.8.3 发送消息

**请求**

```
POST /chats/{sessionId}/messages
```

**描述**: 向会话中发送消息。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `sessionId` | string | 会话 ID |

**请求体**

```json
{
  "type": "text",
  "text": "下周六有空吗？"
}
```

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "消息已发送",
  "data": {
    "id": "msg_new",
    "sessionId": "session_001",
    "type": "text",
    "text": "下周六有空吗？",
    "timestamp": 1709560800000,
    "createdAt": "2026-03-04T23:00:00Z"
  }
}
```

**权限**: 需要登录

---

#### 3.8.4 删除聊天会话

**请求**

```
DELETE /chats/{sessionId}
```

**描述**: 删除指定聊天会话及其所有消息。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `sessionId` | string | 会话 ID |

**请求体**

```json
{}
```

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "会话已删除",
  "data": null
}
```

**业务规则**:
- AI 助手会话不可删除
- 删除后无法恢复

**权限**: 需要登录

---

#### 3.8.5 创建聊天会话

**请求**

```
POST /chats
```

**描述**: 创建新的聊天会话（例如从对手球队详情页发起聊天）。

**请求体**

```json
{
  "targetUserId": "user_456"
}
```

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "会话已创建",
  "data": {
    "id": "session_new",
    "name": "飞天队队长",
    "avatar": "https://avatar.jpg",
    "lastMessage": "",
    "lastTime": "2026-03-04T23:00:00Z",
    "unreadCount": 0,
    "isAi": false
  }
}
```

**业务规则**:
- 如果已存在与目标用户的会话，直接返回已有会话
- 每个用户自动拥有一个 AI 助手会话

**权限**: 需要登录

---

#### 3.8.6 AI 智能助手对话

**请求**

```
POST /chats/ai/messages
```

**描述**: 向 AI 智能助手发送消息，获取智能回复。AI 可根据上下文推荐球队、约球、回答足球相关问题。

**请求体**

```json
{
  "text": "帮我推荐附近的球队",
  "context": {
    "latitude": 39.9042,
    "longitude": 116.4074
  }
}
```

**字段说明**

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `text` | string | 是 | 用户消息内容 |
| `context` | object | 否 | 附加上下文（位置等） |
| `context.latitude` | float | 否 | 当前纬度 |
| `context.longitude` | float | 否 | 当前经度 |

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "回复成功",
  "data": {
    "id": "msg_ai_001",
    "senderId": "ai",
    "text": "根据你的位置，推荐以下球队：",
    "timestamp": 1709560800000,
    "type": "text",
    "suggestions": [
      {
        "type": "team",
        "data": {
          "id": "team_002",
          "name": "皇家体校队",
          "logo": "https://...",
          "creditScore": 85,
          "location": "奥体中心",
          "distance": 5.2,
          "isVerified": true
        }
      }
    ]
  }
}
```

**AI 可识别的意图**:
- `推荐球队` / `找对手` → 返回附近球队列表（卡片消息）
- `约球` / `比赛` → 返回可用约球信息（卡片消息）
- `查战绩` / `历史记录` → 返回近期比赛汇总
- 其他问题 → 通用足球助手回复

**业务规则**:
- AI 每次回复可附带 `suggestions` 数组，前端渲染为卡片消息
- 卡片类型支持 `team` 和 `match`
- AI 会话 ID 固定为用户的 `ai_agent` 会话

**权限**: 需要登录

---

### 3.9 VIP 订阅模块

#### 3.9.1 获取 VIP 方案列表

**请求**

```
GET /vip/plans
```

**描述**: 获取可用的 VIP 订阅方案。

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "查询成功",
  "data": [
    {
      "id": "plan_trial",
      "name": "month_trial",
      "displayName": "首月体验转会",
      "price": 9.9,
      "originalPrice": 19.9,
      "durationDays": 30,
      "description": "试训期，低成本体验",
      "badge": "新人特惠",
      "features": ["创建多支球队", "高级筛选", "战报模板"]
    },
    {
      "id": "plan_season",
      "name": "season",
      "displayName": "主力赛季卡",
      "price": 49,
      "originalPrice": 59.7,
      "durationDays": 90,
      "description": "完美覆盖春/秋季联赛",
      "badge": "超值推荐",
      "recommended": true,
      "features": ["创建多支球队", "高级筛选", "战报模板", "财务导出", "智能催收"]
    },
    {
      "id": "plan_year",
      "name": "year",
      "displayName": "豪门终身约",
      "price": 199,
      "originalPrice": 238.8,
      "durationDays": 365,
      "description": "一次买断全年无忧",
      "badge": "省¥40",
      "features": ["创建多支球队", "高级筛选", "战报模板", "财务导出", "智能催收", "优先技术支持"]
    }
  ]
}
```

**权限**: 无需认证

---

#### 3.9.2 订阅 VIP

**请求**

```
POST /vip/subscribe
```

**描述**: 订阅指定的 VIP 方案。

**请求体**

```json
{
  "planId": "plan_season",
  "paymentMethod": "apple_pay"
}
```

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "订阅成功",
  "data": {
    "subscriptionId": "sub_new",
    "status": "active",
    "planName": "season",
    "startDate": "2026-03-04",
    "endDate": "2026-06-02",
    "autoRenew": false
  }
}
```

**权限**: 需要登录

---

#### 3.9.3 获取 VIP 状态

**请求**

```
GET /vip/status
```

**描述**: 获取当前用户的 VIP 订阅状态。

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "查询成功",
  "data": {
    "isVip": true,
    "subscriptionId": "sub_001",
    "planName": "season",
    "startDate": "2026-03-01",
    "endDate": "2026-05-30",
    "daysRemaining": 87,
    "autoRenew": true,
    "status": "active"
  }
}
```

**权限**: 需要登录

---

#### 3.9.4 恢复购买

**请求**

```
POST /vip/restore
```

**描述**: 恢复之前的 VIP 购买记录（用于换设备等场景）。

**请求体**

```json
{}
```

**响应（找到购买记录）**

```json
{
  "success": true,
  "code": 0,
  "message": "购买已恢复",
  "data": {
    "restored": true,
    "subscriptionId": "sub_001",
    "planName": "season",
    "status": "active",
    "endDate": "2026-06-02",
    "daysRemaining": 90
  }
}
```

**响应（未找到购买记录）**

```json
{
  "success": true,
  "code": 0,
  "message": "未找到可恢复的购买记录",
  "data": {
    "restored": false
  }
}
```

**权限**: 需要登录

---

### 3.10 通知设置模块

#### 3.10.1 获取通知设置

**请求**

```
GET /users/me/notifications
```

**描述**: 获取当前用户的通知偏好设置。

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "查询成功",
  "data": {
    "matchReminder": true,
    "billReminder": true,
    "chatNotification": true,
    "marketingPush": false
  }
}
```

**权限**: 需要登录

---

#### 3.10.2 更新通知设置

**请求**

```
PATCH /users/me/notifications
```

**描述**: 更新通知偏好设置（部分更新）。

**请求体**

```json
{
  "matchReminder": true,
  "billReminder": false,
  "chatNotification": true,
  "marketingPush": false
}
```

**字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| `matchReminder` | boolean | 比赛提醒（赛前通知） |
| `billReminder` | boolean | 账单付款提醒 |
| `chatNotification` | boolean | 新消息通知 |
| `marketingPush` | boolean | 营销推送 |

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "设置已更新",
  "data": {
    "matchReminder": true,
    "billReminder": false,
    "chatNotification": true,
    "marketingPush": false,
    "updatedAt": "2026-03-04T23:00:00Z"
  }
}
```

**权限**: 需要登录

---

### 3.11 文件上传模块

#### 3.11.1 上传文件

**请求**

```
POST /upload
```

**描述**: 上传图片文件（用于头像、球队 Logo、认证材料等场景）。

**请求头**

| 请求头 | 值 | 必需 |
|--------|-----|------|
| `Content-Type` | `multipart/form-data` | 是 |

**表单字段**

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `file` | file | 是 | 图片文件 |
| `type` | string | 是 | 用途类型：`avatar` / `team_logo` / `id_front` / `id_back` / `team_photo` |

**响应**

```json
{
  "success": true,
  "code": 0,
  "message": "上传成功",
  "data": {
    "fileId": "file_001",
    "url": "https://cdn.spoton.example.com/uploads/file_001.jpg",
    "type": "avatar",
    "size": 102400,
    "createdAt": "2026-03-04T23:10:00Z"
  }
}
```

**业务规则**:
- 支持格式：JPG、PNG、WebP
- 文件大小限制：头像/Logo ≤ 5MB，认证材料 ≤ 10MB
- 上传后返回 `fileId`，在其他接口中通过此 ID 引用文件
- 文件自动进行压缩和 CDN 分发

**错误码**

| 错误码 | 说明 |
|--------|------|
| 4000 | 不支持的文件格式 |
| 4007 | 文件大小超出限制 |

**权限**: 需要登录

---

## 四、常见场景 API 调用流程

### 4.1 完整的"发起约球"流程

```
1. 用户打开"我的赛程"
   GET /matches/schedule (查看已有赛程)

2. 用户填写约球信息并发起
   POST /matches (发起约球)
   - 后台自动扣除订金 50%
   - 状态转为 "open"

3. 其他球队看到约球
   GET /matches (筛选查询，支持 keyword/format/intensity/timeRange 等参数)
   GET /matches/{id}/conflict-check (检查时间冲突)

4. 其他球队应战
   POST /matches/{id}/accept
   - 扣除应战方订金
   - 状态转为 "matched"

5. 比赛完成后，主队录入数据
   POST /matches/{id}/report
   - 自动生成账单
   - 状态转为 "waiting_confirmation"

6. 客队确认
   POST /matches/{id}/confirm
   - 状态转为 "finished"
   - 双方信用分变更
   - 结算全额球费
```

### 4.2 完整的"账单管理"流程

```
1. 查询待收账单
   GET /teams/{id}/bills?status=collecting

2. 队长提醒未付款队员
   POST /bills/{id}/remind

3. 队员付款后标记
   POST /bills/{billId}/players/{playerId}/pay

4. 导出财务报表（VIP）
   GET /teams/{id}/finance/export
```

### 4.3 球队认证流程

```
1. 上传认证材料
   POST /upload (type=id_front)
   POST /upload (type=id_back)
   POST /upload (type=team_photo)

2. 提交认证申请
   POST /teams/{id}/verification

3. 轮询认证状态（或等待推送通知）
   GET /teams/{id}/verification

4. 认证通过后，球队获得认证标识
```

### 4.4 联系对手球队流程

```
1. 浏览球队列表
   GET /teams/search

2. 查看球队详情
   GET /teams/{id}

3. 发起聊天
   POST /chats (targetUserId = 对方队长 ID)

4. 发送消息
   POST /chats/{sessionId}/messages

5. 或直接发起约战
   POST /matches (通过发起约球页面)
```

### 4.5 AI 助手使用流程

```
1. 进入 AI 助手会话（自动创建）
   GET /chats (找到 isAi=true 的会话)

2. 发送消息
   POST /chats/ai/messages

3. AI 返回文本或卡片建议
   - 卡片类型 team → 点击跳转到球队详情
   - 卡片类型 match → 点击跳转到约球详情
```

---

## 五、版本更新与弃用计划

| 版本 | 发布时间 | 重要变更 | 状态 |
|------|---------|---------|------|
| v1.0 | 2026-03 | 初始版本 | 弃用 |
| v1.1 | 2026-03 | 新增冲突检查、财务导出、聊天管理接口；MatchRecord 状态流转完善；约球筛选参数扩展 | 弃用 |
| v1.2 | 2026-03 | 新增球队认证详情、举报球队、约球详情、账单付款、AI 助手对话、VIP 恢复购买、通知设置、文件上传模块；User 模型新增 appearances；MatchRequest 新增 fieldName/memo；MatchRecord 新增对手展示字段；VIP 套餐对齐产品定价；新增认证/聊天/AI 场景流程 | 现行 |

---

## 六、支持和反馈

- **技术支持**: api-support@spoton.example.com
- **Bug 反馈**: github.com/spotOn/api/issues
- **文档更新**: 最后更新 2026-03-04
