import uuid

from app.sockets.server import sio
from app.utils.security import verify_access_token
from app.database import AsyncSessionLocal
from app.models.user import User
from sqlalchemy import select


async def _authenticate_socket(auth: dict) -> str | None:
    """Validate JWT from socket auth dict and return user_id string, or None."""
    if not auth:
        return None
    token = auth.get("token") or auth.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return None

    payload = verify_access_token(token)
    if not payload:
        return None

    user_id_str = payload.get("sub")
    if not user_id_str:
        return None

    # Validate user exists in DB
    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        return None

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))  # noqa: E712
        user = result.scalar_one_or_none()
        if not user:
            return None

    return user_id_str


@sio.event
async def connect(sid: str, environ: dict, auth: dict = None):
    """Handle new socket connection. Validates JWT."""
    user_id = await _authenticate_socket(auth or {})
    if not user_id:
        # Reject connection
        return False

    # Store user_id in session
    await sio.save_session(sid, {"user_id": user_id})

    # Join personal room for targeted notifications
    await sio.enter_room(sid, f"user:{user_id}")

    print(f"[Socket] Connected: sid={sid}, user={user_id}")


@sio.event
async def disconnect(sid: str):
    """Handle socket disconnection."""
    session = await sio.get_session(sid)
    user_id = session.get("user_id") if session else None
    print(f"[Socket] Disconnected: sid={sid}, user={user_id}")


@sio.event
async def join_project(sid: str, data: dict):
    """Join a project room to receive real-time updates."""
    session = await sio.get_session(sid)
    if not session or not session.get("user_id"):
        return {"error": "Not authenticated"}

    project_id = data.get("project_id")
    if not project_id:
        return {"error": "project_id required"}

    # Validate membership
    user_id_str = session["user_id"]
    try:
        user_id = uuid.UUID(user_id_str)
        pid = uuid.UUID(str(project_id))
    except ValueError:
        return {"error": "Invalid IDs"}

    from app.models.project import ProjectMember
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == pid,
                ProjectMember.user_id == user_id,
            )
        )
        member = result.scalar_one_or_none()
        if not member:
            return {"error": "Not a member of this project"}

    room = f"project:{project_id}"
    await sio.enter_room(sid, room)
    print(f"[Socket] sid={sid} joined room {room}")
    return {"success": True, "room": room}


@sio.event
async def leave_project(sid: str, data: dict):
    """Leave a project room."""
    project_id = data.get("project_id")
    if not project_id:
        return {"error": "project_id required"}

    room = f"project:{project_id}"
    await sio.leave_room(sid, room)
    print(f"[Socket] sid={sid} left room {room}")
    return {"success": True}
