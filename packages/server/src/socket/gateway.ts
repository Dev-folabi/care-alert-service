import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { verifyToken, JwtPayload } from "../modules/auth/auth.service.js";

/**
 * Authenticated socket with user payload attached.
 */
export interface AuthenticatedSocket extends Socket {
  user: JwtPayload;
}

let io: SocketIOServer | null = null;

/**
 * Create and configure the Socket.io server.
 *
 * - Attaches to the given HTTP server
 * - JWT authentication on connection (handshake.auth.token)
 * - Clinicians join the "clinicians" room
 * - Patients join their own "patient:{patientId}" room
 * - Rejects connections without a valid JWT
 */
export function createSocketGateway(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*", // In production, restrict to frontend domain
      methods: ["GET", "POST"],
    },
  });

  // ── Authentication middleware ──
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication required: no token provided"));
    }

    try {
      const payload = verifyToken(token);
      (socket as AuthenticatedSocket).user = payload;
      next();
    } catch {
      return next(new Error("Authentication failed: invalid or expired token"));
    }
  });

  // ── Connection handler ──
  io.on("connection", (socket: Socket) => {
    const user = (socket as AuthenticatedSocket).user;
    console.log(`🔌 Socket connected: ${socket.id} (user: ${user.userId}, role: ${user.role})`);

    // Join role-based rooms
    if (user.role === "CLINICIAN") {
      socket.join("clinicians");
      console.log(`   → Joined room: clinicians`);
    }

    if (user.role === "PATIENT" && user.patientId) {
      socket.join(`patient:${user.patientId}`);
      console.log(`   → Joined room: patient:${user.patientId}`);
    }

    // ── Optional: Clinician subscribes to a specific patient ──
    socket.on("subscribe:patient", (data: { patientId: string }) => {
      if (user.role === "CLINICIAN") {
        socket.join(`patient:${data.patientId}`);
        console.log(`   → Clinician ${user.userId} subscribed to patient:${data.patientId}`);
      }
    });

    socket.on("unsubscribe:patient", (data: { patientId: string }) => {
      if (user.role === "CLINICIAN") {
        socket.leave(`patient:${data.patientId}`);
        console.log(`   → Clinician ${user.userId} unsubscribed from patient:${data.patientId}`);
      }
    });

    // ── Disconnect ──
    socket.on("disconnect", (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} (reason: ${reason})`);
    });
  });

  console.log("✅ Socket.io gateway initialized");
  return io;
}

/**
 * Get the Socket.io server instance.
 * Must be called after createSocketGateway().
 */
export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.io not initialized. Call createSocketGateway first.");
  }
  return io;
}
