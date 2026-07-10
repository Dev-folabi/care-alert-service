"use client";

import { useState, useEffect, useRef } from "react";
import { AlertCard } from "./AlertCard";
import { useSocketStore } from "@/stores/socketStore";
import type { Alert } from "@/types/alert";

interface AlertFeedProps {
  alerts: Alert[];
}

export function AlertFeed({ alerts }: AlertFeedProps) {
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const isConnected = useSocketStore((s) => s.isConnected);
  const feedRef = useRef<HTMLDivElement>(null);

  // Take the latest alerts for the live feed (most recent first)
  useEffect(() => {
    setRecentAlerts(alerts.slice(0, 20));
  }, [alerts]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Live Feed</h2>
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              isConnected ? "bg-green-500 animate-pulse" : "bg-gray-300"
            }`}
          />
          <span className="text-xs text-gray-500">
            {isConnected ? "Live" : "Disconnected"}
          </span>
        </div>
      </div>

      <div
        ref={feedRef}
        className="scrollbar-thin space-y-2 max-h-[500px] overflow-y-auto pr-1"
      >
        {recentAlerts.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">
            No alerts yet. Waiting for real-time events...
          </div>
        ) : (
          recentAlerts.map((alert, index) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              isNew={index === 0}
            />
          ))
        )}
      </div>
    </div>
  );
}
