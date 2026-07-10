import { Worker, Job } from "bullmq";
import { getRedisConnectionOptions } from "../../config/redis.js";
import { QUEUE_NAME } from "../../config/queue.js";
import { getPrisma } from "../../db/client.js";
import { eventBus } from "../../events/bus.js";
import { checkSuppression } from "./suppression.js";
import { invalidatePatientCache } from "../alert/alert.cache.js";

interface AlertJobData {
  alertId: string;
}

/**
 * BullMQ worker that processes alert events from the queue.
 *
 * Flow:
 * 1. Fetch the PENDING alert from DB
 * 2. Run suppression check against Redis counter
 * 3. Update alert status (ACTIVE or SUPPRESSED)
 * 4. Emit event on the internal event bus
 * 5. Invalidate relevant caches
 */
async function processAlert(job: Job<AlertJobData>) {
  const { alertId } = job.data;
  const prisma = getPrisma();

  console.log(`⚙️  Processing alert ${alertId} (job ${job.id})`);

  // Step 1: Fetch alert
  const alert = await prisma.alert.findUnique({ where: { id: alertId } });

  if (!alert) {
    console.error(`❌ Alert ${alertId} not found — skipping`);
    return;
  }

  if (alert.status !== "PENDING") {
    console.log(`⏭️  Alert ${alertId} already processed (${alert.status}) — skipping`);
    return;
  }

  // Step 2: Check suppression rules
  const suppression = await checkSuppression(alert.patientId, alert.severity);

  // Step 3: Update alert status
  if (suppression.action === "activate") {
    const updated = await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: "ACTIVE",
        processedAt: new Date(),
      },
    });

    console.log(
      `✅ Alert ${alertId} → ACTIVE (patient: ${alert.patientId}, severity: ${alert.severity})`
    );

    // Step 4: Emit event for real-time delivery
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
      `🔇 Alert ${alertId} → SUPPRESSED (patient: ${alert.patientId}, low-severity count: ${suppression.count}/${suppression.threshold})`
    );

    // Step 4: Emit suppressed event
    eventBus.emitEvent("alert:suppressed", {
      alertId: updated.id,
      patientId: updated.patientId,
      suppressedCount: suppression.count,
      severity: updated.severity,
      message: updated.message,
      triggeredAt: updated.triggeredAt,
    });
  }

  // Step 5: Invalidate cache
  await invalidatePatientCache(alert.patientId);
  console.log(`🗑️  Cache invalidated for patient ${alert.patientId}`);
}

/**
 * Create and start the BullMQ worker.
 * Returns the worker instance so the caller can manage its lifecycle.
 */
export function startAlertWorker(): Worker<AlertJobData> {
  const connection = getRedisConnectionOptions();

  const worker = new Worker<AlertJobData>(QUEUE_NAME, processAlert, {
    connection,
    concurrency: 5,
  });

  worker.on("completed", (job) => {
    console.log(`✅ Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message);
  });

  console.log(`✅ BullMQ worker started for queue "${QUEUE_NAME}" (concurrency: 5)`);
  return worker;
}
