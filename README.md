# Spot On 约球平台

业余足球约球与球队管理平台，面向中国市场的队长和球员，支持 7v7、8v8 等业余比赛的组织与管理。

## 功能特性

- **约球大厅** — 发布/搜索约球请求，按技术水平、信用分、距离筛选对手
- **球队管理** — 创建球队、邀请入队、球员管理、考勤追踪
- **赛事记录** — 赛后报告、球员数据（进球/助攻）、MVP 投票
- **信用体系** — 信用积分、押金机制、防止放鸽子
- **财务管理** — 自动 AA 分账、付款提醒、收支流水
- **队长聊天** — 赛前沟通、约球协商
- **VIP 会员** — 免费队长 / VIP 队长分级权益

## 技术架构

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  WeChat Mini-App │────▶│  FastAPI Backend  │────▶│   PostgreSQL     │
│  (WXML/TS/WXSS) │     │  (Python 3.10+)  │     │   (v15+)         │
└──────────────────┘     └────────┬─────────┘     └──────────────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │     Redis        │
                         │   (缓存层)       │
                         └──────────────────┘
```

### 后端 (`api/`)

| 技术 | 版本 | 用途 |
|------|------|------|
| FastAPI | 0.115+ | Web 框架 |
| SQLModel | 0.0.19+ | ORM / 数据模型 |
| Pydantic V2 | 2.7+ | 数据校验 |
| PostgreSQL | 15+ | 关系型数据库 |
| asyncpg | 0.29+ | 异步数据库驱动 |
| Redis | 5.0+ | 缓存（redis-py async） |
| python-jose | 3.3+ | JWT 认证（HS256） |
| httpx | 0.25+ | HTTP 客户端（微信 API 调用） |

### 前端 (`wx/`)

| 技术 | 用途 |
|------|------|
| 微信小程序原生框架 | WXML / WXSS / TypeScript |
| Vant Weapp | UI 组件库 |
| TypeScript | 严格类型，外部 tsc 编译 |

## 项目结构

```
spot_on/
├── api/                          # 后端 API 服务
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── endpoints/        # 9 个端点模块（共 47 个 API）
│   │   │   │   ├── auth.py       #   认证（微信/手机登录、Token 刷新）
│   │   │   │   ├── users.py      #   用户资料
│   │   │   │   ├── teams.py      #   球队管理
│   │   │   │   ├── players.py    #   球员管理
│   │   │   │   ├── matches.py    #   约球/赛事
│   │   │   │   ├── bills.py      #   账单
│   │   │   │   ├── transactions.py #  收支流水
│   │   │   │   ├── chats.py      #   聊天
│   │   │   │   └── vip.py        #   VIP 会员
│   │   │   └── router.py         # 路由聚合
│   │   ├── core/                 # 基础设施
│   │   │   ├── config.py         #   应用配置（环境变量）
│   │   │   ├── db.py             #   数据库连接
│   │   │   ├── redis.py          #   Redis 连接管理
│   │   │   ├── security.py       #   JWT 创建/验证
│   │   │   ├── deps.py           #   依赖注入（认证/授权）
│   │   │   ├── response.py       #   统一响应格式
│   │   │   ├── middleware.py      #   PATCH 方法重写中间件
│   │   │   └── serializers.py    #   camelCase 序列化
│   │   ├── models/               # 18 个数据库模型
│   │   │   ├── user.py           #   User, RefreshToken, SmsCode
│   │   │   ├── team.py           #   Team, CreditHistory, TeamVerification...
│   │   │   ├── player.py         #   Player
│   │   │   ├── match.py          #   MatchRequest, MatchRecord
│   │   │   ├── bill.py           #   Bill, BillPlayer
│   │   │   ├── transaction.py    #   Transaction
│   │   │   ├── chat.py           #   ChatSession, ChatMessage
│   │   │   └── vip.py            #   VipPlan, VipSubscription
│   │   └── services/             # 业务逻辑服务
│   │       ├── wechat.py         #   微信 code2session
│   │       ├── sms.py            #   短信验证码
│   │       ├── credit.py         #   信用分计算
│   │       └── conflict.py       #   比赛时间冲突检测
│   ├── tests/                    # 单元测试
│   ├── .env                      # 环境变量配置
│   └── requirements.txt          # Python 依赖
├── wx/                           # 微信小程序前端
│   ├── src/                      #   TypeScript 源码
│   └── miniprogram/              #   编译后的 JS 输出
├── prototype/                    # 高保真原型（React，仅供参考）
├── docs/                         # 产品文档（中文）
│   ├── PRD.md                    #   产品需求文档 v3.2
│   ├── API_SPEC.md               #   接口规范 v1.2
│   ├── API_QUICK_REFERENCE.md    #   接口速查表
│   ├── BACKEND_REQ.md            #   后端需求文档
│   ├── TECH_SPEC_Backend.md      #   后端技术规范
│   ├── TECH_SPEC_Frontend.md     #   前端技术规范
│   └── 用户调研.md                #   用户调研访谈
└── CLAUDE.md                     # Claude Code 开发指引
```

## API 概览

共 **47 个 API 端点**，统一前缀 `/api/v1`：

| 模块 | 端点数 | 路径前缀 | 说明 |
|------|--------|----------|------|
| Auth | 6 | `/auth` | 微信登录、手机登录、短信验证、Token 刷新、登出 |
| Users | 2 | `/users` | 用户资料查询与更新 |
| Teams | 13 | `/teams` | 球队 CRUD、搜索、认证、邀请、举报、球员管理 |
| Players | 2 | `/players` | 球员资料查询与更新 |
| Matches | 10 | `/matches` | 约球大厅、创建/接受/取消、赛后报告、确认 |
| Bills | 3 | `/bills` | 账单列表、付款提醒、标记已付 |
| Transactions | 3 | `/teams` | 收支流水、财务导出 |
| Chats | 4 | `/chats` | 聊天会话、消息收发、删除 |
| VIP | 3 | `/vip` | 会员套餐、订阅、状态查询 |

**统一响应格式：**

```json
{
  "success": true,
  "code": 0,
  "message": "操作成功",
  "data": { ... },
  "timestamp": "2026-03-04T12:00:00+00:00"
}
```

## 快速开始

### 环境要求

- Python 3.10+
- PostgreSQL 15+
- Redis 5.0+
- Node.js 18+（前端构建）
- 微信开发者工具（前端调试）

### 后端启动

```bash
cd api

# 创建虚拟环境并安装依赖
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# 配置环境变量（编辑 .env 文件）
cp .env.example .env  # 按需修改数据库、Redis、微信配置

# 启动开发服务器
.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

启动后访问 http://localhost:8000/docs 查看 Swagger API 文档。

### 前端构建

```bash
cd wx

# 安装依赖
npm install

# 编译 TypeScript
npm run build

# 用微信开发者工具打开 wx/ 目录进行调试
```

### 运行测试

```bash
cd api
.venv/bin/pytest tests/ -v
```

## 核心业务规则

### 角色体系

| 角色 | 球队上限 | 队员上限 | 特殊权限 |
|------|----------|----------|----------|
| PLAYER | — | — | 基础功能 |
| FREE_CAPTAIN | 1 | 30 | 创建球队、发布约球 |
| VIP_CAPTAIN | 3 | 100 | 高级筛选、数据导出、模板、紧急置顶 |

### 信用积分

- 初始 100 分
- 完赛 +2，连续 3 场 +5，连续 5 场 +10
- 24h 内取消 -10，12h 内取消 -20，未到场 -50
- 非 VIP 用户仅能搜索信用分 ≥ 60 的球队

### 押金机制

- 客队接受约球时冻结比赛费用的 50% 作为押金
- 取消约球时退还押金
- 确认赛后报告后押金转为正常费用

## License

Private — All rights reserved.
