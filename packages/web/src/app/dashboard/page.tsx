"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useAlerts } from "@/hooks/useAlerts";
import { AlertFeed } from "@/components/alerts/AlertFeed";
import { AlertList } from "@/components/alerts/AlertList";
import type { AlertFilters } from "@/types/alert";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [filters, setFilters] = useState<AlertFilters>({ page: 1, limit: 20 });
  const { data, isLoading } = useAlerts(filters);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          Welcome, {user?.name}
        </h2>
        <p className="text-sm text-gray-500">
          {user?.role === "CLINICIAN"
            ? "Monitor all patient alerts in real-time"
            : "View your alert history and real-time notifications"}
        </p>
      </div>

      {/* Stats summary (for clinician) */}
      {user?.role === "CLINICIAN" && data && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total Alerts" value={data.total} />
          <StatCard
            label="High Severity"
            value={data.alerts.filter((a) => a.severity === "HIGH").length}
            color="text-red-600"
          />
          <StatCard
            label="Suppressed"
            value={data.alerts.filter((a) => a.status === "SUPPRESSED").length}
            color="text-orange-600"
          />
          <StatCard
            label="Active"
            value={data.alerts.filter((a) => a.status === "ACTIVE").length}
            color="text-blue-600"
          />
        </div>
      )}

      {/* Two-column layout: Live Feed + Alert History */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Live Feed */}
        <div>
          <AlertFeed alerts={data?.alerts || []} />
        </div>

        {/* Alert History with filters */}
        <div>
          <AlertList
            alerts={data?.alerts || []}
            total={data?.total || 0}
            page={data?.page || 1}
            totalPages={data?.totalPages || 1}
            isLoading={isLoading}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color || "text-gray-900"}`}>
        {value}
      </p>
    </div>
  );
}
