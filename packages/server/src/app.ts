import express from "express";
import cors from "cors";
import routes from "./modules/routes";

export const createApp = () => {
  const app = express();

  // CORS
  app.use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Webhook-Signature"],
    }),
  );

  app.use(
    express.json({
      verify(req: any, _res, buf) {
        req.rawBody = buf.toString("utf8");
      },
    }),
  );

  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get("/health", (_req, res) => {
    res.status(200).json({
      success: true,
      message: "Server is healthy",
      data: { status: "ok", timestamp: new Date().toISOString() },
    });
  });

  // API routes
  app.use("/api", routes);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ success: false, message: "Not found", data: null });
  });

  // Global error handler
  app.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      const status = err.status || 500;
      const message = err.message || "Internal server error";

      // Log full error in development
      if (process.env.NODE_ENV !== "production") {
        console.error(`Error [${status}]: ${message}`);
        if (err.stack) {
          console.error(err.stack);
        }
      }

      res.status(status).json({
        success: false,
        message: message,
        data: err.details || null,
      });
    },
  );

  return app;
};
