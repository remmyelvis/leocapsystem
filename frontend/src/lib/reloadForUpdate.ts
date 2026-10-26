// Each page is its own file with a fingerprint in its name, and a deploy removes the old files. A tab that was opened before a
// deploy and then opens a page it has not loaded yet gets "not found" (public/assets/.htaccess makes that a real 404).
// The answer is to load the new version once. The flag stops a loop if the problem is something else (a bad connection).
const FLAG = "leocap.reloadedForUpdate";

/** Reloads the page once; false if it already did in the last 15 seconds (or storage is unavailable). */
export function reloadForUpdate(): boolean {
  try {
    if (sessionStorage.getItem(FLAG)) return false;
    sessionStorage.setItem(FLAG, "1");
    window.setTimeout(() => sessionStorage.removeItem(FLAG), 15000);
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

/** True for the errors a browser raises when a page file could not be fetched (not found, or the server answered with the app's HTML instead). */
export const isFileLoadError = (error: unknown) =>
  /dynamically imported module|importing a module script failed|failed to load module script|expected a javascript|unable to preload css/i.test(String((error as Error)?.message ?? error));
