# 约球平台后端接口需求文档

> **文档版本：** v1.0
> **更新日期：** 2026-03-04
> **技术栈：** FastAPI v0.110+ / SQLModel v0.0.19+ / Pydantic V2 / PostgreSQL 15+ / asyncpg
> **数据库连接：** `postgresql+asyncpg://postgres:pfH5fYK4PmWKEHqm@14.103.197.4:6432/spot_on`

---

## 一、项目概述

Spot On（约球）是面向中国业余足球圈的球队管理与约战平台，采用 Freemium 商业模式（免费基础版 + VIP 订阅制）。本文档定义后端 API 服务的完整实现规范，包括数据库设计、接口详情、业务规则、认证授权体系。

### 1.1 后端项目结构

```
api/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI 应用入口
│   ├── core/
│   │   ├── config.py              # 配置管理（环境变量）
│   │   ├── database.py            # 数据库连接与 Session
│   │   ├── security.py            # JWT 签发/验证、密码哈希
│   │   └── deps.py                # 通用依赖注入（get_current_user 等）
│   ├── models/
│   │   ├── user.py                # User 表 + Schema
│   │   ├── team.py                # Team 表 + Schema
│   │   ├── player.py              # Player 表 + Schema
│   │   ├── match.py               # MatchRequest + MatchRecord 表
│   │   ├── bill.py                # Bill + BillPlayer 表
│   │   ├── transaction.py         # Transaction 表
│   │   ├── chat.py                # ChatSession + ChatMessage 表
│   │   ├── vip.py                 # VipSubscription + VipPlan 表
│   │   ├── verification.py        # TeamVerification 表
│   │   ├── report.py              # TeamReport（举报）表
│   │   ├── invite.py              # TeamInvite 表
│   │   └── credit_history.py      # CreditHistory 表
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py          # 汇总所有路由
│   │       └── endpoints/
│   │           ├── auth.py        # 认证相关
│   │           ├── users.py       # 用户中心
│   │           ├── teams.py       # 球队管理
│   │           ├── players.py     # 队员管理
│   │           ├── matches.py     # 约球大厅 + 赛程
│   │           ├── bills.py       # 账单管理
│   │           ├── transactions.py# 交易流水
│   │           ├── chats.py       # 聊天模块
│   │           └── vip.py         # VIP 订阅
│   └── services/
│       ├── wechat.py              # 微信 API 调用（code2session）
│       ├── sms.py                 # 短信发送服务
│       ├── credit.py              # 信用分计算服务
│       ├── conflict.py            # 时间冲突检查服务
│       ├── notification.py        # 消息推送服务
│       └── finance.py             # 财务报表生成服务
├── alembic/                       # 数据库迁移
│   ├── versions/
│   └── env.py
├── alembic.ini
├── requirements.txt
└── .env
```

### 1.2 核心配置

```python
# app/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # 数据库
    DATABASE_URL: str = "postgresql+asyncpg://postgres:pfH5fYK4PmWKEHqm@14.103.197.4:6432/spot_on"

    # JWT
    JWT_SECRET_KEY: str = "your-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_DAYS: int = 7
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # 微信小程序
    WX_APP_ID: str = ""
    WX_APP_SECRET: str = ""

    # 短信服务
    SMS_ACCESS_KEY: str = ""
    SMS_SECRET_KEY: str = ""

    # 对象存储（头像/Logo 等文件上传）
    OSS_ENDPOINT: str = ""
    OSS_BUCKET: str = ""

    model_config = {"env_file": ".env"}

settings = Settings()
```

### 1.3 数据库连接

```python
# app/core/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_size=20, max_overflow=10)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
```

---

## 二、统一约定

### 2.1 API 基础路径

```
/api/v1
```

### 2.2 统一响应格式

所有接口返回统一 JSON 包装：

```python
# app/models/common.py
from sqlmodel import SQLModel
from datetime import datetime

class ApiResponse(SQLModel):
    success: bool = True
    code: int = 0
    message: str = "操作成功"
    data: dict | list | None = None
    timestamp: datetime = datetime.utcnow()

class PaginatedData(SQLModel):
    items: list
    total: int
    page: int
    pageSize: int
    pageCount: int
```

**成功响应**（HTTP 200/201）：

```json
{ "success": true, "code": 0, "message": "操作成功", "data": { ... }, "timestamp": "..." }
```

**分页响应**：

```json
{ "success": true, "code": 0, "message": "查询成功", "data": { "items": [...], "total": 100, "page": 1, "pageSize": 20, "pageCount": 5 }, "timestamp": "..." }
```

**错误响应**（HTTP 4xx/5xx）：

```json
{ "success": false, "code": 4001, "message": "用户未认证", "data": null, "timestamp": "...", "errors": [{ "field": "...", "message": "..." }] }
```

### 2.3 错误码定义

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

### 2.4 通用请求头

| 请求头 | 值 | 必需 | 说明 |
|--------|-----|------|------|
| `Content-Type` | `application/json` | 是 | JSON 请求体 |
| `Authorization` | `Bearer <jwt_token>` | 否* | JWT 令牌 |
| `X-HTTP-Method-Override` | `PATCH` | 否 | 微信小程序不支持 PATCH，通过 POST + 此头实现 |
| `X-Client-Version` | `2.1.0` | 否 | 客户端版本号 |
| `X-Device-Id` | UUID | 否 | 设备唯一标识 |

> **重要**：后端需实现中间件识别 `X-HTTP-Method-Override` 请求头，当收到 `POST` 请求且该头值为 `PATCH` 时，将请求方法转换为 `PATCH` 处理。

### 2.5 PATCH 方法覆盖中间件

```python
# app/core/middleware.py
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

class MethodOverrideMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "POST":
            override = request.headers.get("X-HTTP-Method-Override")
            if override and override.upper() == "PATCH":
                request.scope["method"] = "PATCH"
        return await call_next(request)
```

### 2.6 分页参数

| 参数 | 类型 | 默认值 | 范围 | 说明 |
|------|------|--------|------|------|
| `page` | integer | 1 | >= 1 | 页码 |
| `pageSize` | integer | 20 | 1-100 | 每页条数 |
| `sortBy` | string | - | - | 排序字段 |
| `order` | string | asc | asc/desc | 排序顺序 |

---

## 三、数据库设计（PostgreSQL）

### 3.1 ER 关系概览

```
User 1──N Player
User 1──N Team (captainId)
Team 1──N Player
Team 1──N MatchRequest (hostTeamId)
Team 1──N MatchRequest (guestTeamId)
Team 1──N Bill
Team 1──N Transaction
Team 1──N CreditHistory
Team 1──1 TeamVerification
User 1──N VipSubscription
User 1──N ChatSession (through participant)
ChatSession 1──N ChatMessage
MatchRequest 1──1 MatchRecord
MatchRecord 1──1 Bill
Bill 1──N BillPlayer
Team 1──N TeamInvite
Team 1──N TeamReport
```

### 3.2 数据表定义

#### 3.2.1 users — 用户表

```sql
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    open_id       VARCHAR(128) UNIQUE NOT NULL,       -- 微信 OpenID
    union_id      VARCHAR(128),                        -- 微信 UnionID
    phone         VARCHAR(20) UNIQUE,                  -- 绑定手机号
    name          VARCHAR(50) NOT NULL DEFAULT '新用户',
    avatar        TEXT NOT NULL DEFAULT '',             -- 头像 URL
    gender        VARCHAR(10) NOT NULL DEFAULT 'unknown', -- male / female / unknown
    role          VARCHAR(20) NOT NULL DEFAULT 'PLAYER',  -- PLAYER / FREE_CAPTAIN / VIP_CAPTAIN
    goals         INTEGER NOT NULL DEFAULT 0,
    assists       INTEGER NOT NULL DEFAULT 0,
    mvp_count     INTEGER NOT NULL DEFAULT 0,
    appearances   INTEGER NOT NULL DEFAULT 0,
    balance       NUMERIC(12, 2) NOT NULL DEFAULT 0.00,  -- 账户余额
    current_team_id UUID,                                 -- 当前球队 FK (允许 NULL)
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_open_id ON users(open_id);
CREATE INDEX idx_users_phone ON users(phone);
```

**SQLModel 模型**：

```python
# app/models/user.py
import uuid
from datetime import datetime
from decimal import Decimal
from sqlmodel import SQLModel, Field
from pydantic import ConfigDict

class User(SQLModel, table=True):
    __tablename__ = "users"
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    open_id: str = Field(max_length=128, unique=True, index=True)
    union_id: str | None = Field(default=None, max_length=128)
    phone: str | None = Field(default=None, max_length=20, unique=True)
    name: str = Field(default="新用户", max_length=50)
    avatar: str = Field(default="")
    gender: str = Field(default="unknown")  # male / female / unknown
    role: str = Field(default="PLAYER")  # PLAYER / FREE_CAPTAIN / VIP_CAPTAIN
    goals: int = Field(default=0)
    assists: int = Field(default=0)
    mvp_count: int = Field(default=0)
    appearances: int = Field(default=0)
    balance: Decimal = Field(default=Decimal("0.00"))
    current_team_id: uuid.UUID | None = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserRead(SQLModel):
    """返回给前端的用户信息"""
    id: str
    openId: str
    unionId: str | None = None
    phone: str | None = None
    name: str
    avatar: str
    gender: str
    role: str
    stats: dict  # { goals, assists, mvpCount, appearances, balance }
    currentTeamId: str | None = None
    createdAt: str
    updatedAt: str

class UserUpdate(SQLModel):
    """更新用户请求体"""
    name: str | None = None
    avatar: str | None = None
    gender: str | None = None
```

#### 3.2.2 teams — 球队表

```sql
CREATE TABLE teams (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(30) NOT NULL,
    logo             TEXT NOT NULL DEFAULT '',
    gender           VARCHAR(10) NOT NULL DEFAULT 'male',  -- male / female
    avg_age          NUMERIC(4, 1) NOT NULL DEFAULT 0,
    credit_score     INTEGER NOT NULL DEFAULT 100,          -- 0-100
    win_rate         NUMERIC(5, 2) NOT NULL DEFAULT 0,      -- 0-100
    tags             JSONB NOT NULL DEFAULT '[]'::jsonb,     -- 标签数组
    location         VARCHAR(100) NOT NULL DEFAULT '',
    latitude         DOUBLE PRECISION,                       -- 纬度
    longitude        DOUBLE PRECISION,                       -- 经度
    is_verified      BOOLEAN NOT NULL DEFAULT FALSE,
    home_jersey_color VARCHAR(10),                           -- HEX 颜色
    away_jersey_color VARCHAR(10),
    fund_balance     NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    announcement     TEXT,
    captain_id       UUID NOT NULL REFERENCES users(id),
    member_count     INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teams_captain ON teams(captain_id);
CREATE INDEX idx_teams_location ON teams USING gist (
    ll_to_earth(latitude, longitude)
);  -- 需要 earthdistance + cube 扩展
```

#### 3.2.3 players — 队员表

```sql
CREATE TABLE players (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id),
    name        VARCHAR(50) NOT NULL,
    number      INTEGER NOT NULL DEFAULT 0,        -- 球衣号码
    position    VARCHAR(10) NOT NULL DEFAULT '',    -- ST / CM / CB / GK 等
    avatar      TEXT NOT NULL DEFAULT '',
    height      INTEGER,                            -- cm
    weight      INTEGER,                            -- kg
    strong_foot VARCHAR(10),                        -- right / left / both
    level       VARCHAR(20),                        -- 入门 / 业余 / 校队 / 青训 / 退役职业
    phone       VARCHAR(20),
    goals       INTEGER NOT NULL DEFAULT 0,
    assists     INTEGER NOT NULL DEFAULT 0,
    mvp_count   INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(team_id, user_id)  -- 同一用户在同一球队只能有一条记录
);

CREATE INDEX idx_players_team ON players(team_id);
CREATE INDEX idx_players_user ON players(user_id);
```

#### 3.2.4 match_requests — 约球帖表

```sql
CREATE TABLE match_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_team_id    UUID NOT NULL REFERENCES teams(id),
    guest_team_id   UUID REFERENCES teams(id),

    -- 基本信息
    date            DATE NOT NULL,
    time            TIME NOT NULL,
    duration        INTEGER NOT NULL,                     -- 分钟
    location        VARCHAR(200) NOT NULL,
    field_name      VARCHAR(50),
    format          VARCHAR(20) NOT NULL,                 -- 5人制/7人制/8人制/11人制
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,

    -- 要求
    intensity       VARCHAR(20) NOT NULL,                 -- 养生局 / 竞技局 / 激战局
    gender_req      VARCHAR(10) NOT NULL DEFAULT 'any',   -- any / male / female
    jersey_color    VARCHAR(10) NOT NULL DEFAULT '#FF0000',

    -- 费用
    pitch_fee       NUMERIC(10, 2) NOT NULL DEFAULT 0,
    referee_fee     NUMERIC(10, 2) NOT NULL DEFAULT 0,
    water_fee       NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_price     NUMERIC(10, 2) NOT NULL DEFAULT 0,

    -- 其他
    amenities       JSONB NOT NULL DEFAULT '[]'::jsonb,
    video_service   BOOLEAN NOT NULL DEFAULT FALSE,
    insurance_player_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    urgent_top      BOOLEAN NOT NULL DEFAULT FALSE,
    memo            TEXT,

    -- 状态
    status          VARCHAR(20) NOT NULL DEFAULT 'open',  -- open / matched / finished / cancelled

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_match_requests_host ON match_requests(host_team_id);
CREATE INDEX idx_match_requests_guest ON match_requests(guest_team_id);
CREATE INDEX idx_match_requests_status ON match_requests(status);
CREATE INDEX idx_match_requests_date ON match_requests(date, time);
```

#### 3.2.5 match_records — 赛程记录表

```sql
CREATE TABLE match_records (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_request_id UUID REFERENCES match_requests(id),   -- 关联约球帖
    host_team_id     UUID NOT NULL REFERENCES teams(id),
    guest_team_id    UUID NOT NULL REFERENCES teams(id),
    host_team_score  INTEGER,
    guest_team_score INTEGER,

    date             DATE NOT NULL,
    time             TIME NOT NULL,
    location         VARCHAR(200) NOT NULL,
    format           VARCHAR(20) NOT NULL,
    duration         INTEGER NOT NULL,

    -- 状态流转：upcoming → pending_report → waiting_confirmation → confirm_needed → finished
    -- 取消路径：upcoming/pending_report → cancelled
    status           VARCHAR(30) NOT NULL DEFAULT 'upcoming',

    -- 比赛报告（JSON 存储）
    report           JSONB,  -- { myScore, opponentScore, mvpPlayerId, goals[], assists[], lineup[] }

    -- 费用
    total_fee        NUMERIC(10, 2) NOT NULL DEFAULT 0,
    fee_per_player   NUMERIC(10, 2) NOT NULL DEFAULT 0,

    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_match_records_host ON match_records(host_team_id);
CREATE INDEX idx_match_records_guest ON match_records(guest_team_id);
CREATE INDEX idx_match_records_status ON match_records(status);
CREATE INDEX idx_match_records_date ON match_records(date);
```

#### 3.2.6 bills — 账单表

```sql
CREATE TABLE bills (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_record_id  UUID NOT NULL REFERENCES match_records(id),
    team_id          UUID NOT NULL REFERENCES teams(id),
    title            VARCHAR(200) NOT NULL,
    date             DATE NOT NULL,
    total_amount     NUMERIC(10, 2) NOT NULL,
    per_head         NUMERIC(10, 2) NOT NULL,
    paid_count       INTEGER NOT NULL DEFAULT 0,
    total_count      INTEGER NOT NULL DEFAULT 0,
    status           VARCHAR(20) NOT NULL DEFAULT 'collecting', -- collecting / completed
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bills_team ON bills(team_id);
CREATE INDEX idx_bills_match ON bills(match_record_id);
```

#### 3.2.7 bill_players — 账单队员明细表

```sql
CREATE TABLE bill_players (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id    UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    player_id  UUID NOT NULL REFERENCES players(id),
    status     VARCHAR(10) NOT NULL DEFAULT 'unpaid',  -- paid / unpaid
    paid_at    TIMESTAMPTZ,

    UNIQUE(bill_id, player_id)
);

CREATE INDEX idx_bill_players_bill ON bill_players(bill_id);
```

#### 3.2.8 transactions — 交易流水表

```sql
CREATE TABLE transactions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id          UUID NOT NULL REFERENCES teams(id),
    type             VARCHAR(10) NOT NULL,               -- income / expense
    amount           NUMERIC(10, 2) NOT NULL,
    description      VARCHAR(500) NOT NULL DEFAULT '',
    category         VARCHAR(50) NOT NULL DEFAULT '',    -- 场地费 / 裁判费 / 手续费 / 补缴 等
    related_match_id UUID,                                -- 关联比赛 ID
    operator         UUID NOT NULL REFERENCES users(id), -- 操作人
    date             DATE NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_team ON transactions(team_id);
CREATE INDEX idx_transactions_date ON transactions(date);
```

#### 3.2.9 chat_sessions — 聊天会话表

```sql
CREATE TABLE chat_sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participants  JSONB NOT NULL DEFAULT '[]'::jsonb,  -- 参与者 user_id 数组
    name          VARCHAR(100) NOT NULL DEFAULT '',
    avatar        TEXT NOT NULL DEFAULT '',
    last_message  TEXT NOT NULL DEFAULT '',
    last_time     TIMESTAMPTZ,
    unread_count  INTEGER NOT NULL DEFAULT 0,
    is_ai         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_participants ON chat_sessions USING gin(participants);
```

#### 3.2.10 chat_messages — 聊天消息表

```sql
CREATE TABLE chat_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender_id   UUID NOT NULL REFERENCES users(id),
    text        TEXT NOT NULL DEFAULT '',
    timestamp   BIGINT NOT NULL,                     -- Unix 时间戳（毫秒）
    type        VARCHAR(10) NOT NULL DEFAULT 'text', -- text / card
    card_data   JSONB,                                -- { type: "team"|"match", data: {...} }
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_timestamp ON chat_messages(timestamp);
```

#### 3.2.11 vip_plans — VIP 套餐表

```sql
CREATE TABLE vip_plans (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50) NOT NULL UNIQUE,  -- month_trial / month / season / year
    display_name VARCHAR(50) NOT NULL,         -- 首月体验卡 / 连续包月 / 连续包季 / 年度尊享卡
    price       NUMERIC(10, 2) NOT NULL,
    duration_days INTEGER NOT NULL,            -- 有效天数
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 初始数据
INSERT INTO vip_plans (name, display_name, price, duration_days) VALUES
    ('month_trial', '首月体验卡', 9.90, 30),
    ('month', '连续包月', 19.90, 30),
    ('season', '连续包季', 49.00, 90),
    ('year', '年度尊享卡', 199.00, 365);
```

#### 3.2.12 vip_subscriptions — VIP 订阅表

```sql
CREATE TABLE vip_subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    plan_id         UUID NOT NULL REFERENCES vip_plans(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'active',  -- active / expired / cancelled
    start_date      TIMESTAMPTZ NOT NULL,
    end_date        TIMESTAMPTZ NOT NULL,
    auto_renew      BOOLEAN NOT NULL DEFAULT TRUE,
    payment_method  VARCHAR(20) NOT NULL,                   -- apple_pay / wechat_pay
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vip_subscriptions_user ON vip_subscriptions(user_id);
CREATE INDEX idx_vip_subscriptions_status ON vip_subscriptions(status);
```

#### 3.2.13 credit_history — 信用历史表

```sql
CREATE TABLE credit_history (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id   UUID NOT NULL REFERENCES teams(id),
    change    INTEGER NOT NULL,          -- 变化值（可正可负）
    reason    VARCHAR(200) NOT NULL,     -- 变化原因
    date      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_history_team ON credit_history(team_id);
```

#### 3.2.14 team_verifications — 球队认证表

```sql
CREATE TABLE team_verifications (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id           UUID NOT NULL REFERENCES teams(id),
    real_name         VARCHAR(50) NOT NULL,
    id_card           VARCHAR(18) NOT NULL,
    phone             VARCHAR(20) NOT NULL,
    description       TEXT,
    id_front_image_id VARCHAR(200) NOT NULL,
    id_back_image_id  VARCHAR(200) NOT NULL,
    team_photo_image_id VARCHAR(200),
    status            VARCHAR(20) NOT NULL DEFAULT 'reviewing', -- none / reviewing / verified / rejected
    reject_reason     TEXT,
    submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at       TIMESTAMPTZ
);

CREATE INDEX idx_team_verifications_team ON team_verifications(team_id);
```

#### 3.2.15 team_reports — 举报记录表

```sql
CREATE TABLE team_reports (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id      UUID NOT NULL REFERENCES teams(id),   -- 被举报球队
    reporter_id  UUID NOT NULL REFERENCES users(id),   -- 举报人
    reason       VARCHAR(50) NOT NULL,                  -- 枚举：虚假信息/恶意爽约/比赛中暴力行为/虚报信用分/其他
    description  TEXT,
    status       VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending / reviewed / dismissed
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_team_reports_team ON team_reports(team_id);
CREATE INDEX idx_team_reports_reporter ON team_reports(reporter_id);
```

#### 3.2.16 team_invites — 球队邀请表

```sql
CREATE TABLE team_invites (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id     UUID NOT NULL REFERENCES teams(id),
    invite_code VARCHAR(20) NOT NULL UNIQUE,
    qr_code     TEXT,                                 -- 二维码图片 URL
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_team_invites_code ON team_invites(invite_code);
```

#### 3.2.17 refresh_tokens — 刷新令牌表

```sql
CREATE TABLE refresh_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id),
    token      VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
```

#### 3.2.18 sms_codes — 短信验证码表

```sql
CREATE TABLE sms_codes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone      VARCHAR(20) NOT NULL,
    code       VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sms_codes_phone ON sms_codes(phone);
```

### 3.3 PostgreSQL 扩展要求

```sql
-- 距离计算所需扩展
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;
-- UUID 生成
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

---

## 四、认证与授权

### 4.1 JWT 认证流程

1. 用户通过微信登录获取 `code`
2. 后端调用微信 `code2session` 接口获取 `openId` / `sessionKey`
3. 查找或创建 User 记录
4. 签发 JWT access token（7 天有效）和 refresh token（30 天有效）
5. 前端在后续请求中携带 `Authorization: Bearer <token>`

### 4.2 角色权限矩阵

| 功能 | 未登录 | PLAYER | FREE_CAPTAIN | VIP_CAPTAIN |
|------|--------|--------|--------------|-------------|
| 微信登录 | ✅ | - | - | - |
| 查看约球列表 | ❌ | ✅ | ✅ | ✅ |
| 查看约球详情 | ❌ | ✅ | ✅ | ✅（含完整对手数据） |
| 发起约球 | ❌ | ❌ | ✅ | ✅ |
| 应战约球 | ❌ | ❌ | ✅ | ✅ |
| 创建球队 | ❌ | ❌ | ✅（限1支） | ✅（无限制） |
| 管理队员 | ❌ | ❌ | ✅（限30人） | ✅（限100人） |
| 高级筛选（信用分排序） | ❌ | ❌ | ❌ | ✅ |
| 查看对手信用历史 | ❌ | ❌ | ❌ | ✅ |
| 加急置顶 | ❌ | ❌ | ❌ | ✅ |
| 财务报表导出 | ❌ | ❌ | ❌ | ✅ |
| 高级战报模板 | ❌ | ❌ | ❌ | ✅ |
| 强力催收 | ❌ | ❌ | ❌ | ✅ |

### 4.3 依赖注入

```python
# app/core/deps.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlmodel import select
from app.core.config import settings
from app.core.database import get_session
from app.models.user import User

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session = Depends(get_session)
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token 无效")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token 无效或已过期")

    result = await session.exec(select(User).where(User.id == user_id))
    user = result.first()
    if user is None:
        raise HTTPException(status_code=401, detail="用户不存在")
    return user

async def require_captain(user: User = Depends(get_current_user)) -> User:
    if user.role not in ("FREE_CAPTAIN", "VIP_CAPTAIN"):
        raise HTTPException(status_code=403, detail="需要队长权限")
    return user

async def require_vip(user: User = Depends(get_current_user)) -> User:
    if user.role != "VIP_CAPTAIN":
        raise HTTPException(status_code=403, detail="需要 VIP 权限")
    return user
```

---

## 五、接口详细定义

### 5.1 认证模块 (Auth)

#### POST `/auth/wechat/login` — 微信登录

- **权限**: 无需认证
- **请求体**:
  ```json
  {
    "code": "081xxxxxxxxxxxx",
    "encryptedData": "base64...",   // 可选
    "iv": "base64..."               // 可选
  }
  ```
- **业务逻辑**:
  1. 调用微信 `https://api.weixin.qq.com/sns/jscode2session` 获取 `openid` / `session_key`
  2. 按 `open_id` 查找用户：存在则登录，不存在则自动创建（role=PLAYER）
  3. 若提供 `encryptedData` + `iv`，解密获取手机号并绑定
  4. 签发 JWT access token + refresh token
  5. 将 refresh token 存入 `refresh_tokens` 表
- **响应**: `{ token, refreshToken, expiresIn: 604800, user: UserRead }`
- **错误码**: 4000（授权码无效）、1001（微信服务异常）

#### POST `/auth/phone/login` — 手机号登录

- **权限**: 无需认证
- **请求体**: `{ phone, code }`
- **业务逻辑**:
  1. 验证 `sms_codes` 表中的验证码是否正确且未过期
  2. 按手机号查找用户，不存在则创建
  3. 签发 JWT
- **响应**: 同微信登录

#### POST `/auth/phone/send-code` — 发送短信验证码

- **权限**: 无需认证
- **请求体**: `{ phone }`
- **业务逻辑**:
  1. 限频：同一手机号 60 秒内不可重复发送
  2. 生成 6 位随机数字验证码
  3. 存入 `sms_codes` 表（有效期 600 秒）
  4. 调用短信服务发送
- **响应**: `{ expiresIn: 600 }`
- **错误码**: 4006（发送过于频繁）

#### POST `/auth/phone/bind` — 绑定手机号

- **权限**: 需要登录
- **请求体**: `{ phone, code }`
- **业务逻辑**:
  1. 验证验证码
  2. 检查手机号是否已被其他用户绑定
  3. 更新当前用户的 `phone` 字段
- **响应**: `{ phone }`
- **错误码**: 4005（手机号已被绑定）

#### POST `/auth/refresh` — 刷新 Token

- **权限**: 无需认证
- **请求体**: `{ refreshToken }`
- **业务逻辑**:
  1. 在 `refresh_tokens` 表中查找并验证
  2. 检查是否过期
  3. 签发新的 access token
- **响应**: `{ token, expiresIn: 604800 }`

#### POST `/auth/logout` — 退出登录

- **权限**: 需要登录
- **业务逻辑**: 删除该用户在 `refresh_tokens` 表中的所有记录
- **响应**: `{ data: null }`

---

### 5.2 用户中心模块 (Users)

#### GET `/users/me` — 获取当前用户信息

- **权限**: 需要登录
- **业务逻辑**: 查询当前用户完整信息
- **响应**: 完整的 UserRead 对象
- **注意**: `stats` 字段需聚合返回：`{ goals, assists, mvpCount, appearances, balance }`

#### PATCH `/users/me` — 更新用户信息

- **权限**: 需要登录
- **请求体**: `{ name?, avatar?, gender? }` （部分更新）
- **业务逻辑**:
  1. 仅更新传入的非 null 字段
  2. 更新 `updated_at` 时间戳
- **响应**: 更新后的用户信息
- **PATCH 支持**: 前端通过 `POST + X-HTTP-Method-Override: PATCH` 发送

---

### 5.3 球队管理模块 (Teams)

#### GET `/teams/mine` — 获取我的球队列表

- **权限**: 需要登录
- **业务逻辑**: 查询 `captain_id = current_user.id` 的所有球队
- **响应**: `Team[]`

#### POST `/teams` — 创建球队

- **权限**: 需要登录
- **请求体**: `{ name, gender, location }`
- **业务逻辑**:
  1. 校验：FREE_CAPTAIN 最多 1 支球队，VIP_CAPTAIN 最多 3 支
  2. PLAYER 角色自动升级为 FREE_CAPTAIN
  3. 初始信用分 100，胜率 0
  4. 设置 `current_team_id` 为新球队
- **错误码**: 4002（已达球队上限）、4007（队名不能为空或超 30 字）

#### PUT `/teams/{id}/switch` — 切换当前球队

- **权限**: 需要登录，必须是该球队队长或队员
- **业务逻辑**: 更新 `users.current_team_id`
- **响应**: `{ currentTeamId, teamName }`

#### PATCH `/teams/{id}` — 更新球队信息

- **权限**: 需要登录，必须是球队队长
- **请求体**: `{ name?, announcement?, logo?, homeJerseyColor?, awayJerseyColor? }`
- **业务逻辑**: 部分更新

#### GET `/teams/{id}` — 获取球队详情

- **权限**: 需要登录
- **业务逻辑**:
  1. 返回完整球队信息
  2. `recentResults`: 查询该球队近 10 场已完成的 `match_records`
  3. `creditHistory`: **仅 VIP 用户可见**，非 VIP 返回空数组
  4. `tags`: 查询互评标签（需被 >= 3 个不同对手标记方可展示）
  5. 非 VIP 用户查看时，负面标签显示为 `***`

#### GET `/teams/search` — 搜索球队

- **权限**: 需要登录
- **查询参数**: keyword, location, gender, minCredit, minWinRate, verifiedOnly, hasTag, sortBy, latitude, longitude, page, pageSize
- **业务逻辑**:
  1. 支持模糊搜索（队名、地点）
  2. VIP 用户可使用 `verifiedOnly`、`minCredit` 筛选
  3. 非 VIP 用户只能看到信用分 >= 60 的球队
  4. 若提供经纬度，计算距离并可按距离排序
  5. 距离计算使用 PostgreSQL `earthdistance` 扩展
- **响应**: 分页的 TeamSearchItem 列表

#### POST `/teams/{id}/verification` — 提交球队认证

- **权限**: 队长
- **请求体**: `{ realName, idCard, phone, description?, idFrontImageId, idBackImageId, teamPhotoImageId? }`
- **业务逻辑**:
  1. 校验身份证号格式（18位）
  2. 检查是否已有审核中/已通过的认证
  3. 创建 `team_verifications` 记录
- **错误码**: 4000（身份证号格式不正确）、4005（已认证或审核中）

#### GET `/teams/{id}/verification` — 查询认证状态

- **权限**: 需要登录
- **响应**: `{ status, submittedAt, reviewedAt, rejectReason, benefits[] }`

#### POST `/teams/{id}/report` — 举报球队

- **权限**: 需要登录
- **请求体**: `{ reason, description? }`
- **业务规则**: 同一用户对同一球队 24 小时内只能举报一次
- **错误码**: 4006（重复举报）

---

### 5.4 队员管理模块 (Players)

#### GET `/teams/{id}/players` — 获取队员列表

- **权限**: 需要登录
- **响应**: 分页的 Player 列表（含 stats）

#### POST `/teams/{id}/invite` — 生成邀请链接

- **权限**: 队长
- **业务逻辑**:
  1. 生成唯一邀请码（大写字母+数字，10位）
  2. 生成对应二维码
  3. 有效期 30 天
- **响应**: `{ inviteCode, inviteLink, qrCode, expiresIn: 2592000 }`

#### POST `/teams/join/{inviteCode}` — 接受邀请加入球队

- **权限**: 需要登录
- **业务逻辑**:
  1. 验证邀请码有效性和有效期
  2. 检查球队人数上限：FREE_CAPTAIN 30 人，VIP_CAPTAIN 100 人
  3. 检查用户是否已在该球队
  4. 创建 Player 记录
  5. 更新球队 `member_count`
  6. 设置用户 `current_team_id`
- **错误码**: 4004（邀请码无效）、4007（球队已满员）、4005（已在球队中）

#### DELETE `/teams/{teamId}/players/{playerId}` — 移除队员

- **权限**: 队长
- **业务逻辑**:
  1. 删除 Player 记录
  2. 更新球队 `member_count`
  3. 若被移除者 `current_team_id` 为该球队，清空之

#### GET `/players/{id}` — 获取队员详情

- **权限**: 需要登录
- **响应**: 完整 Player 信息

#### PATCH `/players/{id}` — 更新队员信息

- **权限**: 队长或队员本人
- **请求体**: `{ name?, number?, position?, avatar?, height?, weight?, strongFoot?, level? }`

---

### 5.5 约球大厅模块 (Matches)

#### GET `/matches` — 获取约球列表

- **权限**: 需要登录
- **查询参数**: keyword, format, intensity, gender, location, date, timeRange, maxDistance, minCredit(VIP), verifiedOnly(VIP), sortBy, latitude, longitude, page, pageSize
- **业务逻辑**:
  1. 仅返回 `status = 'open'` 的约球帖
  2. 支持关键词模糊搜索（球队名、地点）
  3. 按日期范围筛选（today/tomorrow/this_week）
  4. VIP 独享筛选项：minCredit、verifiedOnly
  5. 若提供经纬度，计算距离
  6. `urgentTop = true` 的帖子优先展示（置顶）
  7. 默认排序：urgentTop 降序 → 距离升序 → 创建时间降序
- **响应**: 分页列表，每项包含 `hostTeam` 精简信息

#### POST `/matches` — 发起约球

- **权限**: 队长
- **请求体**: `CreateMatchParams`
- **业务逻辑**:
  1. `urgentTop` 仅 VIP 可设为 true
  2. 计算 `totalPrice = pitchFee + refereeFee + waterFee`
  3. 创建 `match_requests` 记录
  4. `hostTeamId` 取当前用户的 `current_team_id`
- **响应**: `{ id, hostTeamId, status: "open", totalPrice, deposit, createdAt }`

#### GET `/matches/{id}` — 获取约球详情

- **权限**: 需要登录
- **业务逻辑**:
  1. 关联查询 `hostTeam` 信息
  2. VIP 用户：返回 hostTeam 的完整数据（recentResults、creditHistory、tags 明文）
  3. 非 VIP 用户：hostTeam 隐藏 recentResults、creditHistory，负面 tags 显示为 `***`
  4. 若已有 guestTeam 也关联返回
- **响应**: 完整 MatchRequest + 关联球队信息

#### POST `/matches/{id}/accept` — 应战约球

- **权限**: 队长
- **业务逻辑**:
  1. 检查约球状态必须为 `open`
  2. 不能应战自己发起的约球
  3. 检查时间冲突（调用 conflict service）
  4. 扣除应战方 50% 订金（`totalPrice / 2`，从 `teams.fund_balance` 扣除）
  5. 创建 `match_records` 记录（status=upcoming）
  6. 更新约球帖 `status → matched`，设置 `guest_team_id`
- **错误码**: 4007（时间冲突）、4007（余额不足）、4005（已被应战）

#### POST `/matches/{id}/cancel` — 取消应战

- **权限**: 队长（应战方或发起方）
- **业务逻辑**:
  1. 检查状态允许取消（open/matched 可取消）
  2. 若已 matched：
     - 计算取消时间距比赛时间的间隔
     - 赛前 24h 以上：全额退还订金，信用分不变
     - 赛前 6h-24h：退还订金，信用分 -10
     - 赛前 6h 内：退还订金，信用分 -20
  3. 更新 `match_requests.status → open`（若应战方取消）或 `cancelled`（若发起方取消）
  4. 更新关联 `match_records.status → cancelled`
  5. 记录信用分变更到 `credit_history`
- **响应**: `{ matchId, status, refunded, refundedAt }`

#### GET `/matches/{id}/conflict-check` — 时间冲突检查

- **权限**: 需要登录
- **业务逻辑**:
  1. 获取约球帖的日期/时间/时长
  2. 查询当前球队所有 `upcoming`/`pending_report` 状态的 `match_records`
  3. 检查是否存在时间重叠 > 30 分钟的赛程
- **响应**: `{ hasConflict: boolean, conflictingMatch?: { id, opponentName, date, time, location } }`

---

### 5.6 赛程与比赛记录模块 (Schedule)

#### GET `/matches/schedule` — 获取我的赛程

- **权限**: 需要登录
- **查询参数**: status, page, pageSize
- **业务逻辑**:
  1. 查询当前球队（`host_team_id` 或 `guest_team_id` = 当前球队）的 `match_records`
  2. 关联查询对手信息（`opponentName`、`opponentLogo`、`opponentId`）
  3. 按日期降序排列
- **响应**: 分页的 MatchRecord 列表

#### GET `/matches/history` — 获取历史战绩

- **权限**: 需要登录
- **业务逻辑**: 同 schedule，但仅返回 `status = 'finished'` 的记录
- **响应**: 分页列表，含比分、进球、助攻数据

#### POST `/matches/{id}/report` — 录入比赛数据

- **权限**: 主队队长
- **请求体**:
  ```json
  {
    "myScore": 4,
    "opponentScore": 2,
    "mvpPlayerId": "player_007",
    "goals": [{ "playerId": "...", "count": 2 }],
    "assists": [{ "playerId": "...", "count": 2 }],
    "lineup": ["player_001", "player_002"],
    "totalFee": 450
  }
  ```
- **业务逻辑**:
  1. 检查赛程状态必须为 `pending_report`
  2. 存储 report 到 `match_records.report` (JSONB)
  3. 更新各队员的 goals/assists/mvp_count 统计
  4. 更新用户的全局统计
  5. 更新赛程状态 → `waiting_confirmation`
  6. 计算 `fee_per_player = totalFee / lineup.length`
  7. 自动生成 Bill 和 BillPlayer 记录
- **响应**: `{ recordId, status, feePerPlayer, billId }`

#### POST `/matches/{id}/confirm` — 确认比赛结果

- **权限**: 客队队长
- **业务逻辑**:
  1. 检查状态必须为 `waiting_confirmation` 或 `confirm_needed`
  2. 更新 `match_records.status → finished`
  3. 更新双方球队信用分（完赛 +2）
  4. 更新球队胜率
  5. 创建信用历史记录
  6. 若连续 3 场正常完赛，额外 +5
  7. 若连续 5 场完赛，额外 +10（恢复机制）
- **响应**: `{ recordId, status, hostCreditChange, guestCreditChange, confirmedAt }`

#### GET `/matches/{id}/report-image` — 生成战报图片

- **权限**: 需要登录
- **查询参数**: `template` (classic / nba / ucl / cyberpunk 等)
- **业务逻辑**:
  1. 非 `classic` 模板需要 VIP 权限
  2. 从 match_records 获取比赛数据
  3. 服务端渲染战报图片
  4. 非 VIP 用户生成的图片带平台水印
- **错误码**: 4002（需要 VIP 权限）

---

### 5.7 财务模块 (Finance)

#### GET `/teams/{id}/bills` — 获取账单列表

- **权限**: 需要登录
- **查询参数**: status, page, pageSize
- **响应**: 分页 Bill 列表（含 players 明细）

#### POST `/bills/{id}/remind` — 催收提醒

- **权限**: 队长
- **业务逻辑**:
  1. 获取账单中所有 `unpaid` 的队员
  2. FREE_CAPTAIN：发送标准订阅消息
  3. VIP_CAPTAIN：发送高优通道通知 + 短信补充
  4. 限频：每日每账单最多 1 次催收
- **响应**: `{ billId, remindersSent, sentAt }`

#### POST `/bills/{billId}/players/{playerId}/pay` — 标记付款

- **权限**: 队长
- **业务逻辑**:
  1. 更新 `bill_players.status → paid`，记录 `paid_at`
  2. 更新 `bills.paid_count`
  3. 若所有人已付 → `bills.status → completed`
- **响应**: `{ billId, playerId, status, paidAt, paidCount, totalCount, billStatus }`

#### GET `/teams/{id}/transactions` — 获取交易流水

- **权限**: 队长
- **查询参数**: type, startDate, endDate, page, pageSize
- **响应**: 分页 Transaction 列表

#### POST `/teams/{id}/transactions` — 记录收入/支出

- **权限**: 队长
- **请求体**: `{ type, amount, description, category }`
- **业务逻辑**:
  1. 创建 Transaction 记录
  2. 更新 `teams.fund_balance`（income 增加，expense 减少）
- **响应**: `{ id, type, amount, teamBalance, createdAt }`

#### GET `/teams/{id}/finance/export` — 导出财务报表

- **权限**: VIP 队长
- **查询参数**: period(month/quarter/year), year, month, format(excel/pdf)
- **业务逻辑**:
  1. 验证 VIP 权限
  2. 查询指定时段的所有交易
  3. 生成报表文件（Excel/PDF）
  4. 上传到 OSS，返回下载链接（1 小时有效）
- **响应**: `{ downloadUrl, expiresIn, summary: { totalIncome, totalExpense, balance, matchCount, averageCostPerMatch } }`

---

### 5.8 聊天模块 (Chats)

#### GET `/chats` — 获取会话列表

- **权限**: 需要登录
- **业务逻辑**:
  1. 查询 `participants` 包含当前用户 ID 的所有 chat_sessions
  2. 按 `last_time` 降序排列
  3. 新用户自动创建 AI 助手会话
- **响应**: 分页 ChatSession 列表

#### GET `/chats/{sessionId}/messages` — 获取聊天消息

- **权限**: 需要登录，必须是会话参与者
- **查询参数**: page, pageSize(默认 50)
- **业务逻辑**: 查询消息并标记为已读
- **响应**: 分页 ChatMessage 列表

#### POST `/chats/{sessionId}/messages` — 发送消息

- **权限**: 需要登录，必须是会话参与者
- **请求体**: `{ type: "text"|"card", text, cardData? }`
- **业务逻辑**:
  1. 创建 ChatMessage 记录
  2. 更新 ChatSession 的 `last_message`、`last_time`
  3. 对方 `unread_count + 1`
  4. 若 `isAi` 会话，调用 AI 服务生成回复
- **响应**: 创建的 ChatMessage

#### DELETE `/chats/{sessionId}` — 删除会话

- **权限**: 需要登录，必须是会话参与者
- **业务逻辑**: 软删除或真删除会话及其消息

---

### 5.9 VIP 模块

#### GET `/vip/plans` — 获取套餐列表

- **权限**: 需要登录
- **响应**: 所有 `is_active = true` 的 VipPlan 列表

#### POST `/vip/subscribe` — 创建订阅

- **权限**: 需要登录
- **请求体**: `{ planId, paymentMethod }`
- **业务逻辑**:
  1. 验证套餐存在且激活
  2. 若为 `month_trial`，检查是否首次订阅
  3. 创建 VipSubscription 记录
  4. 更新 `users.role → VIP_CAPTAIN`
  5. 对接支付回调确认
- **响应**: `{ subscriptionId, planName, startDate, endDate }`

#### GET `/vip/status` — 查询订阅状态

- **权限**: 需要登录
- **响应**: 当前激活的订阅信息，或 null

---

## 六、核心业务规则

### 6.1 信用分规则

| 行为 | 分值变动 | 触发条件 |
|------|----------|----------|
| 初始分 | 100 | 创建球队 |
| 正常完赛 | +2 | 双方赛后确认 |
| 连续履约奖励 | +5 | 连续 3 场正常完赛 |
| 恢复机制 | +10 | 连续 5 场正常完赛 |
| 提前取消 | 0 | 赛前 24h 以上 |
| 临期取消 | -10 | 赛前 6h-24h |
| 紧急取消 | -20 | 赛前 6h 内 |
| 爽约 | -50 | 对手到场，己方未到 |

**信用分范围**: 0-100，不可低于 0
**红名机制**: 信用分 < 70 时，VIP 可屏蔽该球队

### 6.2 信用分服务实现

```python
# app/services/credit.py
from datetime import datetime, timedelta
from sqlmodel import select, func

async def update_credit_for_completion(session, team_id: str):
    """完赛后更新信用分"""
    team = await session.get(Team, team_id)
    change = 2  # 基础完赛奖励

    # 检查连续完赛场次
    recent_records = await session.exec(
        select(MatchRecord)
        .where(
            ((MatchRecord.host_team_id == team_id) | (MatchRecord.guest_team_id == team_id)),
            MatchRecord.status == "finished"
        )
        .order_by(MatchRecord.date.desc())
        .limit(5)
    )
    consecutive = len(recent_records.all())

    if consecutive >= 5:
        change += 10  # 恢复机制
    elif consecutive >= 3:
        change += 5   # 连续履约

    team.credit_score = min(100, team.credit_score + change)
    await record_credit_change(session, team_id, change, "完成比赛")

async def update_credit_for_cancellation(session, team_id: str, match_datetime: datetime):
    """取消时更新信用分"""
    hours_before = (match_datetime - datetime.utcnow()).total_seconds() / 3600

    if hours_before >= 24:
        return 0  # 无惩罚
    elif hours_before >= 6:
        change = -10
        reason = "临期取消（赛前6-24h）"
    else:
        change = -20
        reason = "紧急取消（赛前6h内）"

    team = await session.get(Team, team_id)
    team.credit_score = max(0, team.credit_score + change)
    await record_credit_change(session, team_id, change, reason)
    return change
```

### 6.3 时间冲突检查服务

```python
# app/services/conflict.py
from datetime import datetime, timedelta

async def check_time_conflict(session, team_id: str, match_date: str, match_time: str, duration: int):
    """检查球队是否有时间冲突的赛程"""
    new_start = datetime.combine(
        datetime.strptime(match_date, "%Y-%m-%d").date(),
        datetime.strptime(match_time, "%H:%M").time()
    )
    new_end = new_start + timedelta(minutes=duration)

    # 查询该球队所有进行中的赛程
    records = await session.exec(
        select(MatchRecord).where(
            ((MatchRecord.host_team_id == team_id) | (MatchRecord.guest_team_id == team_id)),
            MatchRecord.status.in_(["upcoming", "pending_report"])
        )
    )

    for record in records.all():
        existing_start = datetime.combine(record.date, record.time)
        existing_end = existing_start + timedelta(minutes=record.duration)

        # 计算重叠时间
        overlap_start = max(new_start, existing_start)
        overlap_end = min(new_end, existing_end)
        overlap_minutes = max(0, (overlap_end - overlap_start).total_seconds() / 60)

        if overlap_minutes > 30:
            return {
                "hasConflict": True,
                "conflictingMatch": {
                    "id": str(record.id),
                    "date": str(record.date),
                    "time": str(record.time),
                    "location": record.location
                }
            }

    return {"hasConflict": False, "conflictingMatch": None}
```

### 6.4 VIP 权限控制

**球队上限**:
- FREE_CAPTAIN: 最多 1 支球队，每队 30 人
- VIP_CAPTAIN: 最多 3 支球队，每队 100 人

**约球大厅**:
- VIP 独享筛选：`minCredit`、`verifiedOnly`
- VIP 帖子置顶：`urgentTop = true` 的帖子优先展示
- VIP 每日限 1 次加急发布

**对手透视**:
- VIP 可查看：近 10 场战绩、平均年龄、信用分明细、互评标签明文
- 非 VIP：这些字段返回空或遮罩值

**财务**:
- VIP 可导出月度/年度报表
- VIP 可使用强力催收

**战报**:
- VIP 可使用高级模板（nba/ucl/cyberpunk 等）
- VIP 生成的战报无水印

### 6.5 自动状态流转

**赛程状态流转**:
```
upcoming → pending_report → waiting_confirmation → confirm_needed → finished
                                                                    ↑
upcoming → cancelled                                                |
pending_report → cancelled                          (自动确认: 48h无操作)
```

- 比赛结束时间到达后：`upcoming → pending_report`（可通过定时任务或延迟队列实现）
- 主队提交报告后：`pending_report → waiting_confirmation`
- 客队确认后：`waiting_confirmation → finished`
- 客队 48 小时未操作：`waiting_confirmation → confirm_needed → finished`（自动确认）

### 6.6 订金机制

- 应战时扣除：`totalPrice * 50%` 从应战方 `teams.fund_balance` 扣除
- 正常完赛：订金转为比赛费用的一部分
- 取消应战：全额退还订金（信用分按时间扣减）
- 爽约（对手到场己方未到）：订金不退，信用分 -50

---

## 七、定时任务

### 7.1 赛程状态自动更新

```python
# 每 10 分钟检查一次
async def auto_update_match_status():
    """自动将已过比赛时间的 upcoming 赛程变为 pending_report"""
    now = datetime.utcnow()
    records = await session.exec(
        select(MatchRecord).where(
            MatchRecord.status == "upcoming",
            MatchRecord.date <= now.date(),
            MatchRecord.time <= now.time()
        )
    )
    for record in records.all():
        end_time = datetime.combine(record.date, record.time) + timedelta(minutes=record.duration)
        if now >= end_time:
            record.status = "pending_report"
    await session.commit()
```

### 7.2 自动确认比赛结果

```python
# 每小时检查一次
async def auto_confirm_match():
    """48小时未确认的比赛自动确认"""
    threshold = datetime.utcnow() - timedelta(hours=48)
    records = await session.exec(
        select(MatchRecord).where(
            MatchRecord.status == "waiting_confirmation",
            MatchRecord.updated_at <= threshold
        )
    )
    for record in records.all():
        record.status = "finished"
        # 更新信用分
        await update_credit_for_completion(session, record.host_team_id)
        await update_credit_for_completion(session, record.guest_team_id)
    await session.commit()
```

### 7.3 VIP 过期检查

```python
# 每小时检查一次
async def check_vip_expiry():
    """VIP 过期自动降级"""
    now = datetime.utcnow()
    expired = await session.exec(
        select(VipSubscription).where(
            VipSubscription.status == "active",
            VipSubscription.end_date <= now
        )
    )
    for sub in expired.all():
        sub.status = "expired"
        user = await session.get(User, sub.user_id)
        # 检查是否还有其他活跃订阅
        other_active = await session.exec(
            select(VipSubscription).where(
                VipSubscription.user_id == sub.user_id,
                VipSubscription.status == "active",
                VipSubscription.id != sub.id
            )
        )
        if not other_active.first():
            user.role = "FREE_CAPTAIN"
    await session.commit()
```

### 7.4 邀请码过期清理

```python
# 每天执行一次
async def cleanup_expired_invites():
    """清理过期的邀请码"""
    now = datetime.utcnow()
    await session.exec(
        delete(TeamInvite).where(TeamInvite.expires_at <= now)
    )
    await session.commit()
```

---

## 八、中间件与通用处理

### 8.1 CORS 配置

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 8.2 统一异常处理

```python
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    error_map = {
        400: 4000, 401: 4001, 403: 4003, 404: 4004,
        409: 4005, 422: 4007, 429: 4006, 500: 1
    }
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "code": error_map.get(exc.status_code, 1),
            "message": exc.detail,
            "data": None,
            "timestamp": datetime.utcnow().isoformat()
        }
    )
```

### 8.3 请求日志

```python
import logging
from starlette.middleware.base import BaseHTTPMiddleware

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        logger.info(f"{request.method} {request.url}")
        response = await call_next(request)
        logger.info(f"Response: {response.status_code}")
        return response
```

---

## 九、部署与运维

### 9.1 环境变量

```env
# .env
DATABASE_URL=postgresql+asyncpg://postgres:pfH5fYK4PmWKEHqm@14.103.197.4:6432/spot_on
JWT_SECRET_KEY=your-production-secret-key
JWT_ALGORITHM=HS256
WX_APP_ID=your-wx-app-id
WX_APP_SECRET=your-wx-app-secret
```

### 9.2 数据库迁移

使用 Alembic 管理数据库迁移：

```bash
# 初始化
alembic init alembic

# 生成迁移文件
alembic revision --autogenerate -m "initial"

# 执行迁移
alembic upgrade head
```

### 9.3 启动命令

```bash
# 开发环境
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 生产环境
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### 9.4 依赖列表

```txt
# requirements.txt
fastapi>=0.110.0
sqlmodel>=0.0.19
pydantic>=2.7.0
pydantic-settings>=2.0.0
uvicorn[standard]>=0.25.0
asyncpg>=0.29.0
sqlalchemy[asyncio]>=2.0.0
python-jose[cryptography]>=3.3.0
alembic>=1.13.0
httpx>=0.25.0
python-multipart>=0.0.6
openpyxl>=3.1.0
qrcode>=7.4
Pillow>=10.0.0
```

---

## 十、接口总览表

| 序号 | 方法 | 路径 | 说明 | 认证 | 角色要求 |
|------|------|------|------|------|----------|
| 1 | POST | `/auth/wechat/login` | 微信登录 | 否 | - |
| 2 | POST | `/auth/phone/login` | 手机号登录 | 否 | - |
| 3 | POST | `/auth/phone/send-code` | 发送验证码 | 否 | - |
| 4 | POST | `/auth/phone/bind` | 绑定手机号 | 是 | - |
| 5 | POST | `/auth/refresh` | 刷新 Token | 否 | - |
| 6 | POST | `/auth/logout` | 退出登录 | 是 | - |
| 7 | GET | `/users/me` | 获取当前用户 | 是 | - |
| 8 | PATCH | `/users/me` | 更新用户信息 | 是 | - |
| 9 | GET | `/teams/mine` | 获取我的球队 | 是 | 队长 |
| 10 | POST | `/teams` | 创建球队 | 是 | - |
| 11 | PUT | `/teams/{id}/switch` | 切换球队 | 是 | 队长/队员 |
| 12 | PATCH | `/teams/{id}` | 更新球队 | 是 | 队长 |
| 13 | GET | `/teams/{id}` | 球队详情 | 是 | - |
| 14 | GET | `/teams/search` | 搜索球队 | 是 | - |
| 15 | POST | `/teams/{id}/verification` | 提交认证 | 是 | 队长 |
| 16 | GET | `/teams/{id}/verification` | 认证状态 | 是 | - |
| 17 | POST | `/teams/{id}/report` | 举报球队 | 是 | - |
| 18 | GET | `/teams/{id}/players` | 队员列表 | 是 | - |
| 19 | POST | `/teams/{id}/invite` | 生成邀请 | 是 | 队长 |
| 20 | POST | `/teams/join/{inviteCode}` | 加入球队 | 是 | - |
| 21 | DELETE | `/teams/{teamId}/players/{playerId}` | 移除队员 | 是 | 队长 |
| 22 | GET | `/players/{id}` | 队员详情 | 是 | - |
| 23 | PATCH | `/players/{id}` | 更新队员 | 是 | 队长/本人 |
| 24 | GET | `/matches` | 约球列表 | 是 | - |
| 25 | POST | `/matches` | 发起约球 | 是 | 队长 |
| 26 | GET | `/matches/{id}` | 约球详情 | 是 | - |
| 27 | POST | `/matches/{id}/accept` | 应战 | 是 | 队长 |
| 28 | POST | `/matches/{id}/cancel` | 取消 | 是 | 队长 |
| 29 | GET | `/matches/{id}/conflict-check` | 冲突检查 | 是 | - |
| 30 | GET | `/matches/schedule` | 我的赛程 | 是 | - |
| 31 | GET | `/matches/history` | 历史战绩 | 是 | - |
| 32 | POST | `/matches/{id}/report` | 录入数据 | 是 | 主队队长 |
| 33 | POST | `/matches/{id}/confirm` | 确认结果 | 是 | 客队队长 |
| 34 | GET | `/matches/{id}/report-image` | 战报图片 | 是 | - |
| 35 | GET | `/teams/{id}/bills` | 账单列表 | 是 | - |
| 36 | POST | `/bills/{id}/remind` | 催收 | 是 | 队长 |
| 37 | POST | `/bills/{billId}/players/{playerId}/pay` | 标记付款 | 是 | 队长 |
| 38 | GET | `/teams/{id}/transactions` | 交易流水 | 是 | 队长 |
| 39 | POST | `/teams/{id}/transactions` | 记录交易 | 是 | 队长 |
| 40 | GET | `/teams/{id}/finance/export` | 导出报表 | 是 | VIP队长 |
| 41 | GET | `/chats` | 会话列表 | 是 | - |
| 42 | GET | `/chats/{sessionId}/messages` | 消息列表 | 是 | - |
| 43 | POST | `/chats/{sessionId}/messages` | 发送消息 | 是 | - |
| 44 | DELETE | `/chats/{sessionId}` | 删除会话 | 是 | - |
| 45 | GET | `/vip/plans` | 套餐列表 | 是 | - |
| 46 | POST | `/vip/subscribe` | 创建订阅 | 是 | - |
| 47 | GET | `/vip/status` | 订阅状态 | 是 | - |

---

## 十一、前后端字段映射说明

后端使用 `snake_case`（Python/PostgreSQL 惯例），前端使用 `camelCase`（TypeScript 惯例）。在 API 响应的序列化阶段进行转换。

**推荐方案**: 使用 Pydantic 的 alias 机制：

```python
from pydantic import ConfigDict

class UserRead(SQLModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )

    id: str
    open_id: str = Field(alias="openId", serialization_alias="openId")
    union_id: str | None = Field(default=None, alias="unionId", serialization_alias="unionId")
    current_team_id: str | None = Field(default=None, alias="currentTeamId", serialization_alias="currentTeamId")
    created_at: str = Field(alias="createdAt", serialization_alias="createdAt")
    updated_at: str = Field(alias="updatedAt", serialization_alias="updatedAt")
```

或使用全局响应中间件自动转换：

```python
import re

def snake_to_camel(name: str) -> str:
    components = name.split("_")
    return components[0] + "".join(x.title() for x in components[1:])

def convert_keys(data):
    if isinstance(data, dict):
        return {snake_to_camel(k): convert_keys(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [convert_keys(item) for item in data]
    return data
```

---

## 十二、安全要求

1. **SQL 注入防护**: 使用 SQLModel/SQLAlchemy 的参数化查询，禁止原生 SQL 拼接
2. **XSS 防护**: 所有用户输入在存储前进行转义
3. **JWT 安全**: 使用 HS256 算法，密钥不低于 32 字符，token 中不存储敏感信息
4. **限频**: 登录接口 10 次/分钟，短信发送 1 次/60 秒，通用 API 100 次/分钟
5. **身份证号脱敏**: 存储时仅保留前 6 位和后 4 位，中间用 * 替代
6. **手机号脱敏**: 列表展示时仅显示前 3 位和后 4 位
7. **文件上传**: 限制文件类型（jpg/png/pdf）、大小（5MB），使用独立 OSS 存储
