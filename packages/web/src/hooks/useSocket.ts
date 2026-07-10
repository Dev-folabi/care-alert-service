"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useSocketStore } from "@/stores/socketStore";
import { getSocketClient, disconnectSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";

/**
 * Hook to manage Socket.io connection lifecycle.
 * Connects with the JWT token and tracks connection status.
 */
export function useSocket() {
  const token = useAuthStore((s) => s.token);
  const setSocket = useSocketStore((s) => s.setSocket);
  const setConnected = useSocketStore((s) => s.setConnected);
  const isConnected = useSocketStore((s) => s.isConnected);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      setSocket(null);
      setConnected(false);
      return;
    }

    const socket = getSocketClient(token);
    socketRef.current = socket;
    setSocket(socket);

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
      setConnected(false);
    });

    // Connect if not already
    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
    };
  }, [token, setSocket, setConnected]);

  return { isConnected };
}
