import { eventBus } from "../events/bus.js";
import { getIO } from "./gateway.js";

/**
 * Register event bus listeners that relay alerts to connected clients
 * via Socket.io in real-time.
 *
 * Event flow:
 *   BullMQ Worker → eventBus.emit("alert:created") → this handler → socket.emit("alert:new")
 *   BullMQ Worker → eventBus.emit("alert:suppressed") → this handler → socket.emit("alert:suppressed")
 *
 * Targeting:
 *   - Clinicians in the "clinicians" room receive ALL alerts
 *   - Patients in the "patient:{patientId}" room receive ONLY their own alerts
 */
export function registerSocketHandlers(): void {
  const io = getIO();

  // ── Alert created → push to relevant rooms ──
  eventBus.onEvent("alert:created", (payload) => {
    console.log(
      `📡 Pushing alert:created to rooms (alert: ${payload.alertId}, patient: ${payload.patientId})`
    );

    // Push to all clinicians
    io.to("clinicians").emit("alert:new", {
      id: payload.alertId,
      patientId: payload.patientId,
      severity: payload.severity,
      message: payload.message,
      triggeredAt: payload.triggeredAt,
    });

    // Push to the specific patient
    io.to(`patient:${payload.patientId}`).emit("alert:new", {
      id: payload.alertId,
      patientId: payload.patientId,
      severity: payload.severity,
      message: payload.message,
      triggeredAt: payload.triggeredAt,
    });
  });

  // ── Alert suppressed → push batch notification ──
  eventBus.onEvent("alert:suppressed", (payload) => {
    console.log(
      `📡 Pushing alert:suppressed to rooms (alert: ${payload.alertId}, patient: ${payload.patientId}, suppressedCount: ${payload.suppressedCount})`
    );

    // Push to all clinicians
    io.to("clinicians").emit("alert:suppressed", {
      id: payload.alertId,
      patientId: payload.patientId,
      suppressedCount: payload.suppressedCount,
      severity: payload.severity,
      message: payload.message,
      triggeredAt: payload.triggeredAt,
    });

    // Push to the specific patient
    io.to(`patient:${payload.patientId}`).emit("alert:suppressed", {
      id: payload.alertId,
      patientId: payload.patientId,
      suppressedCount: payload.suppressedCount,
      severity: payload.severity,
      message: payload.message,
      triggeredAt: payload.triggeredAt,
    });
  });

  console.log("✅ Socket event handlers registered");
}
