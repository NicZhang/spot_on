"""Seed the database with realistic mock data for every prototype page.

Usage:
    cd api && .venv/bin/python seed_data.py

This script:
1. Drops and re-creates all tables (clean slate)
2. Inserts realistic Chinese-language mock data across all 18 tables
3. Covers every page in the high-fidelity prototype

The "main user" (张伟) can be logged in via phone: 13800138000
A JWT token is also printed at the end for direct API testing.
"""

import asyncio
import sys
import uuid
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlmodel import SQLModel

import app.models  # noqa: F401 — register all tables
from app.core.db import async_session_maker, engine
from app.core.security import create_access_token, create_refresh_token
from app.models.bill import Bill, BillPlayer
from app.models.chat import ChatMessage, ChatSession
from app.models.match import MatchRecord, MatchRequest
from app.models.player import Player
from app.models.team import CreditHistory, Team, TeamInvite, TeamReport, TeamVerification
from app.models.transaction import Transaction
from app.models.user import RefreshToken, User
from app.models.vip import VipPlan, VipSubscription

# ---------------------------------------------------------------------------
# Fixed UUIDs for cross-table references
# ---------------------------------------------------------------------------

# Users (10 users)
U1 = uuid.UUID("a0000001-0000-0000-0000-000000000001")  # 张伟 — main user / VIP captain
U2 = uuid.UUID("a0000002-0000-0000-0000-000000000002")  # 李强 — captain of 铁血战士
U3 = uuid.UUID("a0000003-0000-0000-0000-000000000003")  # 王磊 — captain of 绿茵风暴
U4 = uuid.UUID("a0000004-0000-0000-0000-000000000004")  # 刘洋 — player in 暴风联队
U5 = uuid.UUID("a0000005-0000-0000-0000-000000000005")  # 陈浩 — player in 暴风联队
U6 = uuid.UUID("a0000006-0000-0000-0000-000000000006")  # 赵鹏 — player in 暴风联队
U7 = uuid.UUID("a0000007-0000-0000-0000-000000000007")  # 孙伟 — player in 铁血战士
U8 = uuid.UUID("a0000008-0000-0000-0000-000000000008")  # 周杰 — player in 铁血战士
U9 = uuid.UUID("a0000009-0000-0000-0000-000000000009")  # 吴勇 — player in 绿茵风暴
U10 = uuid.UUID("a0000010-0000-0000-0000-000000000010")  # 郑凯 — player in 暴风联队
U11 = uuid.UUID("a0000011-0000-0000-0000-000000000011")  # 马超 — captain of 银河战舰
U12 = uuid.UUID("a0000012-0000-0000-0000-000000000012")  # 黄涛 — captain of 猛龙过江
U13 = uuid.UUID("a0000013-0000-0000-0000-000000000013")  # 林峰 — player in 暴风联队
U14 = uuid.UUID("a0000014-0000-0000-0000-000000000014")  # 杨帆 — player in 暴风联队
U15 = uuid.UUID("a0000015-0000-0000-0000-000000000015")  # AI 助手虚拟用户

# Teams (5 teams)
T1 = uuid.UUID("b0000001-0000-0000-0000-000000000001")  # 暴风联队 — main user's team
T2 = uuid.UUID("b0000002-0000-0000-0000-000000000002")  # 铁血战士
T3 = uuid.UUID("b0000003-0000-0000-0000-000000000003")  # 绿茵风暴
T4 = uuid.UUID("b0000004-0000-0000-0000-000000000004")  # 银河战舰
T5 = uuid.UUID("b0000005-0000-0000-0000-000000000005")  # 猛龙过江

# Players
P1 = uuid.UUID("c0000001-0000-0000-0000-000000000001")  # 张伟 in 暴风联队
P2 = uuid.UUID("c0000002-0000-0000-0000-000000000002")  # 刘洋 in 暴风联队
P3 = uuid.UUID("c0000003-0000-0000-0000-000000000003")  # 陈浩 in 暴风联队
P4 = uuid.UUID("c0000004-0000-0000-0000-000000000004")  # 赵鹏 in 暴风联队
P5 = uuid.UUID("c0000005-0000-0000-0000-000000000005")  # 李强 in 铁血战士
P6 = uuid.UUID("c0000006-0000-0000-0000-000000000006")  # 孙伟 in 铁血战士
P7 = uuid.UUID("c0000007-0000-0000-0000-000000000007")  # 周杰 in 铁血战士
P8 = uuid.UUID("c0000008-0000-0000-0000-000000000008")  # 王磊 in 绿茵风暴
P9 = uuid.UUID("c0000009-0000-0000-0000-000000000009")  # 吴勇 in 绿茵风暴
P10 = uuid.UUID("c0000010-0000-0000-0000-000000000010")  # 郑凯 in 暴风联队
P11 = uuid.UUID("c0000011-0000-0000-0000-000000000011")  # 马超 in 银河战舰
P12 = uuid.UUID("c0000012-0000-0000-0000-000000000012")  # 黄涛 in 猛龙过江
P13 = uuid.UUID("c0000013-0000-0000-0000-000000000013")  # 林峰 in 暴风联队
P14 = uuid.UUID("c0000014-0000-0000-0000-000000000014")  # 杨帆 in 暴风联队

# Match Requests
MR1 = uuid.UUID("d0000001-0000-0000-0000-000000000001")
MR2 = uuid.UUID("d0000002-0000-0000-0000-000000000002")
MR3 = uuid.UUID("d0000003-0000-0000-0000-000000000003")
MR4 = uuid.UUID("d0000004-0000-0000-0000-000000000004")
MR5 = uuid.UUID("d0000005-0000-0000-0000-000000000005")
MR6 = uuid.UUID("d0000006-0000-0000-0000-000000000006")

# Match Records
REC1 = uuid.UUID("e0000001-0000-0000-0000-000000000001")
REC2 = uuid.UUID("e0000002-0000-0000-0000-000000000002")
REC3 = uuid.UUID("e0000003-0000-0000-0000-000000000003")
REC4 = uuid.UUID("e0000004-0000-0000-0000-000000000004")
REC5 = uuid.UUID("e0000005-0000-0000-0000-000000000005")
REC6 = uuid.UUID("e0000006-0000-0000-0000-000000000006")

# Bills
B1 = uuid.UUID("f0000001-0000-0000-0000-000000000001")
B2 = uuid.UUID("f0000002-0000-0000-0000-000000000002")
B3 = uuid.UUID("f0000003-0000-0000-0000-000000000003")

# Chat Sessions
CS1 = uuid.UUID("10000001-0000-0000-0000-000000000001")  # AI assistant
CS2 = uuid.UUID("10000002-0000-0000-0000-000000000002")  # Chat with 李强
CS3 = uuid.UUID("10000003-0000-0000-0000-000000000003")  # Chat with 王磊

# VIP Plans
VP1 = uuid.UUID("20000001-0000-0000-0000-000000000001")
VP2 = uuid.UUID("20000002-0000-0000-0000-000000000002")
VP3 = uuid.UUID("20000003-0000-0000-0000-000000000003")

# VIP Subscription
VS1 = uuid.UUID("30000001-0000-0000-0000-000000000001")

# ---------------------------------------------------------------------------
# Time helpers
# ---------------------------------------------------------------------------
NOW = datetime.now(timezone.utc).replace(tzinfo=None)
TODAY = date.today()


def days_ago(n: int) -> datetime:
    return NOW - timedelta(days=n)


def days_later(n: int) -> date:
    return TODAY + timedelta(days=n)


def ts_ms(dt: datetime) -> int:
    """Convert datetime to Unix milliseconds."""
    return int(dt.timestamp() * 1000)


async def seed() -> None:
    # Drop and recreate all tables
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
        await conn.run_sync(SQLModel.metadata.create_all)
    print("Tables recreated.")

    async with async_session_maker() as session:
        # ==================================================================
        # 1. USERS (15 users)
        # ==================================================================
        users = [
            User(
                id=U1, open_id="wx_zhangwei_001", phone="13800138000",
                name="张伟", avatar="", gender="male",
                role="VIP_CAPTAIN", goals=23, assists=15, mvp_count=8,
                appearances=42, balance=Decimal("520.00"),
                current_team_id=T1,
                created_at=days_ago(180), updated_at=NOW,
            ),
            User(
                id=U2, open_id="wx_liqiang_002", phone="13900139000",
                name="李强", avatar="", gender="male",
                role="FREE_CAPTAIN", goals=18, assists=12, mvp_count=5,
                appearances=35, balance=Decimal("200.00"),
                current_team_id=T2,
                created_at=days_ago(150), updated_at=NOW,
            ),
            User(
                id=U3, open_id="wx_wanglei_003", phone="13700137000",
                name="王磊", avatar="", gender="male",
                role="FREE_CAPTAIN", goals=30, assists=20, mvp_count=10,
                appearances=50, balance=Decimal("350.00"),
                current_team_id=T3,
                created_at=days_ago(200), updated_at=NOW,
            ),
            User(
                id=U4, open_id="wx_liuyang_004", phone="13600136000",
                name="刘洋", avatar="", gender="male",
                role="PLAYER", goals=12, assists=8, mvp_count=2,
                appearances=28, balance=Decimal("100.00"),
                current_team_id=T1,
                created_at=days_ago(120), updated_at=NOW,
            ),
            User(
                id=U5, open_id="wx_chenhao_005", phone="13500135000",
                name="陈浩", avatar="", gender="male",
                role="PLAYER", goals=8, assists=14, mvp_count=1,
                appearances=25, balance=Decimal("80.00"),
                current_team_id=T1,
                created_at=days_ago(100), updated_at=NOW,
            ),
            User(
                id=U6, open_id="wx_zhaopeng_006", phone="13400134000",
                name="赵鹏", avatar="", gender="male",
                role="PLAYER", goals=5, assists=3, mvp_count=0,
                appearances=20, balance=Decimal("50.00"),
                current_team_id=T1,
                created_at=days_ago(90), updated_at=NOW,
            ),
            User(
                id=U7, open_id="wx_sunwei_007", phone="13300133000",
                name="孙伟", avatar="", gender="male",
                role="PLAYER", goals=10, assists=7, mvp_count=3,
                appearances=30, balance=Decimal("120.00"),
                current_team_id=T2,
                created_at=days_ago(140), updated_at=NOW,
            ),
            User(
                id=U8, open_id="wx_zhoujie_008", phone="13200132000",
                name="周杰", avatar="", gender="male",
                role="PLAYER", goals=15, assists=5, mvp_count=4,
                appearances=32, balance=Decimal("90.00"),
                current_team_id=T2,
                created_at=days_ago(130), updated_at=NOW,
            ),
            User(
                id=U9, open_id="wx_wuyong_009", phone="13100131000",
                name="吴勇", avatar="", gender="male",
                role="PLAYER", goals=6, assists=9, mvp_count=1,
                appearances=22, balance=Decimal("60.00"),
                current_team_id=T3,
                created_at=days_ago(110), updated_at=NOW,
            ),
            User(
                id=U10, open_id="wx_zhengkai_010", phone="15800158000",
                name="郑凯", avatar="", gender="male",
                role="PLAYER", goals=3, assists=2, mvp_count=0,
                appearances=15, balance=Decimal("30.00"),
                current_team_id=T1,
                created_at=days_ago(60), updated_at=NOW,
            ),
            User(
                id=U11, open_id="wx_machao_011", phone="15900159000",
                name="马超", avatar="", gender="male",
                role="FREE_CAPTAIN", goals=20, assists=10, mvp_count=6,
                appearances=38, balance=Decimal("280.00"),
                current_team_id=T4,
                created_at=days_ago(160), updated_at=NOW,
            ),
            User(
                id=U12, open_id="wx_huangtao_012", phone="15700157000",
                name="黄涛", avatar="", gender="male",
                role="FREE_CAPTAIN", goals=9, assists=6, mvp_count=2,
                appearances=26, balance=Decimal("150.00"),
                current_team_id=T5,
                created_at=days_ago(80), updated_at=NOW,
            ),
            User(
                id=U13, open_id="wx_linfeng_013", phone="15600156000",
                name="林峰", avatar="", gender="male",
                role="PLAYER", goals=7, assists=11, mvp_count=1,
                appearances=24, balance=Decimal("70.00"),
                current_team_id=T1,
                created_at=days_ago(75), updated_at=NOW,
            ),
            User(
                id=U14, open_id="wx_yangfan_014", phone="15500155000",
                name="杨帆", avatar="", gender="male",
                role="PLAYER", goals=4, assists=6, mvp_count=0,
                appearances=18, balance=Decimal("40.00"),
                current_team_id=T1,
                created_at=days_ago(50), updated_at=NOW,
            ),
            User(
                id=U15, open_id="wx_ai_assistant", phone=None,
                name="Spot On 助手", avatar="", gender="unknown",
                role="PLAYER", goals=0, assists=0, mvp_count=0,
                appearances=0, balance=Decimal("0.00"),
                current_team_id=None,
                created_at=days_ago(365), updated_at=NOW,
            ),
        ]
        session.add_all(users)
        await session.flush()
        print(f"  Users: {len(users)}")

        # ==================================================================
        # 2. TEAMS (5 teams)
        # ==================================================================
        teams = [
            Team(
                id=T1, name="暴风联队", logo="", gender="male",
                avg_age=Decimal("27.5"), credit_score=95,
                win_rate=Decimal("62.50"),
                tags=["配合默契", "速度快", "技术流"],
                location="上海市浦东新区世纪公园足球场",
                latitude=31.2157, longitude=121.5440,
                is_verified=True,
                home_jersey_color="#FF0000", away_jersey_color="#FFFFFF",
                fund_balance=Decimal("2680.00"),
                announcement="本周六下午3点训练，全员到齐！",
                captain_id=U1, member_count=7,
                created_at=days_ago(180), updated_at=NOW,
            ),
            Team(
                id=T2, name="铁血战士", logo="", gender="male",
                avg_age=Decimal("29.0"), credit_score=85,
                win_rate=Decimal("55.00"),
                tags=["身体强壮", "防守稳健", "意志力强"],
                location="上海市徐汇区上海体育场",
                latitude=31.1813, longitude=121.4395,
                is_verified=True,
                home_jersey_color="#0000FF", away_jersey_color="#FFFF00",
                fund_balance=Decimal("1520.00"),
                announcement="下周有比赛，大家保持状态",
                captain_id=U2, member_count=3,
                created_at=days_ago(150), updated_at=NOW,
            ),
            Team(
                id=T3, name="绿茵风暴", logo="", gender="male",
                avg_age=Decimal("25.0"), credit_score=100,
                win_rate=Decimal("70.00"),
                tags=["进攻犀利", "配合流畅", "年轻有活力"],
                location="上海市静安区静安体育中心",
                latitude=31.2286, longitude=121.4513,
                is_verified=True,
                home_jersey_color="#00FF00", away_jersey_color="#000000",
                fund_balance=Decimal("3200.00"),
                announcement="欢迎新队友加入！",
                captain_id=U3, member_count=2,
                created_at=days_ago(200), updated_at=NOW,
            ),
            Team(
                id=T4, name="银河战舰", logo="", gender="male",
                avg_age=Decimal("26.5"), credit_score=55,
                win_rate=Decimal("40.00"),
                tags=["新队伍", "热情高涨"],
                location="上海市杨浦区五角场体育场",
                latitude=31.3015, longitude=121.5147,
                is_verified=False,
                home_jersey_color="#800080", away_jersey_color="#FFA500",
                fund_balance=Decimal("800.00"),
                announcement=None,
                captain_id=U11, member_count=1,
                created_at=days_ago(160), updated_at=NOW,
            ),
            Team(
                id=T5, name="猛龙过江", logo="", gender="mixed",
                avg_age=Decimal("28.0"), credit_score=30,
                win_rate=Decimal("25.00"),
                tags=["混合球队", "娱乐为主", "***"],
                location="上海市闵行区莘庄体育公园",
                latitude=31.1100, longitude=121.3850,
                is_verified=False,
                home_jersey_color="#FF6600", away_jersey_color="#333333",
                fund_balance=Decimal("350.00"),
                announcement="周末约球，欢迎来战！",
                captain_id=U12, member_count=1,
                created_at=days_ago(80), updated_at=NOW,
            ),
        ]
        session.add_all(teams)
        await session.flush()
        print(f"  Teams: {len(teams)}")

        # ==================================================================
        # 3. PLAYERS (14 players across 5 teams)
        # ==================================================================
        players = [
            # -- 暴风联队 (T1) — 7 players --
            Player(
                id=P1, team_id=T1, user_id=U1,
                name="张伟", number=10, position="中场",
                avatar="", height=178, weight=72,
                strong_foot="right", level="校队",
                phone="13800138000",
                goals=23, assists=15, mvp_count=8,
                created_at=days_ago(180), updated_at=NOW,
            ),
            Player(
                id=P2, team_id=T1, user_id=U4,
                name="刘洋", number=9, position="前锋",
                avatar="", height=182, weight=78,
                strong_foot="left", level="业余",
                phone="13600136000",
                goals=12, assists=8, mvp_count=2,
                created_at=days_ago(120), updated_at=NOW,
            ),
            Player(
                id=P3, team_id=T1, user_id=U5,
                name="陈浩", number=6, position="后卫",
                avatar="", height=175, weight=70,
                strong_foot="right", level="业余",
                phone="13500135000",
                goals=8, assists=14, mvp_count=1,
                created_at=days_ago(100), updated_at=NOW,
            ),
            Player(
                id=P4, team_id=T1, user_id=U6,
                name="赵鹏", number=1, position="门将",
                avatar="", height=186, weight=82,
                strong_foot="right", level="入门",
                phone="13400134000",
                goals=0, assists=0, mvp_count=0,
                created_at=days_ago(90), updated_at=NOW,
            ),
            Player(
                id=P10, team_id=T1, user_id=U10,
                name="郑凯", number=7, position="前锋",
                avatar="", height=176, weight=71,
                strong_foot="right", level="入门",
                phone="15800158000",
                goals=3, assists=2, mvp_count=0,
                created_at=days_ago(60), updated_at=NOW,
            ),
            Player(
                id=P13, team_id=T1, user_id=U13,
                name="林峰", number=8, position="中场",
                avatar="", height=174, weight=68,
                strong_foot="left", level="业余",
                phone="15600156000",
                goals=7, assists=11, mvp_count=1,
                created_at=days_ago(75), updated_at=NOW,
            ),
            Player(
                id=P14, team_id=T1, user_id=U14,
                name="杨帆", number=3, position="后卫",
                avatar="", height=180, weight=75,
                strong_foot="right", level="入门",
                phone="15500155000",
                goals=4, assists=6, mvp_count=0,
                created_at=days_ago(50), updated_at=NOW,
            ),
            # -- 铁血战士 (T2) — 3 players --
            Player(
                id=P5, team_id=T2, user_id=U2,
                name="李强", number=4, position="后卫",
                avatar="", height=183, weight=80,
                strong_foot="right", level="校队",
                phone="13900139000",
                goals=18, assists=12, mvp_count=5,
                created_at=days_ago(150), updated_at=NOW,
            ),
            Player(
                id=P6, team_id=T2, user_id=U7,
                name="孙伟", number=11, position="前锋",
                avatar="", height=177, weight=73,
                strong_foot="right", level="业余",
                phone="13300133000",
                goals=10, assists=7, mvp_count=3,
                created_at=days_ago(140), updated_at=NOW,
            ),
            Player(
                id=P7, team_id=T2, user_id=U8,
                name="周杰", number=5, position="中场",
                avatar="", height=180, weight=76,
                strong_foot="left", level="青训",
                phone="13200132000",
                goals=15, assists=5, mvp_count=4,
                created_at=days_ago(130), updated_at=NOW,
            ),
            # -- 绿茵风暴 (T3) — 2 players --
            Player(
                id=P8, team_id=T3, user_id=U3,
                name="王磊", number=10, position="中场",
                avatar="", height=176, weight=70,
                strong_foot="right", level="退役职业",
                phone="13700137000",
                goals=30, assists=20, mvp_count=10,
                created_at=days_ago(200), updated_at=NOW,
            ),
            Player(
                id=P9, team_id=T3, user_id=U9,
                name="吴勇", number=9, position="前锋",
                avatar="", height=179, weight=74,
                strong_foot="right", level="业余",
                phone="13100131000",
                goals=6, assists=9, mvp_count=1,
                created_at=days_ago(110), updated_at=NOW,
            ),
            # -- 银河战舰 (T4) — 1 player --
            Player(
                id=P11, team_id=T4, user_id=U11,
                name="马超", number=7, position="前锋",
                avatar="", height=181, weight=77,
                strong_foot="right", level="校队",
                phone="15900159000",
                goals=20, assists=10, mvp_count=6,
                created_at=days_ago(160), updated_at=NOW,
            ),
            # -- 猛龙过江 (T5) — 1 player --
            Player(
                id=P12, team_id=T5, user_id=U12,
                name="黄涛", number=6, position="中场",
                avatar="", height=173, weight=67,
                strong_foot="left", level="业余",
                phone="15700157000",
                goals=9, assists=6, mvp_count=2,
                created_at=days_ago(80), updated_at=NOW,
            ),
        ]
        session.add_all(players)
        await session.flush()
        print(f"  Players: {len(players)}")

        # ==================================================================
        # 4. MATCH REQUESTS (6 — various statuses for lobby + schedule)
        # ==================================================================
        match_requests = [
            # MR1: Open — 铁血战士 looking for opponent (lobby visible)
            MatchRequest(
                id=MR1, host_team_id=T2, guest_team_id=None,
                date=days_later(3), time=time(15, 0),
                duration=90, location="上海市徐汇区上海体育场A区",
                field_name="上海体育场", format="8v8",
                latitude=31.1813, longitude=121.4395,
                intensity="竞技局", gender_req="male",
                jersey_color="#0000FF",
                pitch_fee=Decimal("800.00"), referee_fee=Decimal("200.00"),
                water_fee=Decimal("50.00"), total_price=Decimal("65.63"),
                amenities=["免费停车", "灯光", "饮水机"],
                video_service=False, insurance_player_ids=[],
                urgent_top=False,
                memo="欢迎实力相当的球队前来挑战，不接受消极比赛",
                status="open",
                created_at=days_ago(1), updated_at=days_ago(1),
            ),
            # MR2: Open — 绿茵风暴 looking for opponent (lobby visible)
            MatchRequest(
                id=MR2, host_team_id=T3, guest_team_id=None,
                date=days_later(5), time=time(19, 0),
                duration=90, location="上海市静安区静安体育中心5号场",
                field_name="静安体育中心", format="7v7",
                latitude=31.2286, longitude=121.4513,
                intensity="养生局", gender_req="any",
                jersey_color="#00FF00",
                pitch_fee=Decimal("600.00"), referee_fee=Decimal("0.00"),
                water_fee=Decimal("30.00"), total_price=Decimal("45.00"),
                amenities=["淋浴间", "更衣室", "灯光", "储物柜"],
                video_service=False, insurance_player_ids=[],
                urgent_top=False,
                memo="友谊赛，养生为主，踢完一起吃饭",
                status="open",
                created_at=days_ago(0), updated_at=days_ago(0),
            ),
            # MR3: Open — 银河战舰 looking for opponent (lobby visible)
            MatchRequest(
                id=MR3, host_team_id=T4, guest_team_id=None,
                date=days_later(7), time=time(10, 0),
                duration=60, location="上海市杨浦区五角场体育场2号场",
                field_name="五角场体育场", format="5v5",
                latitude=31.3015, longitude=121.5147,
                intensity="养生局", gender_req="any",
                jersey_color="#800080",
                pitch_fee=Decimal("400.00"), referee_fee=Decimal("0.00"),
                water_fee=Decimal("20.00"), total_price=Decimal("42.00"),
                amenities=["免费停车"],
                video_service=False, insurance_player_ids=[],
                urgent_top=False,
                memo="新队伍找队练习，水平一般，欢迎菜鸡互啄",
                status="open",
                created_at=days_ago(2), updated_at=days_ago(2),
            ),
            # MR4: Matched — 暴风联队 vs 铁血战士 (upcoming match)
            MatchRequest(
                id=MR4, host_team_id=T1, guest_team_id=T2,
                date=days_later(2), time=time(14, 0),
                duration=90, location="上海市浦东新区世纪公园足球场3号场",
                field_name="世纪公园足球场", format="8v8",
                latitude=31.2157, longitude=121.5440,
                intensity="竞技局", gender_req="male",
                jersey_color="#FF0000",
                pitch_fee=Decimal("800.00"), referee_fee=Decimal("200.00"),
                water_fee=Decimal("50.00"), total_price=Decimal("65.63"),
                amenities=["免费停车", "灯光", "饮水机", "看台"],
                video_service=True, insurance_player_ids=[],
                urgent_top=False,
                memo="老对手再战，不服来比",
                status="matched",
                created_at=days_ago(3), updated_at=days_ago(1),
            ),
            # MR5: Open — 猛龙过江 looking for opponent (lobby visible, low credit)
            MatchRequest(
                id=MR5, host_team_id=T5, guest_team_id=None,
                date=days_later(4), time=time(16, 0),
                duration=90, location="上海市闵行区莘庄体育公园足球场",
                field_name="莘庄体育公园", format="7v7",
                latitude=31.1100, longitude=121.3850,
                intensity="激战局", gender_req="any",
                jersey_color="#FF6600",
                pitch_fee=Decimal("500.00"), referee_fee=Decimal("150.00"),
                water_fee=Decimal("40.00"), total_price=Decimal("49.29"),
                amenities=["免费停车", "灯光"],
                video_service=False, insurance_player_ids=[],
                urgent_top=False,
                memo="混合队伍，男女都欢迎",
                status="open",
                created_at=days_ago(1), updated_at=days_ago(1),
            ),
            # MR6: Matched — 暴风联队 as guest vs 绿茵风暴 (upcoming match next week)
            MatchRequest(
                id=MR6, host_team_id=T3, guest_team_id=T1,
                date=days_later(9), time=time(15, 30),
                duration=90, location="上海市静安区静安体育中心3号场",
                field_name="静安体育中心", format="8v8",
                latitude=31.2286, longitude=121.4513,
                intensity="竞技局", gender_req="male",
                jersey_color="#00FF00",
                pitch_fee=Decimal("800.00"), referee_fee=Decimal("200.00"),
                water_fee=Decimal("50.00"), total_price=Decimal("65.63"),
                amenities=["淋浴间", "更衣室", "灯光", "饮水机"],
                video_service=True, insurance_player_ids=[],
                urgent_top=False,
                memo="强强对话",
                status="matched",
                created_at=days_ago(2), updated_at=days_ago(0),
            ),
        ]
        session.add_all(match_requests)
        await session.flush()
        print(f"  MatchRequests: {len(match_requests)}")

        # ==================================================================
        # 5. MATCH RECORDS (6 — various statuses for schedule + history)
        # ==================================================================
        match_records = [
            # REC1: Completed — 暴风联队 3:2 铁血战士 (10 days ago)
            MatchRecord(
                id=REC1, match_request_id=None,
                host_team_id=T1, guest_team_id=T2,
                host_team_score=3, guest_team_score=2,
                date=TODAY - timedelta(days=10), time=time(15, 0),
                location="上海市浦东新区世纪公园足球场", format="8v8",
                duration=90, status="completed",
                report={
                    "myScore": 3, "opponentScore": 2,
                    "mvpPlayerId": str(P1),
                    "goals": [
                        {"playerId": str(P1), "count": 1},
                        {"playerId": str(P2), "count": 2},
                    ],
                    "assists": [
                        {"playerId": str(P3), "count": 1},
                        {"playerId": str(P13), "count": 1},
                    ],
                    "lineup": [str(P1), str(P2), str(P3), str(P4), str(P10), str(P13), str(P14)],
                },
                total_fee=Decimal("1050.00"), fee_per_player=Decimal("75.00"),
                created_at=days_ago(10), updated_at=days_ago(9),
            ),
            # REC2: Completed — 暴风联队 1:1 绿茵风暴 (20 days ago)
            MatchRecord(
                id=REC2, match_request_id=None,
                host_team_id=T1, guest_team_id=T3,
                host_team_score=1, guest_team_score=1,
                date=TODAY - timedelta(days=20), time=time(19, 0),
                location="上海市静安区静安体育中心", format="7v7",
                duration=90, status="completed",
                report={
                    "myScore": 1, "opponentScore": 1,
                    "mvpPlayerId": str(P3),
                    "goals": [{"playerId": str(P1), "count": 1}],
                    "assists": [{"playerId": str(P2), "count": 1}],
                    "lineup": [str(P1), str(P2), str(P3), str(P4), str(P10), str(P13)],
                },
                total_fee=Decimal("630.00"), fee_per_player=Decimal("45.00"),
                created_at=days_ago(20), updated_at=days_ago(19),
            ),
            # REC3: Completed — 暴风联队 4:1 银河战舰 (30 days ago)
            MatchRecord(
                id=REC3, match_request_id=None,
                host_team_id=T1, guest_team_id=T4,
                host_team_score=4, guest_team_score=1,
                date=TODAY - timedelta(days=30), time=time(14, 0),
                location="上海市杨浦区五角场体育场", format="8v8",
                duration=90, status="completed",
                report={
                    "myScore": 4, "opponentScore": 1,
                    "mvpPlayerId": str(P2),
                    "goals": [
                        {"playerId": str(P2), "count": 2},
                        {"playerId": str(P1), "count": 1},
                        {"playerId": str(P10), "count": 1},
                    ],
                    "assists": [
                        {"playerId": str(P1), "count": 1},
                        {"playerId": str(P13), "count": 2},
                    ],
                    "lineup": [str(P1), str(P2), str(P3), str(P4), str(P10), str(P13), str(P14)],
                },
                total_fee=Decimal("1050.00"), fee_per_player=Decimal("75.00"),
                created_at=days_ago(30), updated_at=days_ago(29),
            ),
            # REC4: Upcoming — 暴风联队 vs 铁血战士 (2 days later, from MR4)
            MatchRecord(
                id=REC4, match_request_id=MR4,
                host_team_id=T1, guest_team_id=T2,
                host_team_score=None, guest_team_score=None,
                date=days_later(2), time=time(14, 0),
                location="上海市浦东新区世纪公园足球场3号场", format="8v8",
                duration=90, status="upcoming",
                report=None,
                total_fee=Decimal("1050.00"), fee_per_player=Decimal("65.63"),
                created_at=days_ago(1), updated_at=days_ago(1),
            ),
            # REC5: Pending report — 暴风联队 vs 猛龙过江 (3 days ago, need to fill report)
            MatchRecord(
                id=REC5, match_request_id=None,
                host_team_id=T1, guest_team_id=T5,
                host_team_score=None, guest_team_score=None,
                date=TODAY - timedelta(days=3), time=time(16, 0),
                location="上海市闵行区莘庄体育公园足球场", format="7v7",
                duration=90, status="pending_report",
                report=None,
                total_fee=Decimal("690.00"), fee_per_player=Decimal("49.29"),
                created_at=days_ago(5), updated_at=days_ago(3),
            ),
            # REC6: Upcoming — 绿茵风暴 vs 暴风联队 (9 days later, from MR6)
            MatchRecord(
                id=REC6, match_request_id=MR6,
                host_team_id=T3, guest_team_id=T1,
                host_team_score=None, guest_team_score=None,
                date=days_later(9), time=time(15, 30),
                location="上海市静安区静安体育中心3号场", format="8v8",
                duration=90, status="upcoming",
                report=None,
                total_fee=Decimal("1050.00"), fee_per_player=Decimal("65.63"),
                created_at=days_ago(2), updated_at=days_ago(0),
            ),
        ]
        session.add_all(match_records)
        await session.flush()
        print(f"  MatchRecords: {len(match_records)}")

        # ==================================================================
        # 6. BILLS (3 — collecting and completed)
        # ==================================================================
        bills = [
            # B1: Collecting — from REC1 (completed match 10 days ago)
            Bill(
                id=B1, match_record_id=REC1, team_id=T1,
                title="vs 铁血战士 · 3:2 · 世纪公园足球场",
                date=TODAY - timedelta(days=10),
                total_amount=Decimal("1050.00"),
                per_head=Decimal("150.00"),
                paid_count=4, total_count=7,
                status="collecting",
                created_at=days_ago(9), updated_at=days_ago(2),
            ),
            # B2: Completed — from REC2 (completed match 20 days ago)
            Bill(
                id=B2, match_record_id=REC2, team_id=T1,
                title="vs 绿茵风暴 · 1:1 · 静安体育中心",
                date=TODAY - timedelta(days=20),
                total_amount=Decimal("630.00"),
                per_head=Decimal("105.00"),
                paid_count=6, total_count=6,
                status="completed",
                created_at=days_ago(19), updated_at=days_ago(15),
            ),
            # B3: Completed — from REC3 (completed match 30 days ago)
            Bill(
                id=B3, match_record_id=REC3, team_id=T1,
                title="vs 银河战舰 · 4:1 · 五角场体育场",
                date=TODAY - timedelta(days=30),
                total_amount=Decimal("1050.00"),
                per_head=Decimal("150.00"),
                paid_count=7, total_count=7,
                status="completed",
                created_at=days_ago(29), updated_at=days_ago(25),
            ),
        ]
        session.add_all(bills)
        await session.flush()
        print(f"  Bills: {len(bills)}")

        # ==================================================================
        # 7. BILL PLAYERS (B1: partial payment, B2/B3: fully paid)
        # ==================================================================
        bill_players = []

        # B1 — 7 players, 4 paid, 3 unpaid
        b1_players = [
            (P1, "paid", days_ago(8)),
            (P2, "paid", days_ago(7)),
            (P3, "paid", days_ago(9)),
            (P4, "unpaid", None),
            (P10, "paid", days_ago(6)),
            (P13, "unpaid", None),
            (P14, "unpaid", None),
        ]
        for pid, status, paid_at in b1_players:
            bill_players.append(BillPlayer(
                bill_id=B1, player_id=pid, status=status, paid_at=paid_at,
            ))

        # B2 — 6 players, all paid
        b2_players = [P1, P2, P3, P4, P10, P13]
        for i, pid in enumerate(b2_players):
            bill_players.append(BillPlayer(
                bill_id=B2, player_id=pid, status="paid",
                paid_at=days_ago(18 - i),
            ))

        # B3 — 7 players, all paid
        b3_players = [P1, P2, P3, P4, P10, P13, P14]
        for i, pid in enumerate(b3_players):
            bill_players.append(BillPlayer(
                bill_id=B3, player_id=pid, status="paid",
                paid_at=days_ago(28 - i),
            ))

        session.add_all(bill_players)
        await session.flush()
        print(f"  BillPlayers: {len(bill_players)}")

        # ==================================================================
        # 8. TRANSACTIONS (team fund records)
        # ==================================================================
        transactions = [
            Transaction(
                team_id=T1, type="income",
                amount=Decimal("1050.00"), description="vs 铁血战士 比赛收费",
                category="比赛费用", related_match_id=REC1,
                operator=U1, date=TODAY - timedelta(days=10),
                created_at=days_ago(10),
            ),
            Transaction(
                team_id=T1, type="expense",
                amount=Decimal("800.00"), description="世纪公园足球场场地租赁费",
                category="场地费", related_match_id=REC1,
                operator=U1, date=TODAY - timedelta(days=10),
                created_at=days_ago(10),
            ),
            Transaction(
                team_id=T1, type="expense",
                amount=Decimal("200.00"), description="裁判费用",
                category="裁判费", related_match_id=REC1,
                operator=U1, date=TODAY - timedelta(days=10),
                created_at=days_ago(10),
            ),
            Transaction(
                team_id=T1, type="income",
                amount=Decimal("630.00"), description="vs 绿茵风暴 比赛收费",
                category="比赛费用", related_match_id=REC2,
                operator=U1, date=TODAY - timedelta(days=20),
                created_at=days_ago(20),
            ),
            Transaction(
                team_id=T1, type="expense",
                amount=Decimal("600.00"), description="静安体育中心场地租赁费",
                category="场地费", related_match_id=REC2,
                operator=U1, date=TODAY - timedelta(days=20),
                created_at=days_ago(20),
            ),
            Transaction(
                team_id=T1, type="income",
                amount=Decimal("1050.00"), description="vs 银河战舰 比赛收费",
                category="比赛费用", related_match_id=REC3,
                operator=U1, date=TODAY - timedelta(days=30),
                created_at=days_ago(30),
            ),
            Transaction(
                team_id=T1, type="expense",
                amount=Decimal("300.00"), description="球队训练背心采购 (14件)",
                category="装备", related_match_id=None,
                operator=U1, date=TODAY - timedelta(days=15),
                created_at=days_ago(15),
            ),
            Transaction(
                team_id=T1, type="income",
                amount=Decimal("500.00"), description="新赛季队费收取",
                category="队费", related_match_id=None,
                operator=U1, date=TODAY - timedelta(days=5),
                created_at=days_ago(5),
            ),
        ]
        session.add_all(transactions)
        await session.flush()
        print(f"  Transactions: {len(transactions)}")

        # ==================================================================
        # 9. CREDIT HISTORY (for teams T1, T2, T3)
        # ==================================================================
        credit_history = [
            # T1 暴风联队
            CreditHistory(team_id=T1, change=2, reason="完成比赛 vs 铁血战士", date=days_ago(10)),
            CreditHistory(team_id=T1, change=2, reason="完成比赛 vs 绿茵风暴", date=days_ago(20)),
            CreditHistory(team_id=T1, change=2, reason="完成比赛 vs 银河战舰", date=days_ago(30)),
            CreditHistory(team_id=T1, change=5, reason="连续3场比赛完成奖励", date=days_ago(10)),
            CreditHistory(team_id=T1, change=-10, reason="比赛迟到30分钟 vs 猛龙过江", date=days_ago(45)),
            CreditHistory(team_id=T1, change=-5, reason="系统校准初始值", date=days_ago(180)),
            # T2 铁血战士
            CreditHistory(team_id=T2, change=2, reason="完成比赛 vs 暴风联队", date=days_ago(10)),
            CreditHistory(team_id=T2, change=-10, reason="临时取消比赛 (24小时内)", date=days_ago(40)),
            CreditHistory(team_id=T2, change=-20, reason="爽约未到场 vs 绿茵风暴", date=days_ago(55)),
            CreditHistory(team_id=T2, change=2, reason="完成比赛 vs 银河战舰", date=days_ago(60)),
            CreditHistory(team_id=T2, change=10, reason="连续5场比赛完成奖励", date=days_ago(70)),
            # T3 绿茵风暴
            CreditHistory(team_id=T3, change=2, reason="完成比赛 vs 暴风联队", date=days_ago(20)),
            CreditHistory(team_id=T3, change=2, reason="完成比赛 vs 铁血战士", date=days_ago(35)),
            CreditHistory(team_id=T3, change=5, reason="连续3场比赛完成奖励", date=days_ago(35)),
            CreditHistory(team_id=T3, change=2, reason="完成比赛 vs 猛龙过江", date=days_ago(50)),
            # T4 银河战舰
            CreditHistory(team_id=T4, change=2, reason="完成比赛 vs 暴风联队", date=days_ago(30)),
            CreditHistory(team_id=T4, change=-20, reason="爽约未到场 vs 绿茵风暴", date=days_ago(45)),
            CreditHistory(team_id=T4, change=-50, reason="连续两次爽约处罚", date=days_ago(50)),
            CreditHistory(team_id=T4, change=2, reason="完成比赛 vs 猛龙过江", date=days_ago(65)),
            # T5 猛龙过江
            CreditHistory(team_id=T5, change=-50, reason="爽约未到场 vs 铁血战士", date=days_ago(20)),
            CreditHistory(team_id=T5, change=-20, reason="临时取消比赛 (12小时内)", date=days_ago(35)),
            CreditHistory(team_id=T5, change=2, reason="完成比赛 vs 暴风联队", date=days_ago(45)),
        ]
        session.add_all(credit_history)
        await session.flush()
        print(f"  CreditHistory: {len(credit_history)}")

        # ==================================================================
        # 10. TEAM VERIFICATIONS (T1 approved, T2 approved, T4 reviewing)
        # ==================================================================
        verifications = [
            TeamVerification(
                team_id=T1, real_name="张伟", id_card="310101199001011234",
                phone="13800138000", description="暴风联队队长，有3年组队经验",
                id_front_image_id="id_front_zhangwei.jpg",
                id_back_image_id="id_back_zhangwei.jpg",
                team_photo_image_id="team_photo_baofeng.jpg",
                status="approved",
                submitted_at=days_ago(170), reviewed_at=days_ago(168),
            ),
            TeamVerification(
                team_id=T2, real_name="李强", id_card="310101198801021234",
                phone="13900139000", description="铁血战士队长",
                id_front_image_id="id_front_liqiang.jpg",
                id_back_image_id="id_back_liqiang.jpg",
                team_photo_image_id="team_photo_tiexue.jpg",
                status="approved",
                submitted_at=days_ago(140), reviewed_at=days_ago(138),
            ),
            TeamVerification(
                team_id=T4, real_name="马超", id_card="310101199501031234",
                phone="15900159000", description="银河战舰队长，希望尽快通过认证",
                id_front_image_id="id_front_machao.jpg",
                id_back_image_id="id_back_machao.jpg",
                team_photo_image_id=None,
                status="reviewing",
                submitted_at=days_ago(5), reviewed_at=None,
            ),
        ]
        session.add_all(verifications)
        await session.flush()
        print(f"  TeamVerifications: {len(verifications)}")

        # ==================================================================
        # 11. TEAM REPORTS (2 reports)
        # ==================================================================
        reports = [
            TeamReport(
                team_id=T5, reporter_id=U2, reason="恶意爽约",
                description="约好的比赛没来，电话不接微信不回",
                status="resolved", created_at=days_ago(20),
            ),
            TeamReport(
                team_id=T4, reporter_id=U3, reason="虚假信息",
                description="球队资料中的水平与实际差距较大",
                status="pending", created_at=days_ago(10),
            ),
        ]
        session.add_all(reports)
        await session.flush()
        print(f"  TeamReports: {len(reports)}")

        # ==================================================================
        # 12. TEAM INVITES (active invite for T1)
        # ==================================================================
        invites = [
            TeamInvite(
                team_id=T1, invite_code="BF2024ABCD",
                qr_code=None,
                expires_at=NOW + timedelta(days=30),
                created_at=days_ago(2),
            ),
            TeamInvite(
                team_id=T2, invite_code="TX2024EFGH",
                qr_code=None,
                expires_at=NOW + timedelta(days=30),
                created_at=days_ago(5),
            ),
        ]
        session.add_all(invites)
        await session.flush()
        print(f"  TeamInvites: {len(invites)}")

        # ==================================================================
        # 13. CHAT SESSIONS + MESSAGES
        # ==================================================================
        chat_sessions = [
            # AI assistant session
            ChatSession(
                id=CS1,
                participants=[str(U1), str(U15)],
                name="Spot On 助手",
                avatar="",
                last_message="有什么可以帮你的吗？随时问我关于约球、球队管理的问题～",
                last_time=days_ago(0),
                unread_count=1,
                is_ai=True,
                created_at=days_ago(180), updated_at=days_ago(0),
            ),
            # Chat with 李强 (铁血战士 captain)
            ChatSession(
                id=CS2,
                participants=[str(U1), str(U2)],
                name="李强",
                avatar="",
                last_message="好的，周六下午2点世纪公园见！",
                last_time=days_ago(1),
                unread_count=0,
                is_ai=False,
                created_at=days_ago(30), updated_at=days_ago(1),
            ),
            # Chat with 王磊 (绿茵风暴 captain)
            ChatSession(
                id=CS3,
                participants=[str(U1), str(U3)],
                name="王磊",
                avatar="",
                last_message="下周那场比赛你们来几个人？",
                last_time=days_ago(0),
                unread_count=2,
                is_ai=False,
                created_at=days_ago(25), updated_at=days_ago(0),
            ),
        ]
        session.add_all(chat_sessions)
        await session.flush()

        base_ts = int((NOW - timedelta(hours=2)).timestamp() * 1000)
        chat_messages = [
            # AI assistant conversation
            ChatMessage(
                session_id=CS1, sender_id=U15,
                text="你好！我是 Spot On 智能助手 🤖\n我可以帮你查询比赛信息、管理球队、回答约球相关问题。",
                timestamp=base_ts - 3600000, type="text",
                is_read=True, created_at=days_ago(180),
            ),
            ChatMessage(
                session_id=CS1, sender_id=U1,
                text="怎么发起约球？",
                timestamp=base_ts - 3500000, type="text",
                is_read=True, created_at=days_ago(180),
            ),
            ChatMessage(
                session_id=CS1, sender_id=U15,
                text="发起约球很简单！\n1. 点击首页右下角的「发起约球」按钮\n2. 填写比赛时间、地点、场地规格\n3. 设置费用和球队要求\n4. 发布后等待对手接受即可\n\n需要我带你去发起约球吗？",
                timestamp=base_ts - 3400000, type="text",
                is_read=True, created_at=days_ago(180),
            ),
            ChatMessage(
                session_id=CS1, sender_id=U15,
                text="有什么可以帮你的吗？随时问我关于约球、球队管理的问题～",
                timestamp=base_ts, type="text",
                is_read=False, created_at=days_ago(0),
            ),

            # Chat with 李强
            ChatMessage(
                session_id=CS2, sender_id=U1,
                text="李队，周六下午有空吗？想约一场8v8",
                timestamp=base_ts - 7200000, type="text",
                is_read=True, created_at=days_ago(2),
            ),
            ChatMessage(
                session_id=CS2, sender_id=U2,
                text="有空啊！在哪踢？",
                timestamp=base_ts - 7100000, type="text",
                is_read=True, created_at=days_ago(2),
            ),
            ChatMessage(
                session_id=CS2, sender_id=U1,
                text="世纪公园足球场3号场，下午2点开始，踢90分钟",
                timestamp=base_ts - 7000000, type="text",
                is_read=True, created_at=days_ago(2),
            ),
            ChatMessage(
                session_id=CS2, sender_id=U2,
                text="没问题，我这边能来8个人",
                timestamp=base_ts - 6900000, type="text",
                is_read=True, created_at=days_ago(2),
            ),
            ChatMessage(
                session_id=CS2, sender_id=U1,
                text="那我直接在平台上发起约球了，你接一下",
                timestamp=base_ts - 6800000, type="text",
                is_read=True, created_at=days_ago(1),
            ),
            ChatMessage(
                session_id=CS2, sender_id=U2,
                text="好的，周六下午2点世纪公园见！",
                timestamp=base_ts - 6700000, type="text",
                is_read=True, created_at=days_ago(1),
            ),

            # Chat with 王磊
            ChatMessage(
                session_id=CS3, sender_id=U3,
                text="张队，下周那场比赛定了吗？",
                timestamp=base_ts - 5000000, type="text",
                is_read=True, created_at=days_ago(1),
            ),
            ChatMessage(
                session_id=CS3, sender_id=U1,
                text="定了定了，静安体育中心3号场",
                timestamp=base_ts - 4900000, type="text",
                is_read=True, created_at=days_ago(1),
            ),
            ChatMessage(
                session_id=CS3, sender_id=U3,
                text="好的，我们这边8个人没问题",
                timestamp=base_ts - 4800000, type="text",
                is_read=True, created_at=days_ago(0),
            ),
            ChatMessage(
                session_id=CS3, sender_id=U3,
                text="下周那场比赛你们来几个人？",
                timestamp=base_ts - 1000, type="text",
                is_read=False, created_at=days_ago(0),
            ),
            ChatMessage(
                session_id=CS3, sender_id=U3,
                text="我们想确认一下人数好安排",
                timestamp=base_ts, type="text",
                is_read=False, created_at=days_ago(0),
            ),
        ]
        session.add_all(chat_messages)
        await session.flush()
        print(f"  ChatSessions: {len(chat_sessions)}")
        print(f"  ChatMessages: {len(chat_messages)}")

        # ==================================================================
        # 14. VIP PLANS (3 plans matching prototype)
        # ==================================================================
        vip_plans = [
            VipPlan(
                id=VP1, name="month_trial", display_name="月度体验",
                price=Decimal("9.90"), duration_days=30,
                is_active=True, created_at=days_ago(365),
            ),
            VipPlan(
                id=VP2, name="season_card", display_name="季度畅享",
                price=Decimal("49.00"), duration_days=90,
                is_active=True, created_at=days_ago(365),
            ),
            VipPlan(
                id=VP3, name="annual_premium", display_name="年度尊享",
                price=Decimal("199.00"), duration_days=365,
                is_active=True, created_at=days_ago(365),
            ),
        ]
        session.add_all(vip_plans)
        await session.flush()
        print(f"  VipPlans: {len(vip_plans)}")

        # ==================================================================
        # 15. VIP SUBSCRIPTION (main user has active annual VIP)
        # ==================================================================
        subscriptions = [
            VipSubscription(
                id=VS1, user_id=U1, plan_id=VP3,
                status="active",
                start_date=days_ago(60),
                end_date=NOW + timedelta(days=305),
                auto_renew=True,
                payment_method="wechat",
                created_at=days_ago(60), updated_at=days_ago(60),
            ),
        ]
        session.add_all(subscriptions)
        await session.flush()
        print(f"  VipSubscriptions: {len(subscriptions)}")

        # ==================================================================
        # 16. REFRESH TOKEN (for main user login)
        # ==================================================================
        refresh_tok = create_refresh_token(str(U1))
        refresh_tokens = [
            RefreshToken(
                user_id=U1,
                token=refresh_tok,
                expires_at=NOW + timedelta(days=30),
                created_at=NOW,
            ),
        ]
        session.add_all(refresh_tokens)
        await session.flush()
        print(f"  RefreshTokens: {len(refresh_tokens)}")

        # Commit everything
        await session.commit()

    await engine.dispose()

    # Print login credentials
    access_token = create_access_token(str(U1))
    print("\n" + "=" * 60)
    print("SEED DATA COMPLETE!")
    print("=" * 60)
    print(f"\nMain user: 张伟 (VIP Captain)")
    print(f"Phone login: 13800138000")
    print(f"User ID: {U1}")
    print(f"\nAccess Token (for API testing):")
    print(f"  {access_token}")
    print(f"\nRefresh Token:")
    print(f"  {refresh_tok}")
    print(f"\n--- Data Summary ---")
    print(f"  Users:            15")
    print(f"  Teams:             5 (暴风联队, 铁血战士, 绿茵风暴, 银河战舰, 猛龙过江)")
    print(f"  Players:          14")
    print(f"  MatchRequests:     6 (4 open, 2 matched)")
    print(f"  MatchRecords:      6 (3 completed, 1 pending_report, 2 upcoming)")
    print(f"  Bills:             3 (1 collecting, 2 completed)")
    print(f"  BillPlayers:      20")
    print(f"  Transactions:      8")
    print(f"  CreditHistory:    22")
    print(f"  TeamVerifications: 3 (2 approved, 1 reviewing)")
    print(f"  TeamReports:       2")
    print(f"  TeamInvites:       2")
    print(f"  ChatSessions:      3 (1 AI, 2 human)")
    print(f"  ChatMessages:     15")
    print(f"  VipPlans:          3")
    print(f"  VipSubscriptions:  1")
    print(f"\n--- Page Coverage ---")
    print(f"  Login:           phone 13800138000 → main user")
    print(f"  Match Lobby:     4 open match requests from 4 teams")
    print(f"  Match Detail:    view any match request")
    print(f"  Create Match:    main user is VIP captain")
    print(f"  Match Schedule:  2 upcoming + 1 pending_report")
    print(f"  Match History:   3 completed matches with scores/reports")
    print(f"  Team Hub:        暴风联队 with 7 players")
    print(f"  Team Detail:     5 teams with credit history + recent results")
    print(f"  Team Manage:     captain can edit team info")
    print(f"  Team Discovery:  5 teams across Shanghai")
    print(f"  Player Profile:  14 players with full stats")
    print(f"  User Profile:    VIP user with goals/assists/MVP stats")
    print(f"  Bills:           1 collecting (4/7 paid) + 2 completed")
    print(f"  Transactions:    8 records (income + expense)")
    print(f"  Chat:            3 sessions with message history")
    print(f"  VIP Plans:       3 tiers (¥9.9/¥49/¥199)")
    print(f"  VIP Status:      annual premium active")
    print(f"  Verification:    暴风联队 verified, 银河战舰 reviewing")
    print(f"  Team Report:     2 reports (1 resolved, 1 pending)")
    print(f"  Invite:          active invite code BF2024ABCD")


if __name__ == "__main__":
    asyncio.run(seed())
