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
- JWT Authentication
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

Remove volumes if you want a clean database:

```bash
docker compose down -v
```

## Local Services

| Service | Host URL |
|---|---|
| PostgreSQL | localhost:55432 |
| Redis | localhost:6379 |

PostgreSQL uses host port `55432` to avoid conflicts with other local PostgreSQL services that may already use `5432` or `5433`.

## Environment Variables

Copy `.env.example` when local app code is added:

```bash
cp .env.example .env
```

Current local database URL:

```env
DATABASE_URL=postgresql+psycopg://collabboard:collabboard@localhost:55432/collabboard_dev
```

Current Redis URL:

```env
REDIS_URL=redis://localhost:6379/0
```

## Testing Infrastructure

Test Redis:

```bash
docker exec -it collabboard-redis redis-cli ping
```

Expected response:

```text
PONG
```

Test PostgreSQL:

```bash
docker exec -it collabboard-postgres psql -U collabboard -d collabboard_dev -c "SELECT version();"
```

## Project Structure

```text
collabboard/
├── backend/
├── frontend/
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

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

### Phase 1 — Project Setup

- [x] PR #1: Initialize monorepo with backend and frontend setup
- [x] PR #2: FastAPI app skeleton with health check setup
- [ ] PR #3: Next.js frontend scaffold setup

### Phase 2 — Auth & Database

- [ ] PR #4: SQLAlchemy models + Alembic migrations backend
- [ ] PR #5: JWT register + login endpoints backend
- [ ] PR #6: Auth UI — login and register pages frontend

### Phase 3 — Core Board Features

- [ ] PR #7: Board CRUD REST API backend
- [ ] PR #8: Task and column CRUD API backend
- [ ] PR #9: Dashboard UI — board list + create board frontend
- [ ] PR #10: Static Kanban board UI frontend

### Phase 4 — Real-Time Collaboration

- [ ] PR #11: WebSocket ConnectionManager + Redis pub/sub
- [ ] PR #12: task_moved and task_created WebSocket events
- [ ] PR #13: Drag-and-drop UI with live sync
- [ ] PR #14: Presence — live cursors and online avatars

### Phase 5 — Polish and Ship

- [ ] PR #15: Activity log + notifications backend
- [ ] PR #16: Board member invite system backend
- [ ] PR #17: CI/CD with GitHub Actions
- [ ] PR #18: Production deploy + README polish

## Current PR

### PR #1 — Initialize CollabBoard Monorepo

This PR adds:

- Root monorepo structure
- `backend/` directory placeholder
- `frontend/` directory placeholder
- `.gitignore`
- `.env.example`
- `docker-compose.yml`
- PostgreSQL service
- Redis service
- README project skeleton

This PR intentionally does not include FastAPI or Next.js application code. Those will be added in PR #2 and PR #3.

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

**CollabBoard — Real-Time Collaborative Workspace Platform**  
Built a multi-user task management platform with FastAPI, WebSockets, Redis pub/sub, PostgreSQL, and Next.js, supporting live task movement, online presence, role-based board access, activity logs, and production-style Dockerized development.

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
