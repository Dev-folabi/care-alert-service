import path from "path";
import { config as dotenvConfig } from "dotenv";

// Load .env before PrismaClient reads DATABASE_URL
dotenvConfig({ path: path.resolve(process.cwd(), ".env") });
dotenvConfig({ path: path.resolve(process.cwd(), "../../.env") }); // monorepo root fallback

import { PrismaClient, Role, Severity, AlertStatus } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.alert.deleteMany();
  await prisma.user.deleteMany();

  const salt = await bcryptjs.genSalt(10);

  // Create clinician user
  const clinician = await prisma.user.create({
    data: {
      email: "clinician@carealert.io",
      password: await bcryptjs.hash("password123", salt),
      name: "Dr. Sarah Chen",
      role: Role.CLINICIAN,
    },
  });

  // Create patient users
  const patient1 = await prisma.user.create({
    data: {
      email: "patient1@carealert.io",
      password: await bcryptjs.hash("password123", salt),
      name: "John Doe",
      role: Role.PATIENT,
      patientId: "PT-001",
    },
  });

  const patient2 = await prisma.user.create({
    data: {
      email: "patient2@carealert.io",
      password: await bcryptjs.hash("password123", salt),
      name: "Jane Smith",
      role: Role.PATIENT,
      patientId: "PT-002",
    },
  });

  // Create sample alerts
  const now = new Date();

  const alerts = await Promise.all([
    prisma.alert.create({
      data: {
        eventId: "evt-001",
        deviceId: "DEV-MON-01",
        patientId: "PT-001",
        severity: Severity.HIGH,
        message: "Heart rate exceeded 150 BPM",
        triggeredAt: new Date(now.getTime() - 5 * 60 * 1000),
        status: AlertStatus.ACTIVE,
        processedAt: new Date(now.getTime() - 5 * 60 * 1000 + 500),
      },
    }),
    prisma.alert.create({
      data: {
        eventId: "evt-002",
        deviceId: "DEV-MON-02",
        patientId: "PT-001",
        severity: Severity.LOW,
        message: "Blood pressure slightly elevated (140/90)",
        triggeredAt: new Date(now.getTime() - 15 * 60 * 1000),
        status: AlertStatus.ACTIVE,
        processedAt: new Date(now.getTime() - 15 * 60 * 1000 + 500),
      },
    }),
    prisma.alert.create({
      data: {
        eventId: "evt-003",
        deviceId: "DEV-MON-03",
        patientId: "PT-002",
        severity: Severity.MEDIUM,
        message: "Oxygen saturation dropped to 92%",
        triggeredAt: new Date(now.getTime() - 30 * 60 * 1000),
        status: AlertStatus.ACTIVE,
        processedAt: new Date(now.getTime() - 30 * 60 * 1000 + 500),
      },
    }),
    prisma.alert.create({
      data: {
        eventId: "evt-004",
        deviceId: "DEV-MON-01",
        patientId: "PT-001",
        severity: Severity.LOW,
        message: "Temperature reading 37.8°C",
        triggeredAt: new Date(now.getTime() - 60 * 60 * 1000),
        status: AlertStatus.SUPPRESSED,
        suppressedCount: 4,
        processedAt: new Date(now.getTime() - 60 * 60 * 1000 + 500),
      },
    }),
    prisma.alert.create({
      data: {
        eventId: "evt-005",
        deviceId: "DEV-MON-04",
        patientId: "PT-002",
        severity: Severity.HIGH,
        message: "Respiratory rate below 8 breaths/min",
        triggeredAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        status: AlertStatus.ACTIVE,
        processedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 500),
      },
    }),
  ]);

  console.log(`✅ Created ${1} clinician: ${clinician.email}`);
  console.log(`✅ Created ${2} patients: ${patient1.email}, ${patient2.email}`);
  console.log(`✅ Created ${alerts.length} sample alerts`);
  console.log("");
  console.log("🔑 Login credentials:");
  console.log("   Clinician: clinician@carealert.io / password123");
  console.log("   Patient 1: patient1@carealert.io / password123");
  console.log("   Patient 2: patient2@carealert.io / password123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
