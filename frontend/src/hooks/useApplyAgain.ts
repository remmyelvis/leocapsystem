import { useEffect, useRef, useState } from "react";
import { applicationApi } from "@/lib/applicationApi";

/**
 * "Apply again": when the form was opened from an earlier application (?again=<id>), fetch it once and let the form copy what does not change
 * between applications (employment details, designation, the amount asked for). Never the pay figures: they change month to month, and a
 * stale one would give a wrong eligible amount. Returns true once something was filled in, so the form can say so.
 * `skip` is asked first: a draft someone is already typing must not be overwritten.
 */
export function useApplyAgain(againId: string | null, skip: () => boolean, fill: (application: Record<string, unknown>) => void) {
  const [filled, setFilled] = useState(false);
  const started = useRef(false);
  useEffect(() => {
    if (!againId || started.current) return;
    started.current = true;
    if (skip()) return;
    applicationApi.getOne(againId).then(({ data }) => {
      const application = ((data as unknown as { application?: Record<string, unknown> } | null)?.application ?? data) as Record<string, unknown> | null | undefined;
      if (!application || typeof application !== "object") return; // not found, or not theirs: just an empty form
      fill(application);
      setFilled(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [againId]);
  return filled;
}
