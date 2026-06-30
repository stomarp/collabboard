# CollabBoard

### Real-Time Collaborative Workspace Platform

CollabBoard is a full-stack collaborative workspace platform where users can create boards, manage Kanban columns and task cards, track activity history, and view live board presence through WebSockets.

The project is designed to demonstrate production-style full-stack engineering with FastAPI, PostgreSQL, SQLAlchemy, Alembic, WebSockets, Next.js, TypeScript, Tailwind CSS, Docker, and JWT-based authentication.

![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688)
![Next.js](https://img.shields.io/badge/Next.js-Frontend-black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791)
![WebSockets](https://img.shields.io/badge/WebSockets-Realtime-6f42c1)
![Docker](https://img.shields.io/badge/Docker-Local%20Dev-2496ED)
![CI](https://img.shields.io/badge/GitHub%20Actions-CI-2088FF)

---

## Executive Summary

CollabBoard is not a simple CRUD task board. It is a production-style collaboration system built around authenticated users, board-level access, task management, activity logging, and real-time presence.

The project is being built incrementally through focused pull requests to show real engineering process: database modeling, backend API design, frontend product flows, WebSocket architecture, Dockerized development, and future CI/CD deployment.

---

## Problem Statement

Modern teams need lightweight collaboration tools that support task ownership, live updates, secure board access, and clear visibility into what changed. Many basic Kanban apps only show static task cards and do not demonstrate the backend architecture required for real-time multi-user collaboration.

CollabBoard solves this by combining:

- Authenticated user flows
- Board and task management
- Activity/audit history
- WebSocket-powered live presence
- Production-style backend and frontend structure

---

## Solution Overview

CollabBoard provides a complete team workspace flow:

1. Users register or log in.
2. Users create boards from a protected dashboard.
3. Users open a board workspace.
4. Users create columns such as To Do, In Progress, and Done.
5. Users create, edit, and delete task cards.
6. The system records board activity automatically.
7. The board page shows recent activity history.
8. WebSocket presence shows realtime board connection status and viewer count.
9. Redis pub/sub broadcasts realtime task, column, comment, and movement events across connected board clients.

---

## Key Capabilities

### Authentication and Access

- User registration
- User login
- JWT access tokens
- Protected dashboard
- Board membership validation
- Owner/editor/viewer role foundation

### Board and Task Management

- Create boards
- View board list
- Open board workspace
- Create columns
- Create tasks
- Edit task title, description, and priority
- Drag tasks within and across columns
- Add and delete task comments
- Delete tasks
- Delete columns and remove related tasks from the UI

### Activity History

- Board activity log API
- Activity feed on the board page
- Tracks board, column, and task events
- User-friendly event labels and timestamps

### Real-Time Foundation

- Secure WebSocket endpoint
- JWT validation for WebSocket clients
- Board-level WebSocket rooms
- Redis pub/sub event broadcasting
- Live connection status
- Live board viewer count
- Realtime column, task, movement, and comment updates
- Reconnect behavior on the frontend

---

## End-to-End User Journey

1. Open the app homepage.
2. Register a new account.
3. Log in with the created account.
4. Open the protected dashboard.
5. Create a new board.
6. Open the board workspace.
7. Create workflow columns.
8. Create task cards with priority and description.
9. Edit, delete, comment on, and move task cards.
10. Drag tasks within a column or across columns.
11. Review board activity history.
12. Open the same board in another browser tab.
13. Confirm live presence, realtime task sync, realtime comment sync, and movement updates.

---

## Tech Stack

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- WebSocket client
- Protected client-side routes
- Local token storage

### Backend

- FastAPI
- SQLAlchemy
- Alembic
- Pydantic
- PostgreSQL
- JWT authentication
- WebSocket ConnectionManager

### Infrastructure and Tooling

- Docker Compose
- PostgreSQL local service
- Redis local service
- Git and GitHub pull request workflow
- PR readiness script
- GitHub Actions CI
- Planned Render backend deployment
- Planned Vercel frontend deployment

---

## System Architecture

```text
Browser / Next.js Frontend
  |
  | REST API calls
  | - auth
  | - boards
  | - columns
  | - tasks
  | - comments
  | - activity
  |
  | WebSocket connection
  | - live board presence
  v

FastAPI Backend
  |
  | SQLAlchemy ORM
  | Alembic migrations
  v

PostgreSQL
  |
  | Realtime event broadcasting layer
  v

Redis Pub/Sub
```

---

## Data Flow

### Board Creation Flow

```text
User submits board form
  |
Next.js calls POST /boards
  |
FastAPI validates JWT
  |
Backend creates personal workspace if needed
  |
Backend creates board and board membership
  |
PostgreSQL stores board data
  |
Dashboard updates board list
```

### Task Creation Flow

```text
User submits task form
  |
Next.js calls POST /boards/{board_id}/tasks
  |
FastAPI validates board role
  |
Backend creates task in selected column
  |
Backend writes activity log
  |
PostgreSQL stores task and activity
  |
Board UI updates task card list
  |
Activity feed refreshes
```

### WebSocket Presence Flow

```text
User opens board page
  |
Frontend opens /ws/boards/{board_id}?token=<JWT>
  |
FastAPI validates token and board access
  |
ConnectionManager adds socket to board room
  |
Backend sends connection.established
  |
Backend broadcasts presence.changed
  |
Frontend updates live viewer count
```

---

## API Surface

### Auth

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/register` | Create user account |
| POST | `/auth/login` | Login and receive JWT |
| GET | `/auth/me` | Load current authenticated user |

### Boards

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/boards` | List boards for current user |
| POST | `/boards` | Create board |
| GET | `/boards/{board_id}` | Get board detail |
| PATCH | `/boards/{board_id}` | Update board |
| DELETE | `/boards/{board_id}` | Delete board |

### Columns

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/boards/{board_id}/columns` | List board columns |
| POST | `/boards/{board_id}/columns` | Create column |
| PATCH | `/columns/{column_id}` | Update column |
| DELETE | `/columns/{column_id}` | Delete column |

### Tasks

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/boards/{board_id}/tasks` | List board tasks |
| POST | `/boards/{board_id}/tasks` | Create task |
| GET | `/tasks/{task_id}` | Get task detail |
| PATCH | `/tasks/{task_id}` | Update task |
| PATCH | `/tasks/{task_id}/move` | Move task between columns and positions |
| DELETE | `/tasks/{task_id}` | Delete task |

### Comments

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/tasks/{task_id}/comments` | List task comments |
| POST | `/tasks/{task_id}/comments` | Create task comment |
| DELETE | `/comments/{comment_id}` | Delete task comment |

### Activity

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/boards/{board_id}/activity` | List recent board activity |

### Realtime

| Protocol | Endpoint | Purpose |
|---|---|---|
| WebSocket | `/ws/boards/{board_id}?token=<JWT>` | Connect to board room for realtime events |

---

## Frontend Routes

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Product landing page |
| `/login` | Public | Login page |
| `/register` | Public | Registration page |
| `/dashboard` | Protected | Board dashboard |
| `/boards/[boardId]` | Protected | Board workspace with Kanban UI, presence, and activity |

---

## Local Development

Start local services:

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

Only remove volumes when you intentionally want a clean database:

```bash
docker compose down -v
```

---

## Local Services

| Service | Host URL |
|---|---|
| Backend API | `http://localhost:8000` |
| Frontend | `http://localhost:3000` |
| PostgreSQL | `localhost:55432` |
| Redis | `localhost:6379` |
| FastAPI Docs | `http://localhost:8000/docs` |

PostgreSQL uses host port `55432` to avoid conflicts with local PostgreSQL services that may already use `5432` or `5433`.

---

## Environment Variables

Backend Docker Compose provides local development values for:

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

---

## Quality Checks

GitHub Actions CI runs on pull requests and pushes to `main`.

The CI workflow checks:

- Backend Python compilation
- Frontend dependency installation
- Frontend linting
- Frontend production build
- Docker Compose config validation

Run the PR readiness check before committing feature work:

```bash
bash scripts/check_pr_ready.sh
```

The check:

- Cleans text files
- Verifies whitespace
- Builds Docker services
- Waits for backend health
- Applies Alembic migrations

Expected final output:

```text
PR readiness checks passed.
```

You can also run frontend checks directly:

```bash
cd frontend
npm run lint
npm run build
```

---

## QA Checklist

A detailed realtime QA checklist is available here:

- [`docs/REALTIME_QA_CHECKLIST.md`](docs/REALTIME_QA_CHECKLIST.md)

---

## Demo Script

Use this sequence to demo the project:

1. Start the app with Docker Compose.
2. Open `http://localhost:3000`.
3. Register a new user.
4. Log in and open the dashboard.
5. Create a board.
6. Open the board workspace.
7. Create columns: To Do, In Progress, Done.
8. Create a few tasks with priority and description.
9. Edit a task.
10. Delete a task.
11. Delete a column.
12. Add and delete task comments.
13. View the activity feed.
14. Drag tasks within a column or across columns.
15. Open the same board in two browser tabs.
16. Confirm the live board viewer count, comments, and task movement updates.

---

## Current Status

Implemented:

- Monorepo setup
- FastAPI backend
- Next.js frontend
- PostgreSQL schema and Alembic migrations
- JWT authentication
- Board CRUD API
- Column CRUD API
- Task CRUD API
- Task comments API
- Activity logs backend
- Auth UI
- Protected dashboard
- Static Kanban board UI
- Board management UI
- Board activity feed UI
- Secure WebSocket ConnectionManager backend
- Redis pub/sub realtime backend
- Frontend WebSocket presence UI
- Frontend realtime board sync
- Drag-and-drop task movement backend and UI
- Frontend task comments UI
- Realtime QA checklist
- Dockerized local development
- PR readiness script
- GitHub Actions CI workflow

Not shipped yet:

- Production deployment
- README screenshots
- Architecture diagram
- Board invite/member management UI
- Online avatars and richer presence UI
- Mentions and notifications

Deployment status:

- Local development is fully Dockerized.
- Production backend and frontend deployment are planned next.
- Live demo links will be added only after deployment is complete.

---

## Roadmap

The checklist below tracks merged project milestones. PR numbers match GitHub pull request numbers; any gaps reflect GitHub numbering across opened, draft, or closed PRs.

### Phase 1 - Project Setup

- [x] PR #1: Initialize monorepo with backend and frontend setup
- [x] PR #3: FastAPI backend health check
- [x] PR #4: Next.js frontend scaffold
- [x] PR #9: Repository quality guardrails
- [x] PR #17: README product polish

### Phase 2 - Auth and Database

- [x] PR #5: SQLAlchemy models and Alembic migrations
- [x] PR #6: JWT auth endpoints
- [x] PR #11: Auth UI and protected dashboard frontend

### Phase 3 - Core Board Features

- [x] PR #7: Board CRUD API
- [x] PR #8: Column and task CRUD API
- [x] PR #10: Activity logs backend
- [x] PR #12: Static Kanban board UI
- [x] PR #13: Board management UI for editing and deleting tasks and columns
- [x] PR #14: Board activity feed UI

### Phase 4 - Real-Time Collaboration

- [x] PR #15: WebSocket ConnectionManager backend
- [x] PR #16: Frontend WebSocket presence UI
- [x] PR #18: Redis pub/sub realtime backend
- [x] PR #19: Realtime task and column event broadcasting backend
- [x] PR #20: Frontend realtime board sync
- [x] PR #21: Task movement backend API
- [x] PR #22: Drag-and-drop task movement UI
- [x] PR #23: Realtime QA checklist and demo polish

### Phase 5 - Comments and Collaboration

- [x] PR #24: Task comments backend API
- [x] PR #25: Frontend task comments UI
- [ ] Board invite/member management
- [ ] Online avatars and richer presence UI
- [ ] Mentions and notifications

### Phase 6 - Ship Readiness

- [x] PR #27: GitHub Actions CI workflow
- [ ] Production backend deployment
- [ ] Production frontend deployment
- [ ] README screenshots
- [ ] Architecture diagram
- [ ] Live demo link after deployment

---

## Resume Positioning

CollabBoard is intended to show engineering depth beyond simple CRUD apps and AI wrappers:

- Real-time systems
- WebSocket architecture
- PostgreSQL schema design
- Authentication and authorization
- Role-based board access
- Activity/audit logging
- Multi-user collaboration
- Full-stack product development
- Dockerized local development
- CI/CD and deployment readiness

### Resume Bullet

Built CollabBoard, a full-stack real-time collaborative workspace platform using FastAPI, PostgreSQL, SQLAlchemy, Alembic, WebSockets, Next.js, TypeScript, and Docker; implemented JWT authentication, protected dashboards, board/column/task CRUD, activity logs, live board presence, and a production-style PR-driven development workflow.

---

## Project Goal

The goal of CollabBoard is to demonstrate that this is not just a UI clone or simple task tracker. It is a realistic collaboration platform with backend depth, realtime architecture, database design, frontend product flows, and a roadmap toward scalable multi-user synchronization.
