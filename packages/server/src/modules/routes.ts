import { Router } from "express";
import authRoutes from "./auth/auth.routes";
import webhookRoutes from "./webhook/webhook.routes";
import alertRoutes from "./alert/alert.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/webhooks", webhookRoutes);
router.use("/alerts", alertRoutes);

export default router;
