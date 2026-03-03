# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Spot On (约球平台) is an amateur football/soccer team matching and management platform targeting the Chinese market. The product serves team captains and players who organize casual games (7v7, 8v8).

**Core features planned:**

- Team matching system with skill-level filtering, credit scores, and mutual ratings
- Team management: signup/attendance tracking, automated AA billing, pre-payment
- Game recording: match reports, player stats (goals, assists), MVP voting
- Trust/credit system with deposits for cancellation prevention
- Add-on services: referees, videography, insurance, custom merchandise

## Project Structure

```text
spot_on/
├── api/          # Backend API server (Python)
├── wx/           # WeChat Mini-Program frontend (for regular players)
├── docs/         # Product documentation and tech specs (in Chinese)
└── scripts/      # Temporary/utility scripts
```

## Tech Stack

### Backend (`api/`)

- **Framework:** FastAPI (v0.110+)
- **ORM / Model:** SQLModel (v0.0.19+)
- **Validation:** Pydantic V2 (v2.7+)
- **Database:** PostgreSQL (v15+)
- **Driver:** asyncpg (async)
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

## Documentation

- `docs/用户调研.md` — User research interview with a team captain, covering pain points, feature requirements, and monetization strategy. Primary product requirements source.
- `docs/TECH_SPEC_Backend.md` — Backend coding standards and conventions for FastAPI + SQLModel + PostgreSQL.
- `docs/TECH_SPEC_Frontend.md` — Frontend coding standards and conventions for native WeChat Mini-Program (WXML / WXSS / TypeScript).

## Conventions

- All documentation is written in **Chinese (中文)**.
- Backend code goes in `api/`, following the structure: `app/models/`, `app/api/v1/endpoints/`, `app/core/`, `app/services/`.
- Frontend TypeScript source goes in `wx/src/`, compiled output in `wx/miniprogram/`.
- Utility/temporary scripts go in `scripts/`.
- Commit messages in English.
