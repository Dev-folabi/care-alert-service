import { getPrisma } from "../../db/client";
import { Prisma } from "@prisma/client";
import {
  getCached,
  setCache,
  buildPatientCacheKey,
  buildAllAlertsCacheKey,
} from "./alert.cache";

// Types

export interface AlertQueryFilters {
  patientId?: string;
  severity?: string;
  status?: string;
  page: number;
  limit: number;
}

export interface PaginatedAlerts {
  alerts: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Helpers

function buildWhereClause(filters: AlertQueryFilters) {
  const where: Prisma.AlertWhereInput = {};

  if (filters.patientId) {
    where.patientId = filters.patientId;
  }

  if (filters.severity) {
    where.severity = filters.severity.toUpperCase() as any;
  }

  if (filters.status) {
    where.status = filters.status.toUpperCase() as any;
  }

  return where;
}

// Service

export const getAllAlerts = async (
  filters: AlertQueryFilters,
): Promise<PaginatedAlerts> => {
  const { page, limit } = filters;
  const skip = (page - 1) * limit;
  const where = buildWhereClause(filters);

  // Build cache key from query params
  const queryString = JSON.stringify(filters);
  const cacheKey = buildAllAlertsCacheKey(queryString);

  // Check cache
  const cached = await getCached<PaginatedAlerts>(cacheKey);
  if (cached) {
    return cached;
  }

  const prisma = getPrisma();

  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.alert.count({ where }),
  ]);

  const result: PaginatedAlerts = {
    alerts,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };

  // Set cache
  await setCache(cacheKey, result);

  return result;
};

export const getMyAlerts = async (
  patientId: string,
  filters: Omit<AlertQueryFilters, "patientId">,
): Promise<PaginatedAlerts> => {
  const { page, limit } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.AlertWhereInput = { patientId };

  if (filters.severity) {
    where.severity = filters.severity.toUpperCase() as any;
  }

  if (filters.status) {
    where.status = filters.status.toUpperCase() as any;
  }

  // Check cache
  const queryString = JSON.stringify({ patientId, ...filters });
  const cacheKey = buildPatientCacheKey(patientId) + `:${queryString}`;
  const cached = await getCached<PaginatedAlerts>(cacheKey);
  if (cached) {
    return cached;
  }

  const prisma = getPrisma();

  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.alert.count({ where }),
  ]);

  const result: PaginatedAlerts = {
    alerts,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };

  // Set cache
  await setCache(cacheKey, result);

  return result;
};

export const getAlertById = async (
  id: string,
  userId: string,
  role: string,
  patientId: string | null,
) => {
  const prisma = getPrisma();

  const alert = await prisma.alert.findUnique({ where: { id } });

  if (!alert) {
    throw Object.assign(new Error("Alert not found"), { status: 404 });
  }

  if (role === "PATIENT" && alert.patientId !== patientId) {
    throw Object.assign(
      new Error("You are not authorized to view this alert"),
      { status: 403 },
    );
  }

  return alert;
};
