import { eventBus } from "../events/bus.js";
import { getIO } from "./gateway.js";

export const registerSocketHandlers = () => {
  const io = getIO();

  // Alert created → push to relevant rooms
  eventBus.onEvent("alert:created", (payload) => {
    console.log(
      `Pushing alert:created to rooms (alert: ${payload.alertId}, patient: ${payload.patientId})`,
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

  // Alert suppressed → push batch notification
  eventBus.onEvent("alert:suppressed", (payload) => {
    console.log(
      `Pushing alert:suppressed to rooms (alert: ${payload.alertId}, patient: ${payload.patientId}, suppressedCount: ${payload.suppressedCount})`,
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

  console.log("Socket event handlers registered");
};
