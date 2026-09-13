import type { LoanApplication, LoanStatus } from "@/types/loan";

interface AppUser {
  name: string;
  email: string;
}

/**
 * Sends a loan application confirmation notification.
 * Replace with actual email provider (e.g. Resend, SendGrid) in production.
 */
export function sendApplicationConfirmation(
  user: AppUser,
  application: LoanApplication
): void {
  console.log("[Notification] Application confirmation:", {
    to: user.email,
    subject: "Loan Application Received – Leocap Invest",
    body: `Dear ${user.name}, your ${application.loanType} application (ID: ${application.id}) has been received and is under review.`,
  });
}

/**
 * Sends a loan status update notification.
 * Replace with actual email provider in production.
 */
export function sendStatusUpdate(
  user: AppUser,
  application: LoanApplication,
  newStatus: LoanStatus
): void {
  const statusMessages: Record<LoanStatus, string> = {
    PENDING: "is under review",
    APPROVED: "has been approved",
    DECLINED: "has been declined",
    DISBURSED: "has been disbursed",
    RATE_SET: "has had an interest rate set — please review and confirm",
    CONFIRMED: "has been confirmed and is awaiting final approval",
  };

  console.log("[Notification] Status update:", {
    to: user.email,
    subject: `Loan Application Update – Leocap Invest`,
    body: `Dear ${user.name}, your loan application (ID: ${application.id}) ${statusMessages[newStatus]}.`,
    applicationId: application.id,
    newStatus,
  });
}
