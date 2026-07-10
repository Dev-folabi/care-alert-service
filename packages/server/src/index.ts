import http from "http";
import { createApp } from "./app";
import { createSocketGateway } from "./socket/gateway";
import { registerSocketHandlers } from "./socket/handlers";
import { startAlertWorker } from "./modules/worker/alert.worker";
import { env } from "./config/env";
import { disconnectPrisma } from "./db/client";
import { disconnectRedis } from "./config/redis";
import { getIO } from "./socket/gateway";

const bootstrap = async () => {
  console.log("Starting Care Alert Notification Service...\n");

  const app = createApp();

  const server = http.createServer(app);

  createSocketGateway(server);

  registerSocketHandlers();

  const worker = startAlertWorker();

  server.listen(env.PORT, () => {
    console.log(`\n Server running on http://localhost:${env.PORT}`);
    console.log(`   Environment: ${env.NODE_ENV}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n ${signal} received. Shutting down gracefully...`);

    server.close(() => {
      console.log("HTTP server closed");
    });

    try {
      getIO().close();
      console.log("Socket.io closed");
    } catch {}

    try {
      await worker.close();
      console.log("BullMQ worker closed");
    } catch {}

    await disconnectPrisma();
    console.log("Database disconnected");

    await disconnectRedis();
    console.log("Redis disconnected");

    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
