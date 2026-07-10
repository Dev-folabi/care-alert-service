"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCard } from "./AlertCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import type { Alert, AlertFilters } from "@/types/alert";

interface AlertListProps {
  alerts: Alert[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  filters: AlertFilters;
  onFiltersChange: (filters: AlertFilters) => void;
}

export function AlertList({
  alerts,
  total,
  page,
  totalPages,
  isLoading,
  filters,
  onFiltersChange,
}: AlertListProps) {
  const router = useRouter();

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">
          Alert History ({total})
        </h2>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={filters.severity || ""}
          onChange={(e) =>
            onFiltersChange({ ...filters, severity: e.target.value || undefined, page: 1 })
          }
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Severities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <select
          value={filters.status || ""}
          onChange={(e) =>
            onFiltersChange({ ...filters, status: e.target.value || undefined, page: 1 })
          }
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suppressed">Suppressed</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Alert list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : alerts.length === 0 ? (
        <EmptyState
          title="No alerts found"
          description="Adjust filters or wait for new alerts to arrive"
        />
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <AlertCard 
              key={alert.id} 
              alert={alert} 
              onClick={() => router.push(`/dashboard/alert/${alert.id}`)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => onFiltersChange({ ...filters, page: (page || 1) - 1 })}
            disabled={page <= 1}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onFiltersChange({ ...filters, page: (page || 1) + 1 })}
            disabled={page >= totalPages}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
