import { apiCall } from "@/lib/apiClient";

// Ideon and Nakama keep the names they always showed. Any other company shows the name saved at sign-in
// (from the companies list), or a label made from its code.
const KNOWN_LABELS: Record<string, string> = {
  ideon: "Ideon Limited",
  nakama: "Nakama Tech Limited",
};

export function companyLabel(code?: string | null, name?: string | null): string {
  const c = (code ?? "").toLowerCase();
  if (KNOWN_LABELS[c]) return KNOWN_LABELS[c];
  if (name) return name;
  return c.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export async function fetchCompanyName(code: string): Promise<string | undefined> {
  const { data } = await apiCall<{ companies?: { code: string; name: string }[] }>("/api/companies", {
    requiresAuth: false,
  });
  return data?.companies?.find((c) => c.code === code)?.name;
}

// Nakama and Ideon have their own repayment export routes (with their own bank details); every other company uses the generic one.
export function repaymentReportPath(company: string, format: "pdf" | "excel"): string {
  const segment = company === "ideon" || company === "nakama" ? company : `company/${company}`;
  return `/api/reports/applications/get-all/repayment/${segment}/${format}`;
}
