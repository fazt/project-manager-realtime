# Project Manager Realtime

A full-stack project management application with real-time collaboration powered by WebSockets.

## Tech Stack

**Backend:**
- Python 3.12+ / FastAPI / Uvicorn
- SQLAlchemy (async) + AsyncPG + PostgreSQL
- Socket.IO for real-time events
- Alembic for database migrations
- JWT authentication (access + refresh tokens)

**Frontend:**
- React 19 + TypeScript + Vite 8
- Tailwind CSS 4 + shadcn/ui
- Zustand for state management
- Socket.IO Client for real-time updates
- React Hook Form + Zod for validation
- dnd-kit for drag & drop (Kanban board)

## Features

- User authentication (register/login) with JWT
- Project CRUD with member management and roles
- Task management with custom statuses, labels, and assignments
- Kanban board with drag & drop
- Calendar and list views
- Task comments
- Real-time notifications via WebSockets
- Responsive design

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL 16+ (or Docker)

### Database Setup

Start PostgreSQL with Docker:

```bash
cd backend
docker compose up -d
```

### Backend

```bash
cd backend

# Install dependencies
uv sync

# Run migrations
uv run alembic upgrade head

# Start the server
uv run uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

### Environment Variables

Copy the example and adjust as needed:

```bash
cp backend/.env.example backend/.env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:postgres@localhost:5491/project_manager` | PostgreSQL connection string |
| `SECRET_KEY` | `super-secret-key-change-in-production` | JWT signing key |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access token TTL |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token TTL |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | Allowed CORS origins (supports `*`, JSON array, or comma-separated) |

**Frontend** (`frontend/.env` or `frontend/.env.production`):

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000/api` | Backend API base URL |
| `VITE_WS_URL` | `http://localhost:8000` | WebSocket server URL |

> Frontend env vars are replaced at **build time** by Vite. For production, configure `frontend/.env.production`.

## Deployment

**Backend** is deployed on [Seenode](https://www.seenode.com/). Set environment variables in the Seenode dashboard.

**Frontend** is deployed on [Cloudflare Pages](https://pages.cloudflare.com/) connected to GitHub. Build settings:
- **Build command:** `cd frontend && npm install && npm run build`
- **Build output directory:** `frontend/dist`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| CRUD | `/api/projects` | Project management |
| CRUD | `/api/projects/:id/members` | Member management |
| CRUD | `/api/projects/:id/statuses` | Custom task statuses |
| CRUD | `/api/projects/:id/tasks` | Task management |
| CRUD | `/api/projects/:id/labels` | Task labels |
| CRUD | `/api/tasks/:id/comments` | Task comments |
| GET | `/api/notifications` | User notifications |
| GET | `/health` | Health check |

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── models/        # SQLAlchemy models
│   │   ├── routers/       # API route handlers
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # Business logic
│   │   ├── sockets/       # Socket.IO handlers
│   │   └── utils/         # Helpers (security, etc.)
│   ├── alembic/           # Database migrations
│   └── docker-compose.yml
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Route pages
│   │   ├── stores/        # Zustand stores
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # API client, utils
│   │   └── types/         # TypeScript types
│   └── public/
└── README.md
```

## License

MIT
