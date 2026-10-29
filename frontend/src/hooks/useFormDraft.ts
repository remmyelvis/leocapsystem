import { useEffect, useRef, useState } from "react";
import type { FieldValues, UseFormGetValues, UseFormSetValue, UseFormWatch } from "react-hook-form";

// Keeps what someone has typed in a form for as long as the browser tab lives, so leaving to check a payslip or an M-Pesa message (and a phone
// that reloads the tab while they are away) does not cost them the form. It is sessionStorage on purpose: it is gone when the tab closes, which
// matters for pay figures on a shared phone. `skip` lists the fields never kept: the ones filled from the profile every time, and any consent tick.

const cleared = new Set<string>(); // drafts emptied by a successful submit: a save still waiting must not bring them back

const read = (key: string): Record<string, unknown> | null => {
  try {
    const raw = sessionStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

export function clearFormDraft(key: string | null) {
  if (!key) return;
  cleared.add(key);
  try {
    sessionStorage.removeItem(key);
  } catch {
    // storage blocked: nothing was kept anyway
  }
}

/**
 * Restores a saved draft once (when `key` is known) and saves every change after that. Returns true if a draft was put back.
 * `key` is null until the person is known (a draft belongs to one person on one form).
 */
export function useFormDraft<T extends FieldValues>(form: { watch: UseFormWatch<T>; getValues: UseFormGetValues<T>; setValue: UseFormSetValue<T> }, key: string | null, skip: string[]) {
  const [restored, setRestored] = useState(false);
  const { watch, getValues, setValue } = form;
  const skipRef = useRef(skip);
  skipRef.current = skip;

  useEffect(() => {
    if (!key) return;
    cleared.delete(key);
    const draft = read(key);
    if (draft) {
      let any = false;
      for (const [field, value] of Object.entries(draft)) {
        // a number the person cleared is stored as null: leave that field as it is
        if (skipRef.current.includes(field) || value === null || value === undefined || value === "") continue;
        setValue(field as never, value as never, { shouldDirty: true });
        any = true;
      }
      if (any) setRestored(true);
    }

    const save = () => {
      if (cleared.has(key)) return;
      const keep: Record<string, unknown> = {};
      for (const [field, value] of Object.entries(getValues())) if (!skipRef.current.includes(field) && value !== undefined) keep[field] = value;
      try {
        sessionStorage.setItem(key, JSON.stringify(keep));
      } catch {
        // storage full or blocked: the form still works, it just is not kept
      }
    };
    let timer: number | undefined;
    const sub = watch(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = undefined;
        save();
      }, 300);
    });
    return () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
        save(); // leaving the page: keep the last few keystrokes too
      }
      sub.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return restored;
}
