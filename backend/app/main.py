from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Import all models before create_all so their tables are registered with Base.metadata.
import app.models  # noqa: F401
from app.core.config import settings
from app.core.errors import DomainError
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.routers.chat import router as chat_router
from app.routers.meetings import router as meetings_router
from app.routers.participants import router as participants_router
from app.routers.phone import router as phone_router
from app.routers.users import router as users_router
from app.routers.whiteboards import meeting_router as meeting_whiteboards_router
from app.routers.whiteboards import router as whiteboards_router
from app.routers.auth import router as auth_router
from app.routers.signaling import router as signaling_router
from app.routers.scheduler import router as scheduler_router
from app.routers.team_chat import router as team_chat_router
from app.seed import seed_database, seed_phone, seed_scheduler, seed_team_chat, seed_whiteboards
from app.models.user import User
from sqlalchemy import func, select
from sqlalchemy import inspect, text


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Create database tables before serving requests."""
    Base.metadata.create_all(bind=engine)
    if "password_hash" not in {column["name"] for column in inspect(engine).get_columns("users")}:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)"))
    user_columns = {column["name"] for column in inspect(engine).get_columns("users")}
    for column_name, column_type in (
        ("department", "VARCHAR(120)"),
        ("job_title", "VARCHAR(120)"),
        ("location", "VARCHAR(120)"),
        ("phone", "VARCHAR(40)"),
    ):
        if column_name not in user_columns:
            with engine.begin() as connection:
                connection.execute(
                    text(f"ALTER TABLE users ADD COLUMN {column_name} {column_type}")
                )
    if "message_type" not in {
        column["name"] for column in inspect(engine).get_columns("chat_messages")
    }:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE chat_messages ADD COLUMN "
                    "message_type VARCHAR(16) NOT NULL DEFAULT 'user'"
                )
            )
    meeting_columns = {column["name"] for column in inspect(engine).get_columns("meetings")}
    for column_name, definition in (
        ("is_locked", "BOOLEAN NOT NULL DEFAULT 0"),
        ("chat_enabled", "BOOLEAN NOT NULL DEFAULT 1"),
    ):
        if column_name not in meeting_columns:
            with engine.begin() as connection:
                connection.execute(
                    text(f"ALTER TABLE meetings ADD COLUMN {column_name} {definition}")
                )
    with SessionLocal() as db:
        if db.scalar(select(func.count(User.id))) == 0:
            seed_database(db)
        else:
            seed_whiteboards(db, 1)
            seed_team_chat(db)
            seed_phone(db, 1)
            seed_scheduler(db, 1)
    yield


app = FastAPI(lifespan=lifespan)


@app.exception_handler(DomainError)
async def domain_error_handler(_, exc: DomainError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_origin_regex=r"^https://(?:[A-Za-z0-9-]+\.)*vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(meetings_router)
app.include_router(participants_router)
app.include_router(chat_router)
app.include_router(users_router)
app.include_router(whiteboards_router)
app.include_router(meeting_whiteboards_router)
app.include_router(auth_router)
app.include_router(signaling_router)
app.include_router(team_chat_router)
app.include_router(phone_router)
app.include_router(scheduler_router)


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
