import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SeverityBadge } from "./SeverityBadge";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import type { Alert } from "@/types/alert";

interface AlertCardProps {
  alert: Alert;
  isNew?: boolean;
  onClick?: (alert: Alert) => void;
}

const statusVariant: Record<string, "active" | "suppressed" | "pending"> = {
  ACTIVE: "active",
  SUPPRESSED: "suppressed",
  PENDING: "pending",
};

export function AlertCard({ alert, isNew, onClick }: AlertCardProps) {
  return (
    <Card
      padding="none"
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isNew && "ring-2 ring-brand-500 animate-pulse-once",
      )}
      onClick={() => onClick?.(alert)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <SeverityBadge severity={alert.severity} />
            <Badge variant={statusVariant[alert.status] || "default"}>
              {alert.status}
            </Badge>
          </div>
          <span className="shrink-0 text-xs text-gray-400" title={formatDate(alert.triggeredAt)}>
            {timeAgo(alert.triggeredAt)}
          </span>
        </div>

        <p className="mt-2 text-sm text-gray-900">{alert.message}</p>

        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>Patient: {alert.patientId}</span>
          <span>Device: {alert.deviceId}</span>
        </div>

        {alert.status === "SUPPRESSED" && alert.suppressedCount > 0 && (
          <div className="mt-2 rounded-md bg-orange-50 px-2 py-1 text-xs text-orange-700">
            {alert.suppressedCount} similar low-severity alerts suppressed in this window
          </div>
        )}
      </div>
    </Card>
  );
}
