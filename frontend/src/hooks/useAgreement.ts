import { useEffect, useRef } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";
import type { AgreementBlock } from "@/lib/siteContent/types";

export type AgreementKind = "salary" | "personal";

/** What the server says is in force for a kind of loan. The form shows `data` and sends `version` back with the application. */
export interface AgreementInForce {
  kind: AgreementKind;
  key: string;
  version: number;
  built_in: boolean;
  data: AgreementBlock;
}

/**
 * The loan agreement a borrower applying now must accept ("salary" also covers HR and finance staff loans). Never cached: the borrower must
 * be shown, and accept, the text that is in force when they press Submit, and the server checks the version they saw.
 */
export function useAgreement(kind: AgreementKind) {
  return useQuery({
    queryKey: ["agreement", kind],
    queryFn: async () => (await axiosInstance.get<AgreementInForce>(`/api/site-content/agreement/${kind}`)).data,
    staleTime: 0,
    gcTime: 0,
    retry: 2,
    refetchOnWindowFocus: true,
  });
}

/**
 * The agreement is re-read when the page regains focus. If an admin published a new text while the borrower had the form open, their tick
 * ("I accept") belonged to the text they had read, not to this one: `onChanged` runs so the form clears the tick and asks again.
 */
export function useAgreementChanged(agreement: UseQueryResult<AgreementInForce>, onChanged: () => void) {
  const shown = useRef<number | null>(null);
  const version = agreement.data?.version ?? null;
  useEffect(() => {
    if (version === null) return;
    if (shown.current !== null && shown.current !== version) onChanged();
    shown.current = version;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);
}
