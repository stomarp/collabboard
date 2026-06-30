# CollabBoard Realtime QA Checklist

This checklist validates the core realtime collaboration demo for CollabBoard.

## Setup

Start local services:

```bash
docker compose up -d
```

Open the frontend:

```text
http://localhost:3000
```

Open the backend health endpoint:

```text
http://localhost:8000/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "CollabBoard API",
  "environment": "development"
}
```

## Demo Accounts

Use one or two browser sessions:

- Browser tab 1: normal window
- Browser tab 2: another tab, another browser, or incognito window

## Realtime Presence

- [ ] Log in and open a board in tab 1.
- [ ] Confirm Presence panel shows connected status.
- [ ] Open the same board in tab 2.
- [ ] Confirm viewer count increases.
- [ ] Close tab 2.
- [ ] Confirm viewer count decreases after disconnect.

## Column Realtime Sync

- [ ] Create a column in tab 1.
- [ ] Confirm the column appears in tab 2.
- [ ] Delete a column in tab 1.
- [ ] Confirm the column disappears in tab 2.
- [ ] Confirm tasks inside the deleted column are removed from both tabs.

## Task Realtime Sync

- [ ] Create a task in tab 1.
- [ ] Confirm the task appears in tab 2.
- [ ] Edit the task title, description, or priority in tab 1.
- [ ] Confirm the task updates in tab 2.
- [ ] Delete the task in tab 1.
- [ ] Confirm the task disappears in tab 2.

## Drag-and-Drop Movement

- [ ] Create at least three columns: To Do, In Progress, Done.
- [ ] Create multiple tasks in To Do.
- [ ] Drag a task within the same column.
- [ ] Confirm task positions update.
- [ ] Drag a task from To Do to In Progress.
- [ ] Confirm the task moves columns.
- [ ] Open the same board in tab 2.
- [ ] Drag a task in tab 1.
- [ ] Confirm tab 2 updates without refresh.

## Activity Feed

- [ ] Create a column.
- [ ] Create a task.
- [ ] Edit a task.
- [ ] Move a task.
- [ ] Delete a task.
- [ ] Confirm activity feed refreshes after each action.
- [ ] Confirm activity labels are readable.

## Error Checks

- [ ] No browser console errors during create/edit/delete.
- [ ] No browser console errors during drag/drop.
- [ ] No duplicate task cards after realtime events.
- [ ] No task remains in deleted columns.
- [ ] No broken layout on smaller screens.
- [ ] Backend logs do not show repeated crashes.
- [ ] Redis and PostgreSQL containers stay healthy.

## Expected Demo Outcome

A recruiter or reviewer should be able to see:

- Authenticated board workspace
- Kanban columns and tasks
- Activity history
- Live presence
- Realtime task and column sync
- Drag-and-drop task movement
- Dockerized local development
- Redis-backed realtime architecture
