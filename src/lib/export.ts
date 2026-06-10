import jsPDF from "jspdf";

export interface ExportCalcInput {
  label: string;
  formula?: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  summary?: string;
}

export function exportCalculationPdf(d: ExportCalcInput) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = 60;
  const line = (txt: string, opts?: { bold?: boolean; size?: number }) => {
    doc.setFontSize(opts?.size ?? 11);
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    const wrapped = doc.splitTextToSize(txt, 480);
    doc.text(wrapped, 60, y);
    y += wrapped.length * (opts?.size ?? 11) * 1.2 + 4;
    if (y > 760) { doc.addPage(); y = 60; }
  };

  line("BioCalc AI", { bold: true, size: 16 });
  line(d.label, { bold: true, size: 13 });
  line(new Date().toLocaleString(), { size: 9 });
  y += 8;

  if (d.formula) { line("Formula:", { bold: true }); line(d.formula); y += 4; }
  if (d.summary) { line("Summary:", { bold: true }); line(d.summary); y += 4; }

  line("Inputs:", { bold: true });
  Object.entries(d.inputs).forEach(([k, v]) => line(`• ${k}: ${stringify(v)}`));
  y += 4;
  line("Results:", { bold: true });
  Object.entries(d.outputs).forEach(([k, v]) => line(`• ${k}: ${stringify(v)}`));

  doc.save(`${d.label.replace(/\s+/g, "_")}_${Date.now()}.pdf`);
}

export function exportProtocolPdf(title: string, summary: Record<string, unknown>) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = 60;
  const add = (txt: string, opts?: { bold?: boolean; size?: number }) => {
    doc.setFontSize(opts?.size ?? 11);
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    const w = doc.splitTextToSize(txt, 480);
    doc.text(w, 60, y);
    y += w.length * (opts?.size ?? 11) * 1.25 + 4;
    if (y > 760) { doc.addPage(); y = 60; }
  };
  add("Protocol Summary — BioCalc AI", { bold: true, size: 14 });
  add(title, { bold: true, size: 12 });
  add(new Date().toLocaleString(), { size: 9 });
  y += 6;
  for (const [k, v] of Object.entries(summary)) {
    add(humanize(k) + ":", { bold: true });
    if (Array.isArray(v)) v.forEach((item, i) => add(`${i + 1}. ${stringify(item)}`));
    else add(stringify(v));
    y += 4;
  }
  doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
}

export function exportPlanPdf(title: string, plan: Record<string, unknown>) {
  exportProtocolPdf(`Experiment Plan — ${title}`, plan);
}

export function downloadText(filename: string, text: string, mime = "text/plain") {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportToCsv(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) { downloadText(filename, ""); return; }
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const escape = (v: unknown) => {
    const s = stringify(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  downloadText(filename, csv, "text/csv");
}

function stringify(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
function humanize(k: string) {
  return k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
