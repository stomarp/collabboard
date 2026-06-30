"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { ActivityFeed } from "@/components/boards/ActivityFeed";
import {
  PresencePanel,
  type RealtimeBoardMessage,
} from "@/components/boards/PresencePanel";
import { ApiError, apiRequest } from "@/lib/api";
import { clearStoredToken, getStoredToken } from "@/lib/auth";

type Board = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
};

type BoardColumn = {
  id: string;
  board_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
};

type Task = {
  id: string;
  board_id: string;
  column_id: string;
  title: string;
  description: string | null;
  position: number;
  priority: string;
  assignee_id: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
};

type NewTaskForm = {
  columnId: string;
  title: string;
  description: string;
  priority: string;
};

type TaskEditForm = {
  title: string;
  description: string;
  priority: string;
};


function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isBoardColumnPayload(value: unknown): value is BoardColumn {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.board_id === "string" &&
    typeof value.name === "string" &&
    typeof value.position === "number" &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string"
  );
}

function isTaskPayload(value: unknown): value is Task {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.board_id === "string" &&
    typeof value.column_id === "string" &&
    typeof value.title === "string" &&
    isNullableString(value.description) &&
    typeof value.position === "number" &&
    typeof value.priority === "string" &&
    isNullableString(value.assignee_id) &&
    isNullableString(value.created_by_id) &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string"
  );
}

function sortColumns(columnsToSort: BoardColumn[]) {
  return [...columnsToSort].sort(
    (first, second) => first.position - second.position,
  );
}

function sortTasks(tasksToSort: Task[]) {
  return [...tasksToSort].sort((first, second) => {
    const columnCompare = first.column_id.localeCompare(second.column_id);

    if (columnCompare !== 0) {
      return columnCompare;
    }

    return first.position - second.position;
  });
}

function upsertColumn(columnsToUpdate: BoardColumn[], column: BoardColumn) {
  const exists = columnsToUpdate.some((currentColumn) => currentColumn.id === column.id);

  if (!exists) {
    return sortColumns([...columnsToUpdate, column]);
  }

  return sortColumns(
    columnsToUpdate.map((currentColumn) =>
      currentColumn.id === column.id ? column : currentColumn,
    ),
  );
}

function upsertTask(tasksToUpdate: Task[], task: Task) {
  const exists = tasksToUpdate.some((currentTask) => currentTask.id === task.id);

  if (!exists) {
    return sortTasks([...tasksToUpdate, task]);
  }

  return sortTasks(
    tasksToUpdate.map((currentTask) =>
      currentTask.id === task.id ? task : currentTask,
    ),
  );
}

export default function BoardDetailPage() {
  const router = useRouter();
  const params = useParams<{ boardId: string }>();
  const boardId = params.boardId;

  const [token, setToken] = useState<string | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [columnName, setColumnName] = useState("");
  const [newTask, setNewTask] = useState<NewTaskForm>({
    columnId: "",
    title: "",
    description: "",
    priority: "medium",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [deletingColumnId, setDeletingColumnId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskDraft, setTaskDraft] = useState<TaskEditForm>({
    title: "",
    description: "",
    priority: "medium",
  });
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function refreshActivityFeed() {
    setActivityRefreshKey((currentKey) => currentKey + 1);
  }


  const handleRealtimeMessage = useCallback((message: RealtimeBoardMessage) => {
    if (message.type === "column.created" || message.type === "column.updated") {
      if (!isBoardColumnPayload(message.column)) {
        return;
      }

      const column = message.column;

      setColumns((currentColumns) => upsertColumn(currentColumns, column));

      setNewTask((current) => ({
        ...current,
        columnId: current.columnId || column.id,
      }));

      setActivityRefreshKey((currentKey) => currentKey + 1);
      return;
    }

    if (message.type === "column.deleted") {
      if (!isBoardColumnPayload(message.column)) {
        return;
      }

      const deletedColumn = message.column;

      setColumns((currentColumns) => {
        const remainingColumns = currentColumns.filter(
          (column) => column.id !== deletedColumn.id,
        );

        setNewTask((current) => ({
          ...current,
          columnId:
            current.columnId === deletedColumn.id
              ? remainingColumns[0]?.id || ""
              : current.columnId,
        }));

        return remainingColumns;
      });

      setTasks((currentTasks) =>
        currentTasks.filter((task) => task.column_id !== deletedColumn.id),
      );

      setActivityRefreshKey((currentKey) => currentKey + 1);
      return;
    }

    if (message.type === "task.created" || message.type === "task.updated") {
      if (!isTaskPayload(message.task)) {
        return;
      }

      const task = message.task;

      setTasks((currentTasks) => upsertTask(currentTasks, task));
      setActivityRefreshKey((currentKey) => currentKey + 1);
      return;
    }

    if (message.type === "task.deleted") {
      if (!isTaskPayload(message.task)) {
        return;
      }

      const deletedTask = message.task;

      setTasks((currentTasks) =>
        currentTasks.filter((task) => task.id !== deletedTask.id),
      );

      setEditingTaskId((currentEditingTaskId) =>
        currentEditingTaskId === deletedTask.id ? null : currentEditingTaskId,
      );

      setActivityRefreshKey((currentKey) => currentKey + 1);
    }
  }, []);

  const tasksByColumn = useMemo(() => {
    return columns.reduce<Record<string, Task[]>>((groups, column) => {
      groups[column.id] = tasks
        .filter((task) => task.column_id === column.id)
        .sort((first, second) => first.position - second.position);

      return groups;
    }, {});
  }, [columns, tasks]);

  useEffect(() => {
    async function loadBoard() {
      const storedToken = getStoredToken();

      if (!storedToken) {
        router.replace("/login");
        return;
      }

      setToken(storedToken);

      try {
        const [boardResponse, columnResponse, taskResponse] = await Promise.all([
          apiRequest<Board>(`/boards/${boardId}`, { token: storedToken }),
          apiRequest<BoardColumn[]>(`/boards/${boardId}/columns`, {
            token: storedToken,
          }),
          apiRequest<Task[]>(`/boards/${boardId}/tasks`, {
            token: storedToken,
          }),
        ]);

        setBoard(boardResponse);
        setColumns(columnResponse);
        setTasks(taskResponse);
        setNewTask((current) => ({
          ...current,
          columnId: columnResponse[0]?.id || "",
        }));
      } catch {
        clearStoredToken();
        router.replace("/login");
      } finally {
        setIsLoading(false);
      }
    }

    loadBoard();
  }, [boardId, router]);

  async function handleCreateColumn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !columnName.trim()) {
      return;
    }

    setError(null);
    setIsCreatingColumn(true);

    try {
      const column = await apiRequest<BoardColumn>(
        `/boards/${boardId}/columns`,
        {
          method: "POST",
          token,
          body: {
            name: columnName.trim(),
          },
        },
      );

      setColumns((currentColumns) => [...currentColumns, column]);
      setColumnName("");

      setNewTask((current) => ({
        ...current,
        columnId: current.columnId || column.id,
      }));
      refreshActivityFeed();
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.detail);
      } else {
        setError("Could not create column. Please try again.");
      }
    } finally {
      setIsCreatingColumn(false);
    }
  }

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !newTask.columnId || !newTask.title.trim()) {
      return;
    }

    setError(null);
    setIsCreatingTask(true);

    try {
      const task = await apiRequest<Task>(`/boards/${boardId}/tasks`, {
        method: "POST",
        token,
        body: {
          column_id: newTask.columnId,
          title: newTask.title.trim(),
          description: newTask.description.trim() || null,
          priority: newTask.priority,
          assignee_id: null,
        },
      });

      setTasks((currentTasks) => [...currentTasks, task]);
      setNewTask((current) => ({
        ...current,
        title: "",
        description: "",
        priority: "medium",
      }));
      refreshActivityFeed();
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.detail);
      } else {
        setError("Could not create task. Please try again.");
      }
    } finally {
      setIsCreatingTask(false);
    }
  }

  function startEditingTask(task: Task) {
    setError(null);
    setEditingTaskId(task.id);
    setTaskDraft({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
    });
  }

  function cancelEditingTask() {
    setEditingTaskId(null);
    setTaskDraft({
      title: "",
      description: "",
      priority: "medium",
    });
  }

  async function handleUpdateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !editingTaskId || !taskDraft.title.trim()) {
      return;
    }

    setError(null);
    setIsUpdatingTask(true);

    try {
      const updatedTask = await apiRequest<Task>(`/tasks/${editingTaskId}`, {
        method: "PATCH",
        token,
        body: {
          title: taskDraft.title.trim(),
          description: taskDraft.description.trim() || null,
          priority: taskDraft.priority,
        },
      });

      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === updatedTask.id ? updatedTask : task,
        ),
      );
      cancelEditingTask();
      refreshActivityFeed();
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.detail);
      } else {
        setError("Could not update task. Please try again.");
      }
    } finally {
      setIsUpdatingTask(false);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!token) {
      return;
    }

    const confirmed = window.confirm("Delete this task?");
    if (!confirmed) {
      return;
    }

    setError(null);
    setDeletingTaskId(taskId);

    try {
      await apiRequest<void>(`/tasks/${taskId}`, {
        method: "DELETE",
        token,
      });

      setTasks((currentTasks) =>
        currentTasks.filter((task) => task.id !== taskId),
      );

      if (editingTaskId === taskId) {
        cancelEditingTask();
      }

      refreshActivityFeed();
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.detail);
      } else {
        setError("Could not delete task. Please try again.");
      }
    } finally {
      setDeletingTaskId(null);
    }
  }

  async function handleDeleteColumn(columnId: string) {
    if (!token) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this column? Tasks in this column will also be removed.",
    );
    if (!confirmed) {
      return;
    }

    setError(null);
    setDeletingColumnId(columnId);

    try {
      await apiRequest<void>(`/columns/${columnId}`, {
        method: "DELETE",
        token,
      });

      const remainingColumns = columns.filter((column) => column.id !== columnId);

      setColumns(remainingColumns);
      setTasks((currentTasks) =>
        currentTasks.filter((task) => task.column_id !== columnId),
      );
      setNewTask((current) => ({
        ...current,
        columnId:
          current.columnId === columnId
            ? remainingColumns[0]?.id || ""
            : current.columnId,
      }));
      refreshActivityFeed();
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.detail);
      } else {
        setError("Could not delete column. Please try again.");
      }
    } finally {
      setDeletingColumnId(null);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-slate-300">
          Loading board...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href="/dashboard" className="text-sm font-semibold text-sky-300">
              Back to dashboard
            </Link>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">
              {board?.name || "Board"}
            </h1>
            <p className="mt-2 max-w-2xl text-slate-300">
              {board?.description ||
                "Plan, organize, and track collaborative work across columns."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Columns
              </p>
              <p className="mt-2 text-2xl font-bold">{columns.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Tasks
              </p>
              <p className="mt-2 text-2xl font-bold">{tasks.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Mode
              </p>
              <p className="mt-2 text-sm font-semibold text-sky-300">
                Realtime Sync
              </p>
            </div>
          </div>
        </header>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-6">
            <form
              onSubmit={handleCreateColumn}
              className="rounded-3xl border border-white/10 bg-white/[0.06] p-6"
            >
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-300">
                New column
              </p>
              <h2 className="mt-3 text-2xl font-bold">Add workflow stage</h2>

              <label className="mt-6 block">
                <span className="text-sm font-medium text-slate-200">
                  Column name
                </span>
                <input
                  required
                  value={columnName}
                  onChange={(event) => setColumnName(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-300"
                  placeholder="To Do"
                />
              </label>

              <button
                type="submit"
                disabled={isCreatingColumn}
                className="mt-6 w-full rounded-xl bg-sky-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isCreatingColumn ? "Creating..." : "Create column"}
              </button>
            </form>

            <form
              onSubmit={handleCreateTask}
              className="rounded-3xl border border-white/10 bg-white/[0.06] p-6"
            >
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-300">
                New task
              </p>
              <h2 className="mt-3 text-2xl font-bold">Add task card</h2>

              <label className="mt-6 block">
                <span className="text-sm font-medium text-slate-200">
                  Column
                </span>
                <select
                  required
                  value={newTask.columnId}
                  onChange={(event) =>
                    setNewTask((current) => ({
                      ...current,
                      columnId: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-300"
                >
                  <option value="" disabled>
                    Select a column
                  </option>
                  {columns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-5 block">
                <span className="text-sm font-medium text-slate-200">
                  Title
                </span>
                <input
                  required
                  value={newTask.title}
                  onChange={(event) =>
                    setNewTask((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-300"
                  placeholder="Design board page"
                />
              </label>

              <label className="mt-5 block">
                <span className="text-sm font-medium text-slate-200">
                  Description
                </span>
                <textarea
                  value={newTask.description}
                  onChange={(event) =>
                    setNewTask((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-300"
                  placeholder="What needs to be done?"
                />
              </label>

              <label className="mt-5 block">
                <span className="text-sm font-medium text-slate-200">
                  Priority
                </span>
                <select
                  value={newTask.priority}
                  onChange={(event) =>
                    setNewTask((current) => ({
                      ...current,
                      priority: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-300"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>

              <button
                type="submit"
                disabled={isCreatingTask || columns.length === 0}
                className="mt-6 w-full rounded-xl bg-sky-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isCreatingTask ? "Creating..." : "Create task"}
              </button>
            </form>

            <PresencePanel
  boardId={boardId}
  token={token}
  onRealtimeMessage={handleRealtimeMessage}
/>

            <ActivityFeed
              boardId={boardId}
              token={token}
              refreshKey={activityRefreshKey}
            />
          </aside>

          <section>
            {columns.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.04] p-10 text-center">
                <h2 className="text-2xl font-bold">No columns yet</h2>
                <p className="mt-3 text-slate-400">
                  Create columns like To Do, In Progress, and Done to start your
                  Kanban workflow.
                </p>
              </div>
            ) : (
              <div className="flex gap-5 overflow-x-auto pb-6">
                {columns.map((column) => (
                  <div
                    key={column.id}
                    className="min-w-80 rounded-3xl border border-white/10 bg-white/[0.06] p-5"
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold">{column.name}</h2>
                        <p className="mt-1 text-xs text-slate-500">
                          Position {column.position}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-xs text-slate-300">
                          {tasksByColumn[column.id]?.length || 0}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteColumn(column.id)}
                          disabled={deletingColumnId === column.id}
                          className="rounded-full border border-red-400/20 px-3 py-1 text-xs font-semibold text-red-200 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingColumnId === column.id ? "Deleting" : "Delete"}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {(tasksByColumn[column.id] || []).length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/50 p-5 text-sm text-slate-500">
                          No tasks in this column.
                        </div>
                      ) : (
                        tasksByColumn[column.id].map((task) => (
                          <article
                            key={task.id}
                            className="rounded-2xl border border-white/10 bg-slate-950 p-5 shadow-xl shadow-slate-950/20"
                          >
                            {editingTaskId === task.id ? (
                              <form
                                onSubmit={handleUpdateTask}
                                className="space-y-3"
                              >
                                <input
                                  required
                                  value={taskDraft.title}
                                  onChange={(event) =>
                                    setTaskDraft((current) => ({
                                      ...current,
                                      title: event.target.value,
                                    }))
                                  }
                                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-300"
                                />

                                <textarea
                                  value={taskDraft.description}
                                  onChange={(event) =>
                                    setTaskDraft((current) => ({
                                      ...current,
                                      description: event.target.value,
                                    }))
                                  }
                                  className="min-h-20 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-300"
                                />

                                <select
                                  value={taskDraft.priority}
                                  onChange={(event) =>
                                    setTaskDraft((current) => ({
                                      ...current,
                                      priority: event.target.value,
                                    }))
                                  }
                                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-300"
                                >
                                  <option value="low">Low</option>
                                  <option value="medium">Medium</option>
                                  <option value="high">High</option>
                                  <option value="urgent">Urgent</option>
                                </select>

                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={cancelEditingTask}
                                    className="flex-1 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={isUpdatingTask}
                                    className="flex-1 rounded-xl bg-sky-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
                                  >
                                    {isUpdatingTask ? "Saving" : "Save"}
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <>
                                <div className="mb-3 flex items-center justify-between gap-3">
                                  <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs font-semibold text-sky-200">
                                    {task.priority}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    #{task.position}
                                  </span>
                                </div>

                                <h3 className="font-semibold">{task.title}</h3>
                                <p className="mt-3 text-sm leading-6 text-slate-400">
                                  {task.description || "No description added."}
                                </p>

                                <div className="mt-5 flex gap-2 border-t border-white/10 pt-4">
                                  <button
                                    type="button"
                                    onClick={() => startEditingTask(task)}
                                    className="flex-1 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTask(task.id)}
                                    disabled={deletingTaskId === task.id}
                                    className="flex-1 rounded-xl border border-red-400/20 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {deletingTaskId === task.id
                                      ? "Deleting"
                                      : "Delete"}
                                  </button>
                                </div>
                              </>
                            )}
                          </article>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
