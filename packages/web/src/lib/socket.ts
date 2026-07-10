import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

let socketInstance: Socket | null = null;

/**
 * Get or create a Socket.io client instance.
 * Pass the JWT token for authentication.
 */
export function getSocketClient(token: string): Socket {
  if (socketInstance?.connected) {
    return socketInstance;
  }

  socketInstance = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  return socketInstance;
}

/**
 * Disconnect and clean up the socket instance.
 */
export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
