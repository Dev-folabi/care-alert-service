export type Role = "CLINICIAN" | "PATIENT";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  patientId: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}
