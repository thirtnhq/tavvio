"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getToken } from "@/lib/auth";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export function useDashboardSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = getToken();
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      autoConnect: true,
      query: token ? { type: "merchant", token: `Bearer ${token}` } : undefined,
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  const subscribe = useCallback((event: string, callback: (...args: unknown[]) => void) => {
    socketRef.current?.on(event, callback);
    return () => {
      socketRef.current?.off(event, callback);
    };
  }, []);

  return { connected, subscribe, socket: socketRef.current };
}
