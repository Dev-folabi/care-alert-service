import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { getPrisma } from "../../db/client.js";
import { env } from "../../config/env.js";
import { Role } from "@prisma/client";

export interface JwtPayload {
  userId: string;
  role: Role;
  patientId: string | null;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
    patientId: string | null;
  };
}

function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

function toUserResponse(user: {
  id: string;
  email: string;
  name: string;
  role: Role;
  patientId: string | null;
  password?: string;
}) {
  const { password: _, ...safe } = user;
  return safe;
}

export async function register(
  email: string,
  password: string,
  name: string,
  role: string,
  patientId?: string
): Promise<AuthResponse> {
  const prisma = getPrisma();

  // Check if email already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw Object.assign(new Error("Email already registered"), { status: 409 });
  }

  // If patient role, check patientId uniqueness
  if (role === "patient" && patientId) {
    const existingPatient = await prisma.user.findUnique({
      where: { patientId },
    });
    if (existingPatient) {
      throw Object.assign(new Error("patientId already in use"), {
        status: 409,
      });
    }
  }

  const salt = await bcryptjs.genSalt(10);
  const hashedPassword = await bcryptjs.hash(password, salt);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: role === "clinician" ? Role.CLINICIAN : Role.PATIENT,
      patientId: role === "patient" ? patientId || null : null,
    },
  });

  const token = signToken({
    userId: user.id,
    role: user.role,
    patientId: user.patientId,
  });

  return {
    token,
    user: toUserResponse(user),
  };
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const prisma = getPrisma();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw Object.assign(new Error("Invalid credentials"), { status: 401 });
  }

  const isMatch = await bcryptjs.compare(password, user.password);
  if (!isMatch) {
    throw Object.assign(new Error("Invalid credentials"), { status: 401 });
  }

  const token = signToken({
    userId: user.id,
    role: user.role,
    patientId: user.patientId,
  });

  return {
    token,
    user: toUserResponse(user),
  };
}

export async function getMe(userId: string) {
  const prisma = getPrisma();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error("User not found"), { status: 404 });
  }

  return toUserResponse(user);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
