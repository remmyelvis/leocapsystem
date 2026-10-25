import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

// A dialog shell, rendered on the page itself (not inside the section that opened it) so the dimming also covers the
// app's header and sidebar. Escape and a click outside close it, scrolling behind it is locked, and focus goes back to
// what opened it. Give it the id of its heading as titleId.
export function ModalShell({ titleId, onClose, children }: { titleId: string; onClose: () => void; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    box.current?.focus();
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; opener?.focus?.(); };
  }, []);
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
        className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl outline-none"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
