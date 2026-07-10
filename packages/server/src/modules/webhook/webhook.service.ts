import { getAlertQueue, QUEUE_NAME } from "../../config/queue.js";
import { handleIdempotency, markIdempotencyKey } from "../../utils/idempotency.js";

export interface WebhookPayload {
  eventId: string;
  deviceId: string;
  patientId: string;
  severity: string;
  message: string;
  triggeredAt: string;
}

/**
 * Ingest an alert from a webhook.
 *
 * Flow:
 * 1. Dual-layer idempotency check (Redis + DB unique constraint)
 * 2. If duplicate → return existing alert with 200
 * 3. If new → mark as processed in Redis → enqueue to BullMQ → return 202
 */
export async function ingestAlert(payload: WebhookPayload) {
  const triggeredAtDate = new Date(payload.triggeredAt);

  // Step 1: Dual-layer idempotency check
  const { isDuplicate, existingAlert } = await handleIdempotency(
    payload.eventId,
    {
      ...payload,
      triggeredAt: triggeredAtDate,
    }
  );

  if (isDuplicate) {
    return {
      status: 200,
      data: {
        alert: existingAlert,
        message: "Event already processed (idempotent)",
      },
    };
  }

  // Step 2: Mark as processed in Redis (cache the alert for future fast-path)
  await markIdempotencyKey(payload.eventId, JSON.stringify(existingAlert));

  // Step 3: Enqueue to BullMQ for processing (suppression check, status update, real-time push)
  const queue = getAlertQueue();
  await queue.add(
    QUEUE_NAME,
    { alertId: existingAlert.id },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );

  return {
    status: 202,
    data: {
      alert: existingAlert,
      message: "Event accepted and queued for processing",
    },
  };
}
