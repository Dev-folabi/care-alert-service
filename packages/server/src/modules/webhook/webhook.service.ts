import { getAlertQueue, QUEUE_NAME } from "../../config/queue";
import { handleIdempotency, markIdempotencyKey } from "../../utils/idempotency";

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
 */
export const ingestAlert = async (payload: WebhookPayload) => {
  const triggeredAtDate = new Date(payload.triggeredAt);

  // Idempotency check
  const { isDuplicate, existingAlert } = await handleIdempotency(
    payload.eventId,
    {
      ...payload,
      triggeredAt: triggeredAtDate,
    },
  );

  if (isDuplicate) {
    return {
      status: 200,
      data: {
        alert: existingAlert,
        message: "Event already processed",
      },
    };
  }

  // Mark as processed in Redis (cache the alert for future fast-path)
  await markIdempotencyKey(payload.eventId, JSON.stringify(existingAlert));

  // Enqueue for processing (suppression check, status update, real-time push)
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
    },
  );

  return {
    status: 202,
    data: {
      alert: existingAlert,
      message: "Event accepted and queued for processing",
    },
  };
};
