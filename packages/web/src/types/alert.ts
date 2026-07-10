export type Severity = "LOW" | "MEDIUM" | "HIGH";
export type AlertStatus = "PENDING" | "ACTIVE" | "SUPPRESSED";

export interface Alert {
  id: string;
  eventId: string;
  deviceId: string;
  patientId: string;
  severity: Severity;
  message: string;
  triggeredAt: string;
  status: AlertStatus;
  suppressedCount: number;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedAlerts {
  alerts: Alert[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AlertFilters {
  patientId?: string;
  severity?: string;
  status?: string;
  page?: number;
  limit?: number;
}
