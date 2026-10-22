// One display format for people's names: trimmed, single spaces, each word capitalised
// ("ken  o'brien-barasa" / "WINNIE NJERI" -> "Ken O'Brien-Barasa" / "Winnie Njeri").
// Only for showing a name; the stored value is never changed. "HR" stays as is (staff accounts are named after their team).
export function formatName(name?: string | null): string {
  if (!name) return "";
  return name
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/(^|[\s\-'’.])([a-zà-ÿ])/g, (_, sep: string, letter: string) => sep + letter.toUpperCase())
    .replace(/\bHr\b/g, "HR");
}
