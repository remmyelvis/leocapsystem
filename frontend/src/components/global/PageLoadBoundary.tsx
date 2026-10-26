import { Component, type ReactNode } from "react";
import { isFileLoadError, reloadForUpdate } from "@/lib/reloadForUpdate";

// Catches a page that failed to load or draw, so one broken page shows a message instead of a blank screen.
// A page file that is missing because the site was updated reloads the tab once; moving to another page clears the message.
export default class PageLoadBoundary extends Component<{ resetKey: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    if (isFileLoadError(error)) reloadForUpdate();
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="grid min-h-screen place-items-center p-6 text-center">
        <div className="max-w-sm space-y-3">
          <p className="text-base font-semibold text-slate-900">This page could not be loaded.</p>
          <p className="text-sm text-slate-600">Check your connection and try again. If the site was just updated, reloading fetches the new version.</p>
          <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            Reload
          </button>
        </div>
      </div>
    );
  }
}
