"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocketStore } from "@/stores/socketStore";

/**
 * Hook that listens for real-time alert events via Socket.io
 * and invalidates TanStack Query cache to trigger a refetch.
 *
 * This bridges Socket.io (push) with TanStack Query (cache):
 *   - Socket event → queryClient.invalidateQueries(['alerts'])
 *   - TanStack Query refetches in the background
 *   - UI updates automatically with fresh data
 */
export function useLiveAlerts() {
  const socket = useSocketStore((s) => s.socket);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handleNewAlert = () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    };

    const handleSuppressed = () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    };

    socket.on("alert:new", handleNewAlert);
    socket.on("alert:suppressed", handleSuppressed);

    return () => {
      socket.off("alert:new", handleNewAlert);
      socket.off("alert:suppressed", handleSuppressed);
    };
  }, [socket, queryClient]);
}
