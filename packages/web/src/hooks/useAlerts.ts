"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import type { PaginatedAlerts, AlertFilters, Alert } from "@/types/alert";

/**
 * Fetch alerts — automatically uses the correct endpoint
 * based on the user's role (clinician vs patient).
 */
export function useAlerts(filters: AlertFilters = {}) {
  const { user } = useAuthStore();

  const isClinician = user?.role === "CLINICIAN";
  const isPatient = user?.role === "PATIENT";

  // Build query params
  const params: Record<string, string> = {};
  if (filters.severity) params.severity = filters.severity;
  if (filters.status) params.status = filters.status;
  if (filters.patientId && isClinician) params.patientId = filters.patientId;
  params.page = String(filters.page || 1);
  params.limit = String(filters.limit || 20);

  const endpoint = isPatient ? "/api/alerts/mine" : "/api/alerts";

  return useQuery<PaginatedAlerts>({
    queryKey: ["alerts", endpoint, params],
    queryFn: () => api.get<PaginatedAlerts>(endpoint, params),
    enabled: !!user, // Only fetch when user is authenticated
  });
}

/**
 * Fetch a single alert by ID.
 */
export function useAlert(id: string) {
  return useQuery<Alert>({
    queryKey: ["alert", id],
    queryFn: () => api.get<Alert>(`/api/alerts/${id}`),
    enabled: !!id,
  });
}
