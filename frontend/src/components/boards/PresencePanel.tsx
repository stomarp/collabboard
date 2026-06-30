"use client";

import { useEffect, useState } from "react";

import { getWebSocketUrl } from "@/lib/api";

export type RealtimeBoardMessage = {
  type?: string;
  connection_count?: number;
  task?: unknown;
  column?: unknown;
  tasks?: unknown;
};

type PresencePanelProps = {
  boardId: string;
  token: string | null;
  onRealtimeMessage?: (message: RealtimeBoardMessage) => void;
};

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

function statusLabel(status: ConnectionStatus) {
  if (status === "connected") {
    return "Connected";
  }

  if (status === "connecting") {
    return "Connecting";
  }

  if (status === "error") {
    return "Connection issue";
  }

  return "Disconnected";
}

export function PresencePanel({
  boardId,
  token,
  onRealtimeMessage,
}: PresencePanelProps) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [viewerCount, setViewerCount] = useState(0);
  const [lastEvent, setLastEvent] = useState("Waiting for realtime events");

  useEffect(() => {
    if (!token) {
      return;
    }

    const activeToken = token;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let shouldReconnect = true;

    function connect() {
      setStatus("connecting");

      socket = new WebSocket(
        getWebSocketUrl(`/ws/boards/${boardId}`, activeToken),
      );

      socket.onopen = () => {
        setStatus("connected");
        setLastEvent("Realtime connection established");
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as RealtimeBoardMessage;

          onRealtimeMessage?.(message);

          if (typeof message.connection_count === "number") {
            setViewerCount(message.connection_count);
          }

          if (message.type) {
            setLastEvent(message.type);
          }
        } catch {
          setLastEvent("Received realtime update");
        }
      };

      socket.onerror = () => {
        setStatus("error");
        setLastEvent("Realtime connection error");
      };

      socket.onclose = () => {
        if (!shouldReconnect) {
          setStatus("disconnected");
          return;
        }

        setStatus("disconnected");
        setLastEvent("Reconnecting to realtime board room");

        reconnectTimer = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      shouldReconnect = false;

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      if (socket) {
        socket.close();
      }
    };
  }, [boardId, token, onRealtimeMessage]);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-300">
            Presence
          </p>
          <h2 className="mt-3 text-2xl font-bold">Live board room</h2>
        </div>

        <div className="rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-xs text-slate-300">
          {statusLabel(status)}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Viewers
          </p>
          <p className="mt-2 text-3xl font-bold">{viewerCount}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Status
          </p>
          <p className="mt-2 text-sm font-semibold text-sky-300">
            {statusLabel(status)}
          </p>
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-slate-400">
        {lastEvent}
      </p>
    </section>
  );
}
