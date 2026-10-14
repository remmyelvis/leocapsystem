// ---------------------------------------------------------------------------
// In-memory mock user store — development only.
// Replace with Prisma / database calls before production.
// ---------------------------------------------------------------------------

export interface MockRegisteredUser {
  id: string;
  email: string;
  /** Plaintext for development. Use bcrypt hashes in production. */
  password: string;
  name: string;
  idNumber: string;
  phoneNumber: string;
}

export interface MockAdminUser {
  id: string;
  email: string;
  password: string;
  name: string;
  addedAt: Date;
  isPrimary: boolean;
}

/**
 * Module-level Map keyed by lowercase email.
 * Shared across requests within the same Node.js process (dev server).
 */
export const registeredUsersMap = new Map<string, MockRegisteredUser>();

/**
 * Admin users map — keyed by lowercase email.
 * Primary admin is seeded at startup.
 */
export const adminsMap = new Map<string, MockAdminUser>([
  [
    "admin@leocapinvest.com",
    {
      id: "admin-1",
      email: "admin@leocapinvest.com",
      password: "Admin@2024!",
      name: "Admin",
      addedAt: new Date("2024-01-01"),
      isPrimary: true,
    },
  ],
]);
