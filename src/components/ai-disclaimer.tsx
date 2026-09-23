import { AlertTriangle } from "lucide-react";

/**
 * Persistent safety callout shown above AI-generated lab output.
 * Intentionally not dismissible-forever: it re-appears with every new result.
 */
export function AiSafetyNotice({ className }: { className?: string }) {
  return (
    <div
      role="note"
      aria-label="AI-generated content warning"
      className={[
        "flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100",
        className ?? "",
      ].join(" ")}
    >
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      <p>
        <strong>AI-generated</strong> — verify all reagent concentrations, hazard classifications, and
        safety procedures against your lab&apos;s official SDS/SOP before use.
      </p>
    </div>
  );
}
