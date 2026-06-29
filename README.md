# CollabBoard

CollabBoard is a real-time collaborative workspace platform where teams can create boards, manage tasks, drag cards across columns, see live updates, track online presence, and review activity history.

This project is designed to demonstrate production-style full-stack engineering with FastAPI, PostgreSQL, Redis, WebSockets, Next.js, TypeScript, Docker, and CI/CD.

## Why This Project Exists

CollabBoard is not just a basic CRUD task board. The main engineering challenge is real-time collaboration:

- Multiple users viewing and editing the same board
- Live task movement across columns
- WebSocket event broadcasting
- Redis pub/sub for scalable real-time updates
- Online presence and cursor tracking
- Role-based access control
- Persistent activity logs
- Production-style backend and frontend architecture

The goal is to build a portfolio-quality project that shows backend depth, real-time systems knowledge, database design, and product thinking.

## Planned Tech Stack

### Backend

- FastAPI
- PostgreSQL
- SQLAlchemy
- Alembic
- Pydantic
- Redis
- WebSockets
- JWT authentication
- Pytest

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- dnd-kit
- WebSocket client hooks
- Protected routes

### DevOps

- Docker Compose
- GitHub Actions
- Render backend deployment
- Vercel frontend deployment

## Planned Features

- User registration and login
- JWT-based authentication
- Workspace and board management
- Kanban columns and task cards
- Drag-and-drop task movement
- Real-time board updates
- Redis pub/sub event broadcasting
- Online user presence
- Comments and mentions
- Activity log and notifications
- Board member roles: owner, editor, viewer
- CI/CD pipeline
- Production deployment

## Local Development

Start local infrastructure:

```bash
docker compose up -d
```

Check running containers:

```bash
docker compose ps
```

Stop services:

```bash
docker compose down
```

Remove volumes only when you intentionally want a clean database:

```bash
docker compose down -v
```

## Local Services

| Service | Host URL |
|---|---|
| Backend API | http://localhost:8000 |
| Frontend | http://localhost:3000 |
| PostgreSQL | localhost:55432 |
| Redis | localhost:6379 |

PostgreSQL uses host port `55432` to avoid conflicts with other local PostgreSQL services that may already use `5432` or `5433`.

## Environment Variables

Backend Docker Compose currently provides local values for:

```env
DATABASE_URL=postgresql+psycopg://collabboard:collabboard@postgres:5432/collabboard_dev
REDIS_URL=redis://redis:6379/0
JWT_SECRET_KEY=change-me-in-development
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

Frontend local environment example:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=CollabBoard
```

## Quality Checks

Run the PR readiness check before committing feature work:

```bash
bash scripts/check_pr_ready.sh
```

The check cleans text files, verifies whitespace, builds Docker services, waits for backend health, and applies Alembic migrations.

Expected final output:

```text
PR readiness checks passed.
```

## Backend API

The backend service is a FastAPI application.

Local API:

```text
http://localhost:8000
```

Health check:

```text
GET /health
```

Expected response:

```json
{
  "status": "ok",
  "service": "CollabBoard API",
  "environment": "development"
}
```

FastAPI docs:

```text
http://localhost:8000/docs
```

## Implemented APIs

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Boards

- `GET /boards`
- `POST /boards`
- `GET /boards/{board_id}`
- `PATCH /boards/{board_id}`
- `DELETE /boards/{board_id}`

### Columns

- `GET /boards/{board_id}/columns`
- `POST /boards/{board_id}/columns`
- `PATCH /columns/{column_id}`
- `DELETE /columns/{column_id}`

### Tasks

- `GET /boards/{board_id}/tasks`
- `POST /boards/{board_id}/tasks`
- `GET /tasks/{task_id}`
- `PATCH /tasks/{task_id}`
- `DELETE /tasks/{task_id}`

### Activity

- `GET /boards/{board_id}/activity`

## Implemented Frontend

### Public Pages

- `/`
- `/login`
- `/register`

### Protected Pages

- `/dashboard`

### Frontend Features

- Login form
- Registration form
- JWT token storage
- Protected dashboard redirect
- Current user loading through `GET /auth/me`
- Board list loading through `GET /boards`
- Create board form through `POST /boards`
- Logout flow

## Architecture Preview

```text
Frontend: Next.js + TypeScript
  |
  | REST APIs for CRUD
  | WebSockets for live board updates
  v
Backend: FastAPI
  |
  | Persistent data
  v
PostgreSQL
  |
  | Real-time events, presence, pub/sub
  v
Redis
```

## Real-Time Update Flow

Example: a user drags a task from `Todo` to `In Progress`.

```text
User moves task
  |
Frontend sends WebSocket event
  |
FastAPI validates board access
  |
Backend updates PostgreSQL
  |
Backend publishes event to Redis
  |
Redis broadcasts to board channel
  |
Connected users receive update
  |
Frontend updates board instantly
```

Example WebSocket event:

```json
{
  "type": "task_moved",
  "board_id": "board_uuid",
  "task_id": "task_uuid",
  "from_column_id": "todo_column_uuid",
  "to_column_id": "progress_column_uuid",
  "new_position": 2
}
```

## Roadmap

### Phase 1 - Project Setup

- [x] PR #1: Initialize monorepo with backend and frontend setup
- [x] PR #2: FastAPI app skeleton with health check setup
- [x] PR #3: Next.js frontend scaffold setup

### Phase 2 - Auth and Database

- [x] PR #4: SQLAlchemy models and Alembic migrations backend
- [x] PR #5: JWT register and login endpoints backend
- [x] PR #11: Auth UI and protected dashboard frontend

### Phase 3 - Core Board Features

- [x] PR #7: Board CRUD REST API backend
- [x] PR #8: Task and column CRUD API backend
- [x] PR #10: Activity logs backend
- [x] PR #11: Dashboard UI with board list and create board frontend
- [x] PR #12: Static Kanban board UI frontend
- [x] PR #13: Board management UI for editing and deleting tasks and columns
- [x] PR #14: Board activity feed UI frontend

### Phase 4 - Real-Time Collaboration

- [x] PR #15: WebSocket ConnectionManager backend
- [ ] Redis pub/sub event broadcasting
- [ ] `task_moved` and `task_created` events
- [ ] Drag-and-drop UI with live sync
- [ ] Presence: online avatars and live board viewers

### Phase 5 - Polish and Ship

- [ ] Comments and mentions
- [ ] Board member invite system
- [ ] GitHub Actions CI/CD
- [ ] Production deploy
- [ ] README screenshots and architecture diagram

## Current PR

### PR #15 - WebSocket Connection Manager Backend

This PR starts the real-time collaboration foundation for CollabBoard by adding a secure WebSocket endpoint and board-level connection manager.

#### What it includes

- Adds reusable `ConnectionManager` service
- Tracks active WebSocket connections by board
- Adds secure WebSocket endpoint at `/ws/boards/{board_id}`
- Authenticates WebSocket clients using JWT query token
- Validates active user before accepting the socket
- Validates board membership before joining a board room
- Sends `connection.established` event after successful connection
- Broadcasts `presence.changed` when users connect or disconnect
- Adds basic `client.message` broadcast foundation
- Includes realtime router in FastAPI app

#### Local checks

- Backend Python compile check passed
- Repository readiness script passed

#### Notes

This PR intentionally does not add Redis pub/sub, drag-and-drop events, frontend WebSocket client, or live presence UI yet. Those will be added in later PRs.

## Resume Positioning

CollabBoard is intended to show real engineering skills beyond AI wrappers:

- Real-time systems
- WebSocket architecture
- Redis pub/sub
- PostgreSQL schema design
- Authentication and authorization
- Multi-user collaboration
- Scalable backend architecture
- Full-stack product development
- Dockerized local development
- CI/CD and deployment readiness

## Future Resume Bullet

**CollabBoard - Real-Time Collaborative Workspace Platform**

Built a multi-user task management platform with FastAPI, WebSockets, Redis pub/sub, PostgreSQL, and Next.js, supporting live task movement, online presence, role-based board access, activity logs, and production-style Dockerized development.
