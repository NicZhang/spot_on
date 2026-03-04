# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Spot On (约球平台) is an amateur football/soccer team matching and management platform targeting the Chinese market. The product serves team captains and players who organize casual games (7v7, 8v8).

**Core features:**

- Team matching with skill-level filtering, credit scores, and mutual ratings
- Team management: signup/attendance tracking, automated AA billing, pre-payment
- Game recording: match reports, player stats (goals, assists), MVP voting
- Trust/credit system with deposits for cancellation prevention
- VIP subscription with tiered captain privileges
- In-app chat between team captains

## Project Structure

```text
spot_on/
├── api/                # Backend API server (Python)
│   ├── app/
│   │   ├── api/v1/endpoints/   # 9 endpoint modules (47 endpoints)
│   │   ├── core/               # Config, DB, Redis, JWT, middleware, deps
│   │   ├── models/             # 18 SQLModel table models (8 files)
│   │   └── services/           # Business logic (WeChat, SMS, credit, conflict)
│   ├── tests/                  # Unit tests
│   ├── .env                    # Environment variables (not committed)
│   └── requirements.txt
├── wx/                 # WeChat Mini-Program frontend
│   ├── src/                    # TypeScript source
│   └── miniprogram/            # Compiled JS output
├── prototype/          # High-fidelity React prototype (reference only)
├── docs/               # Product documentation and tech specs (in Chinese)
└── scripts/            # Temporary/utility scripts
```

## Tech Stack

### Backend (`api/`)

- **Framework:** FastAPI (v0.115+)
- **ORM / Model:** SQLModel (v0.0.19+)
- **Validation:** Pydantic V2 (v2.7+)
- **Database:** PostgreSQL (v15+) with asyncpg
- **Cache:** Redis (v5.0+) with redis-py async
- **Auth:** JWT (python-jose, HS256) — 7-day access tokens, 30-day refresh tokens
- **HTTP Client:** httpx (for WeChat API calls)
- **Python:** 3.10+
- **Details:** See `docs/TECH_SPEC_Backend.md`

### Frontend — WeChat Mini-Program (`wx/`)

- **Framework:** 微信小程序原生框架（WXML / WXSS / TypeScript）
- **UI Library:** Vant Weapp (`@vant/weapp`)
- **Language:** TypeScript (strict, no `any`), external `tsc` compilation
- **HTTP Client:** `wx.request` wrapped in `src/utils/request.ts`
- **State:** `App.globalData` + page `data` + lightweight memory cache (`src/utils/store.ts`)
- **Router:** `app.json` declarative routing + `wx.navigateTo` / `wx.switchTab` / `wx.reLaunch`
- **Style:** WXSS with `rpx` units
- **Build:** `src/` (TS source) → `miniprogram/` (compiled JS output via `scripts/build.js`)
- **Details:** See `docs/TECH_SPEC_Frontend.md`

## Backend Architecture

### API Endpoints (47 total, under `/api/v1`)

| Module | File | Endpoints | Description |
|--------|------|-----------|-------------|
| Auth | `auth.py` | 6 | WeChat/phone login, SMS, token refresh, logout |
| Users | `users.py` | 2 | Profile get/update |
| Teams | `teams.py` | 13 | CRUD, search, verification, invite, report |
| Players | `players.py` | 2 | Player profile get/update |
| Matches | `matches.py` | 10 | Lobby, create, accept, cancel, report, confirm |
| Bills | `bills.py` | 3 | Bill listing, payment reminders, mark paid |
| Transactions | `transactions.py` | 3 | Team finance records, export |
| Chats | `chats.py` | 4 | Chat sessions, messages, delete |
| VIP | `vip.py` | 3 | Plans, subscribe, status |

### Database Models (18 tables)

| File | Models |
|------|--------|
| `user.py` | User, RefreshToken, SmsCode |
| `team.py` | Team, CreditHistory, TeamVerification, TeamReport, TeamInvite |
| `player.py` | Player |
| `match.py` | MatchRequest, MatchRecord |
| `bill.py` | Bill, BillPlayer |
| `transaction.py` | Transaction |
| `chat.py` | ChatSession, ChatMessage |
| `vip.py` | VipPlan, VipSubscription |

### Services

| File | Purpose |
|------|---------|
| `wechat.py` | WeChat jscode2session API integration |
| `sms.py` | SMS verification code generation/sending |
| `credit.py` | Credit score calculation (streaks, penalties) |
| `conflict.py` | Match time overlap detection |

### Redis Caching Strategy

- User profiles: 1 hour TTL
- VIP plans: 24 hours
- Team details / player lists: 3–5 minutes
- Match lists / schedule: 2 minutes
- Chat sessions: 1 minute
- Write operations invalidate related cache keys via `SCAN`

### Key Business Rules

- **Roles:** PLAYER → FREE_CAPTAIN (1 team, 30 members) → VIP_CAPTAIN (3 teams, 100 members)
- **Credit scoring:** 100 initial, +2/match, +5 for 3-streak, +10 for 5-streak, -10/-20 for late cancel, -50 for no-show
- **Deposits:** 50% of match price deducted on accept, refunded on cancellation
- **PATCH workaround:** WeChat `wx.request` cannot send PATCH; frontend sends POST + `X-HTTP-Method-Override: PATCH`, backend middleware converts it

## Documentation

- `docs/PRD.md` — Product Requirements Document (v3.2)
- `docs/API_SPEC.md` — API Specification (v1.2) with all endpoint definitions
- `docs/API_QUICK_REFERENCE.md` — Condensed API quick reference
- `docs/BACKEND_REQ.md` — Backend requirements document with DB schema details
- `docs/TECH_SPEC_Backend.md` — Backend coding standards and conventions
- `docs/TECH_SPEC_Frontend.md` — Frontend coding standards and conventions
- `docs/用户调研.md` — User research interview (primary product requirements source)

## Conventions

- All documentation is written in **Chinese (中文)**.
- Backend code goes in `api/`, following the structure: `app/models/`, `app/api/v1/endpoints/`, `app/core/`, `app/services/`.
- Frontend TypeScript source goes in `wx/src/`, compiled output in `wx/miniprogram/`.
- Utility/temporary scripts go in `scripts/`.
- Commit messages in English.

## Coding Rules (Frontend)

**FORBIDDEN:**
- Directly editing files in `wx/miniprogram/` — this directory is **auto-generated** by `npm run build` (`scripts/build.js`), which cleans and rebuilds the entire folder every time. Any direct edits will be lost.

**REQUIRED:**
- All frontend changes must be made in `wx/src/` (TypeScript source, WXML, WXSS, JSON, assets)
- Run `npm run build` (or `npm run dev` for watch mode) from `wx/` to compile into `wx/miniprogram/`
- After `npm run build`, use WeChat DevTools "构建 npm" to regenerate `miniprogram_npm/` for Vant Weapp components

## Coding Rules (Backend)

**FORBIDDEN:**
- `class Config:` — use `model_config = ConfigDict(...)` instead
- `pydantic.validator` — use `@field_validator` instead
- `.dict()` — use `.model_dump()` instead
- `orm_mode = True` — use `from_attributes = True` instead
- `Optional[str]` — use `str | None` instead
- `session.query()` — use `await session.exec(select(...))` instead

**REQUIRED:**
- Unified response envelope: `{ success, code, message, data, timestamp }`
- camelCase serialization for all API responses
- UUID primary keys on all models
- Async database operations with `AsyncSession`

## Common Commands

```bash
# Start backend server (from api/)
cd api && .venv/bin/uvicorn app.main:app --reload

# Install backend dependencies
cd api && .venv/bin/pip install -r requirements.txt

# Run tests
cd api && .venv/bin/pytest tests/

# Build frontend (from wx/)
cd wx && npm run build
```
