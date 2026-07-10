"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  // QueryClient is stable — created once outside the component
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
