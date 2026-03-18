from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

# Import socket handlers to register them (side-effect import)
import app.sockets.handlers  # noqa: F401

from app.sockets.server import socket_app
from app.routers.auth import router as auth_router
from app.routers.projects import router as projects_router
from app.routers.members import router as members_router
from app.routers.statuses import router as statuses_router
from app.routers.tasks import router as tasks_router
from app.routers.labels import router as labels_router
from app.routers.comments import router as comments_router
from app.routers.notifications import router as notifications_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting Project Manager API...")
    yield
    # Shutdown
    print("Shutting down Project Manager API...")


app = FastAPI(
    title="Project Manager API",
    description="Real-time project management backend with FastAPI and Socket.IO",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all API routers under /api prefix
API_PREFIX = "/api"

app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(projects_router, prefix=API_PREFIX)
app.include_router(members_router, prefix=API_PREFIX)
app.include_router(statuses_router, prefix=API_PREFIX)
app.include_router(tasks_router, prefix=API_PREFIX)
app.include_router(labels_router, prefix=API_PREFIX)
app.include_router(comments_router, prefix=API_PREFIX)
app.include_router(notifications_router, prefix=API_PREFIX)


@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "project-manager-api"}


# Mount the Socket.IO ASGI app
# All socket.io traffic goes to /socket.io/
app.mount("/", socket_app)
