"use client";

import { useEffect, useState } from "react";

import { ApiError, apiRequest } from "@/lib/api";

type ActivityLog = {
  id: string;
  board_id: string;
  actor_id: string | null;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

type ActivityFeedProps = {
  boardId: string;
  token: string | null;
  refreshKey: number;
};

const eventLabels: Record<string, string> = {
  "board.created": "Board created",
  "board.updated": "Board updated",
  "column.created": "Column created",
  "column.updated": "Column updated",
  "column.deleted": "Column deleted",
  "task.created": "Task created",
  "task.updated": "Task updated",
  "task.deleted": "Task deleted",
};

function payloadString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value : null;
}

function nestedPayloadString(
  payload: Record<string, unknown>,
  parentKey: string,
  childKey: string,
) {
  const parent = payload[parentKey];

  if (!parent || typeof parent !== "object" || Array.isArray(parent)) {
    return null;
  }

  const value = (parent as Record<string, unknown>)[childKey];
  return typeof value === "string" ? value : null;
}

function describeActivity(log: ActivityLog) {
  const directName = payloadString(log.payload, "name");
  const directTitle = payloadString(log.payload, "title");
  const updatedName = nestedPayloadString(log.payload, "after", "name");
  const updatedTitle = nestedPayloadString(log.payload, "after", "title");

  switch (log.event_type) {
    case "board.created":
      return directName ? `Created board "${directName}"` : "Created board";
    case "board.updated":
      return "Updated board details";
    case "column.created":
      return directName ? `Added column "${directName}"` : "Added column";
    case "column.updated":
      return updatedName ? `Renamed column to "${updatedName}"` : "Updated column";
    case "column.deleted":
      return directName ? `Deleted column "${directName}"` : "Deleted column";
    case "task.created":
      return directTitle ? `Created task "${directTitle}"` : "Created task";
    case "task.updated":
      return updatedTitle ? `Updated task "${updatedTitle}"` : "Updated task";
    case "task.deleted":
      return directTitle ? `Deleted task "${directTitle}"` : "Deleted task";
    default:
      return eventLabels[log.event_type] || log.event_type;
  }
}

function formatActivityTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ActivityFeed({ boardId, token, refreshKey }: ActivityFeedProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadActivity() {
      if (!token) {
        return;
      }

      setError(null);
      setIsLoading(true);

      try {
        const activity = await apiRequest<ActivityLog[]>(
          `/boards/${boardId}/activity?limit=20`,
          { token },
        );

        setLogs(activity);
      } catch (caughtError) {
        if (caughtError instanceof ApiError) {
          setError(caughtError.detail);
        } else {
          setError("Could not load activity.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadActivity();
  }, [boardId, token, refreshKey]);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-300">
            Activity
          </p>
          <h2 className="mt-3 text-2xl font-bold">Board history</h2>
        </div>

        <div className="rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-xs text-slate-300">
          {logs.length}
        </div>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-slate-400">Loading activity...</p>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {!isLoading && logs.length === 0 ? (
        <p className="mt-6 text-sm leading-6 text-slate-400">
          No activity yet. Create columns or tasks to start building the board
          history.
        </p>
      ) : null}

      <div className="mt-6 space-y-4">
        {logs.map((log) => (
          <article
            key={log.id}
            className="rounded-2xl border border-white/10 bg-slate-950 p-4"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs font-semibold text-sky-200">
                {eventLabels[log.event_type] || log.event_type}
              </span>
              <span className="text-xs text-slate-500">
                {formatActivityTime(log.created_at)}
              </span>
            </div>

            <p className="text-sm leading-6 text-slate-300">
              {describeActivity(log)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
