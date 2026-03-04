"""API v1 router aggregation.

Mounts all endpoint routers under the ``/api/v1`` namespace.
"""

from fastapi import APIRouter

api_router = APIRouter()

# Import all endpoint routers
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.users import router as users_router
from app.api.v1.endpoints.teams import router as teams_router
from app.api.v1.endpoints.players import router as players_router
from app.api.v1.endpoints.matches import router as matches_router
from app.api.v1.endpoints.bills import router as bills_router
from app.api.v1.endpoints.transactions import router as transactions_router
from app.api.v1.endpoints.chats import router as chats_router
from app.api.v1.endpoints.vip import router as vip_router

api_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
api_router.include_router(users_router, prefix="/users", tags=["Users"])
# teams_router and players_router define their own prefix internally
api_router.include_router(teams_router, tags=["Teams"])
api_router.include_router(players_router, tags=["Players"])
api_router.include_router(matches_router, prefix="/matches", tags=["Matches"])
# bills_router and transactions_router mix /teams/ and /bills/ paths; no prefix
api_router.include_router(bills_router, tags=["Bills"])
api_router.include_router(transactions_router, tags=["Transactions"])
api_router.include_router(chats_router, prefix="/chats", tags=["Chats"])
api_router.include_router(vip_router, prefix="/vip", tags=["VIP"])
