import { Link, useLocation } from "react-router-dom";
import { Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { exitPreview, previewMode } from "@/lib/siteContent/useSiteContent";

/** Shown to an admin who opened a public page from the Site content editor: they are seeing their unpublished drafts. */
export default function PreviewBar() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (!previewMode() || user?.role !== "ADMIN" || pathname.startsWith("/admin")) return null;
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 bottom-3 z-[55] flex justify-center px-3">
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl bg-slate-900 px-4 py-2 text-[13px] text-white shadow-xl ring-1 ring-white/15">
        <span className="inline-flex items-center gap-2 font-medium">
          <Eye className="h-4 w-4" aria-hidden /> Previewing unpublished changes. Only you can see this.
        </span>
        <span className="flex items-center gap-1">
          <Link to="/admin/site-content" className="inline-flex min-h-[32px] items-center rounded-lg px-2 font-semibold underline underline-offset-2 hover:bg-white/10">
            Back to the editor
          </Link>
          <button type="button" onClick={exitPreview} className="inline-flex min-h-[32px] items-center rounded-lg px-2 font-semibold underline underline-offset-2 hover:bg-white/10">
            Exit preview
          </button>
        </span>
      </div>
    </div>
  );
}
