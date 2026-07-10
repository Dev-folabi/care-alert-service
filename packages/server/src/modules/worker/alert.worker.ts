import { Worker, Job } from "bullmq";
import { getRedisConnectionOptions } from "../../config/redis";
import { QUEUE_NAME } from "../../config/queue";
import { getPrisma } from "../../db/client";
import { eventBus } from "../../events/bus";
import { checkSuppression } from "./suppression";
import { invalidatePatientCache } from "../alert/alert.cache";

interface AlertJobData {
  alertId: string;
}

/**
 * BullMQ worker that processes alert events from the queue.
 */
const processAlert = async (job: Job<AlertJobData>) => {
  const { alertId } = job.data;
  const prisma = getPrisma();

  console.log(`Processing alert ${alertId} (job ${job.id})`);

  // Fetch alert
  const alert = await prisma.alert.findUnique({ where: { id: alertId } });

  if (!alert) {
    console.error(`Alert ${alertId} not found — skipping`);
    return;
  }

  if (alert.status !== "PENDING") {
    console.log(
      `Alert ${alertId} already processed (${alert.status}) — skipping`,
    );
    return;
  }

  // Check suppression rules
  const suppression = await checkSuppression(alert.patientId, alert.severity);

  // Update alert status
  if (suppression.action === "activate") {
    const updated = await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: "ACTIVE",
        processedAt: new Date(),
      },
    });

    console.log(
      `Alert ${alertId} → ACTIVE (patient: ${alert.patientId}, severity: ${alert.severity})`,
    );

    // Emit event for real-time delivery
    eventBus.emitEvent("alert:created", {
      alertId: updated.id,
      patientId: updated.patientId,
      severity: updated.severity,
      message: updated.message,
      triggeredAt: updated.triggeredAt,
    });
  } else {
    const updated = await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: "SUPPRESSED",
        suppressedCount: suppression.count,
        processedAt: new Date(),
      },
    });

    console.log(
      `Alert ${alertId} → SUPPRESSED (patient: ${alert.patientId}, low-severity count: ${suppression.count}/${suppression.threshold})`,
    );

    //  Emit suppressed event
    eventBus.emitEvent("alert:suppressed", {
      alertId: updated.id,
      patientId: updated.patientId,
      suppressedCount: suppression.count,
      severity: updated.severity,
      message: updated.message,
      triggeredAt: updated.triggeredAt,
    });
  }

  // Invalidate cache
  await invalidatePatientCache(alert.patientId);
  console.log(`🗑️  Cache invalidated for patient ${alert.patientId}`);
};

/**
 * Create and start the BullMQ worker.
 */
export const startAlertWorker = (): Worker<AlertJobData> => {
  const connection = getRedisConnectionOptions();

  const worker = new Worker<AlertJobData>(QUEUE_NAME, processAlert, {
    connection,
    concurrency: 5,
  });

  worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });

  console.log(
    `BullMQ worker started for queue "${QUEUE_NAME}" (concurrency: 5)`,
  );
  return worker;
};
