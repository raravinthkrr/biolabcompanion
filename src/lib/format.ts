// Shared helpers to turn raw stored objects/values into human-readable text.
// Used by the History page, PDF exports, and anywhere we display saved data.

export function humanizeKey(key: string): string {
  return key
    .replace(/[_\-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function stripMarkdown(input: string): string {
  if (!input) return "";
  let s = String(input);
  // Code fences
  s = s.replace(/```[a-zA-Z]*\n?/g, "").replace(/```/g, "");
  // Inline code
  s = s.replace(/`([^`]+)`/g, "$1");
  // Bold / italics
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/__([^_]+)__/g, "$1");
  s = s.replace(/(^|\s)\*([^*\n]+)\*/g, "$1$2");
  s = s.replace(/(^|\s)_([^_\n]+)_/g, "$1$2");
  // Headings
  s = s.replace(/^#{1,6}\s+/gm, "");
  // Block quotes
  s = s.replace(/^>\s?/gm, "");
  // Lists -> bullets
  s = s.replace(/^\s*[-*+]\s+/gm, "• ");
  // Links [text](url) -> text (url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");
  // HTML tags
  s = s.replace(/<[^>]+>/g, "");
  // Escaped chars
  s = s.replace(/\\([\\`*_{}\[\]()#+\-.!>])/g, "$1");
  // Collapse blank lines
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

export function formatScalar(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return String(v);
    // Trim long decimals but keep meaningful precision
    if (Number.isInteger(v)) return v.toString();
    const abs = Math.abs(v);
    if (abs >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (abs >= 1) return Number(v.toFixed(4)).toString();
    return Number(v.toPrecision(4)).toString();
  }
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string") return stripMarkdown(v);
  return "";
}

export interface KV {
  label: string;
  value: string;
}

/** Flatten any nested object/array into a clean list of label/value pairs. */
export function flattenForDisplay(data: unknown, prefix = ""): KV[] {
  if (data === null || data === undefined) return [];
  if (typeof data !== "object") {
    return [{ label: prefix || "Value", value: formatScalar(data) }];
  }
  const rows: KV[] = [];
  if (Array.isArray(data)) {
    data.forEach((item, idx) => {
      const label = prefix ? `${prefix} ${idx + 1}` : `Item ${idx + 1}`;
      if (item && typeof item === "object") {
        rows.push(...flattenForDisplay(item, label));
      } else {
        rows.push({ label, value: formatScalar(item) });
      }
    });
    return rows;
  }
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    const label = humanizeKey(k);
    const full = prefix ? `${prefix} – ${label}` : label;
    if (v && typeof v === "object") {
      rows.push(...flattenForDisplay(v, full));
    } else {
      rows.push({ label: full, value: formatScalar(v) });
    }
  }
  return rows;
}
