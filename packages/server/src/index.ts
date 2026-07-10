import http from "http";
import { createApp } from "./app.js";
import { createSocketGateway } from "./socket/gateway.js";
import { registerSocketHandlers } from "./socket/handlers.js";
import { startAlertWorker } from "./modules/worker/alert.worker.js";
import { env } from "./config/env.js";
import { disconnectPrisma } from "./db/client.js";
import { disconnectRedis } from "./config/redis.js";

async function bootstrap() {
  console.log("🚀 Starting Care Alert Notification Service...\n");

  // Step 1: Create Express app
  const app = createApp();

  // Step 2: Create HTTP server from Express app
  const server = http.createServer(app);

  // Step 3: Attach Socket.io to the HTTP server
  createSocketGateway(server);

  // Step 4: Register Socket.io event handlers
  registerSocketHandlers();

  // Step 5: Start BullMQ worker for alert processing
  const worker = startAlertWorker();

  // Step 6: Start listening
  server.listen(env.PORT, () => {
    console.log(`\n✅ Server running on http://localhost:${env.PORT}`);
    console.log(`   Environment: ${env.NODE_ENV}`);
    console.log(`   Health check: http://localhost:${env.PORT}/health`);
    console.log(`\n📋 API Endpoints:`);
    console.log(`   POST   /api/auth/register`);
    console.log(`   POST   /api/auth/login`);
    console.log(`   GET    /api/auth/me`);
    console.log(`   POST   /api/webhooks/alerts`);
    console.log(`   GET    /api/alerts`);
    console.log(`   GET    /api/alerts/mine`);
    console.log(`   GET    /api/alerts/:id`);
    console.log(`\n🔌 WebSocket:`);
    console.log(`   Connect with auth token to receive real-time alerts`);
    console.log(`   Events: alert:new, alert:suppressed\n`);
  });

  // ── Graceful shutdown ──
  const shutdown = async (signal: string) => {
    console.log(`\n⛔ ${signal} received. Shutting down gracefully...`);

    // Stop accepting new connections
    server.close(() => {
      console.log("✅ HTTP server closed");
    });

    // Close Socket.io
    try {
      const { getIO } = await import("./socket/gateway.js");
      getIO().close();
      console.log("✅ Socket.io closed");
    } catch {
      // Socket.io might not be initialized
    }

    // Close BullMQ worker
    try {
      await worker.close();
      console.log("✅ BullMQ worker closed");
    } catch {
      // Worker might not be running
    }

    // Disconnect Prisma
    await disconnectPrisma();
    console.log("✅ Database disconnected");

    // Disconnect Redis
    await disconnectRedis();
    console.log("✅ Redis disconnected");

    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
