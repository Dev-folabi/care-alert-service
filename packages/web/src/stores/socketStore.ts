import { create } from "zustand";
import type { Socket } from "socket.io-client";

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  setSocket: (socket: Socket | null) => void;
  setConnected: (connected: boolean) => void;
  disconnect: () => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  setSocket: (socket: Socket | null) => {
    set({ socket });
  },

  setConnected: (connected: boolean) => {
    set({ isConnected: connected });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    set({ socket: null, isConnected: false });
  },
}));
