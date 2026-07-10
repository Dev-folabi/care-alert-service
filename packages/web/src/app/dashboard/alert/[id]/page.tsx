"use client";

import { useAlert } from "@/hooks/useAlerts";
import { useParams, useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { SeverityBadge } from "@/components/alerts/SeverityBadge";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

const statusVariant: Record<string, "active" | "suppressed" | "pending"> = {
  ACTIVE: "active",
  SUPPRESSED: "suppressed",
  PENDING: "pending",
};

export default function AlertDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  // Extract id properly (it can be string or string[])
  const rawId = params.id;
  const alertId = Array.isArray(rawId) ? rawId[0] : rawId;

  const { data: alert, isLoading, error } = useAlert(alertId as string);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (error || !alert) {
    return (
      <div className="py-20 text-center text-red-600">
        Failed to load alert details.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Alert Details</h1>
      </div>

      <Card className="p-6">
        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {alert.message}
            </h2>
            <p className="text-sm text-gray-500">Event ID: {alert.eventId}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <SeverityBadge severity={alert.severity} />
            <Badge variant={statusVariant[alert.status] || "default"}>
              {alert.status}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 pt-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-gray-500">Patient ID</p>
            <p className="font-medium text-gray-900">{alert.patientId}</p>
          </div>
          <div>
            <p className="text-gray-500">Device ID</p>
            <p className="font-medium text-gray-900">{alert.deviceId}</p>
          </div>
          <div>
            <p className="text-gray-500">Triggered At</p>
            <p className="font-medium text-gray-900">
              {formatDate(alert.triggeredAt)}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Processed At</p>
            <p className="font-medium text-gray-900">
              {alert.processedAt ? formatDate(alert.processedAt) : "N/A"}
            </p>
          </div>
        </div>

        {alert.status === "SUPPRESSED" && (
          <div className="mt-6 rounded-md bg-orange-50 p-4">
            <h3 className="text-sm font-medium text-orange-800">
              Suppression Details
            </h3>
            <p className="mt-1 text-sm text-orange-700">
              This alert was suppressed because {alert.suppressedCount} similar low-severity
              events were recorded in the same window.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
