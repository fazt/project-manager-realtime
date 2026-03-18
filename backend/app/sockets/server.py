import socketio

from app.config import settings

# Create the AsyncServer in ASGI mode
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.CORS_ORIGINS,
    logger=False,
    engineio_logger=False,
)

# Wrap as ASGI app for mounting
socket_app = socketio.ASGIApp(sio, socketio_path="/socket.io")
