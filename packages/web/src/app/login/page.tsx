"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLogin, useRegister } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login = useLogin();
  const register = useRegister();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"clinician" | "patient">("clinician");
  const [patientId, setPatientId] = useState("");
  const [error, setError] = useState("");

  // Redirect if already logged in
  if (isAuthenticated) {
    router.replace("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (isRegister) {
        await register.mutateAsync({
          email,
          password,
          name,
          role,
          patientId: role === "patient" ? patientId : undefined,
        });
      } else {
        await login.mutateAsync({ email, password });
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    }
  };

  const isLoading = login.isPending || register.isPending;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card padding="lg" className="w-full max-w-md">
        <div className="text-center">
          <span className="text-4xl">🚨</span>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">CareAlert</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isRegister ? "Create your account" : "Sign in to your account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {isRegister && (
            <Input
              label="Full Name"
              placeholder="Dr. Sarah Chen"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}

          <Input
            label="Email"
            type="email"
            placeholder="you@hospital.io"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            error={password.length > 0 && password.length < 6 ? "Password must be at least 6 characters" : undefined}
          />

          {isRegister && (
            <>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="role"
                      value="clinician"
                      checked={role === "clinician"}
                      onChange={() => setRole("clinician")}
                      className="text-brand-600"
                    />
                    Clinician
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="role"
                      value="patient"
                      checked={role === "patient"}
                      onChange={() => setRole("patient")}
                      className="text-brand-600"
                    />
                    Patient
                  </label>
                </div>
              </div>

              {role === "patient" && (
                <Input
                  label="Patient ID"
                  placeholder="PT-001"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  required
                />
              )}
            </>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            loading={isLoading}
          >
            {isRegister ? "Create Account" : "Sign In"}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-500">
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            {isRegister ? "Sign In" : "Create Account"}
          </button>
        </div>

        {/* Quick login for demo */}
        <div className="mt-6 border-t border-gray-200 pt-4">
          <p className="mb-2 text-center text-xs text-gray-400">Quick Demo Login</p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={async () => {
                try {
                  await login.mutateAsync({
                    email: "clinician@carealert.io",
                    password: "password123",
                  });
                  router.push("/dashboard");
                } catch (err: any) {
                  setError(err.message);
                }
              }}
            >
              Clinician
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={async () => {
                try {
                  await login.mutateAsync({
                    email: "patient1@carealert.io",
                    password: "password123",
                  });
                  router.push("/dashboard");
                } catch (err: any) {
                  setError(err.message);
                }
              }}
            >
              Patient
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
