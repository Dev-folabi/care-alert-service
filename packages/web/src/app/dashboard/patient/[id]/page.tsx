"use client";

import { use } from "react";
import { useAlerts } from "@/hooks/useAlerts";
import { AlertFeed } from "@/components/alerts/AlertFeed";
import { AlertList } from "@/components/alerts/AlertList";
import { useState } from "react";
import type { AlertFilters } from "@/types/alert";

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [filters, setFilters] = useState<AlertFilters>({
    patientId: id,
    page: 1,
    limit: 20,
  });

  const { data, isLoading } = useAlerts(filters);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          Patient {id} — Alerts
        </h2>
        <p className="text-sm text-gray-500">
          Filtered alert history for this patient
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AlertFeed alerts={data?.alerts || []} />
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
  );
}
