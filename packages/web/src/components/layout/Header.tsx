"use client";

import { useAuthStore } from "@/stores/authStore";
import { useLogout } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

export function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">
          {user?.role === "CLINICIAN" ? "Clinician Dashboard" : "My Alerts"}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">{user?.email}</span>
        <Button variant="ghost" size="sm" onClick={logout}>
          Logout
        </Button>
      </div>
    </header>
  );
}
