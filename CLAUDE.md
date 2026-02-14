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
- **ODM:** Beanie (v1.25+) — async MongoDB ODM with Pydantic V2 support
- **Validation:** Pydantic V2 (v2.7+)
- **Database:** MongoDB (v6.0+)
- **Driver:** Motor (async)
- **Python:** 3.10+
- **Details:** See `docs/TECH_SPEC_Backend.md`

### Frontend — WeChat Mini-Program (`wx/`)

- **Framework:** uni-app (Vue 3 + Vite), `<script setup lang="ts">` composition API
- **UI Library:** uni-ui (official uni-app component library)
- **Language:** TypeScript (strict, no `any`)
- **HTTP Client:** `uni.request` wrapped in `src/utils/request.ts`
- **State:** Pinia
- **Router:** `pages.json` declarative routing + `uni.navigateTo` / `uni.switchTab`
- **Style:** SCSS with `rpx` units
- **Details:** See `docs/TECH_SPEC_Frontend.md`

## Documentation

- `docs/用户调研.md` — User research interview with a team captain, covering pain points, feature requirements, and monetization strategy. Primary product requirements source.
- `docs/TECH_SPEC_Backend.md` — Backend coding standards and conventions for FastAPI + Beanie + MongoDB.
- `docs/TECH_SPEC_Frontend.md` — Frontend coding standards and conventions for uni-app WeChat Mini-Program (Vue 3 + TypeScript).

## Conventions

- All documentation is written in **Chinese (中文)**.
- Backend code goes in `api/`, following the structure: `app/models/`, `app/api/`, `app/core/`, `app/services/`.
- Frontend code goes in `wx/`.
- Utility/temporary scripts go in `scripts/`.
- Commit messages in English.
