"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useSocketStore } from "@/stores/socketStore";

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isConnected = useSocketStore((s) => s.isConnected);

  const navItems: NavItem[] =
    user?.role === "CLINICIAN"
      ? [
          { label: "Dashboard", href: "/dashboard", icon: "📊" },
        ]
      : [
          { label: "My Alerts", href: "/dashboard", icon: "🔔" },
        ];

  return (
    <aside className="flex h-full w-60 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-4">
        <span className="text-xl">🚨</span>
        <span className="text-lg font-bold text-gray-900">CareAlert</span>
      </div>

      {/* Connection status */}
      <div className="border-b border-gray-100 px-4 py-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-400"
            }`}
          />
          <span className="text-xs text-gray-500">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-brand-50 text-brand-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User info */}
      <div className="border-t border-gray-200 px-4 py-3">
        <div className="text-sm font-medium text-gray-900">{user?.name}</div>
        <div className="text-xs text-gray-500 capitalize">{user?.role?.toLowerCase()}</div>
      </div>
    </aside>
  );
}
