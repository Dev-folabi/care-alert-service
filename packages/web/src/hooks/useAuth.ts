"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { disconnectSocket } from "@/lib/socket";
import type { AuthResponse, User } from "@/types/user";

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      api.post<AuthResponse>("/api/auth/login", credentials),
    onSuccess: (data) => {
      setAuth(data.token, data.user);
    },
  });
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (data: {
      email: string;
      password: string;
      name: string;
      role: string;
      patientId?: string;
    }) => api.post<AuthResponse>("/api/auth/register", data),
    onSuccess: (data) => {
      setAuth(data.token, data.user);
    },
  });
}

export function useCurrentUser() {
  const token = useAuthStore((s) => s.token);

  return useQuery<User>({
    queryKey: ["currentUser"],
    queryFn: () => api.get<User>("/api/auth/me"),
    enabled: !!token,
  });
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();

  return () => {
    disconnectSocket();
    logout();
    queryClient.clear();
  };
}
