import express from "express";
import cors from "cors";

// ── Route modules ──
import authRoutes from "./modules/auth/auth.routes.js";
import webhookRoutes from "./modules/webhook/webhook.routes.js";
import alertRoutes from "./modules/alert/alert.routes.js";

/**
 * Express app factory.
 *
 * Does NOT call .listen() — this makes the app testable
 * (supertest can use it without binding a port).
 *
 * The HTTP server is created in index.ts so Socket.io
 * can attach to it.
 */
export function createApp() {
  const app = express();

  // ── Global middleware ──

  // CORS
  app.use(cors({
    origin: "*", // In production, restrict to frontend domain
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Webhook-Signature"],
  }));

  // JSON body parser with raw body preservation for HMAC verification
  // The `verify` callback captures the raw body buffer before parsing
  app.use(
    express.json({
      verify(req: any, _res, buf) {
        req.rawBody = buf.toString("utf8");
      },
    })
  );

  app.use(express.urlencoded({ extended: true }));

  // ── Health check ──
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ── API routes ──
  app.use("/api/auth", authRoutes);
  app.use("/api/webhooks", webhookRoutes);
  app.use("/api/alerts", alertRoutes);

  // ── 404 handler ──
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // ── Global error handler ──
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err.status || 500;
    const message = err.message || "Internal server error";

    // Log full error in development
    if (process.env.NODE_ENV !== "production") {
      console.error(`❌ Error [${status}]: ${message}`);
      if (err.stack) {
        console.error(err.stack);
      }
    }

    res.status(status).json({
      error: message,
      // Include validation details if available
      ...(err.details && { details: err.details }),
    });
  });

  return app;
}
