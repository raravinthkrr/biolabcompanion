import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Upload, FileText, Save, Trash2, FileDown, Loader2 } from "lucide-react";

import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { summarizeProtocol, type ProtocolSummary } from "@/lib/ai.functions";
import { listProtocols, saveProtocol, deleteProtocol } from "@/lib/data.functions";
import { exportProtocolPdf, downloadText } from "@/lib/export";

export const Route = createFileRoute("/protocols")({
  head: () => ({
    meta: [
      { title: "AI Protocol Summarizer – BioCalc AI" },
      { name: "description", content: "Paste a protocol or upload PDF/DOCX/TXT and get a structured summary: steps, materials, safety, common mistakes." },
    ],
  }),
  component: ProtocolsPage,
});

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

async function readFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File too large (max 10 MB).");
  }
  const name = file.name.toLowerCase();
  if (file.type === "text/plain" || name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".markdown")) {
    return file.text();
  }
  if (name.endsWith(".pdf")) {
    // Use the legacy build + vite ?url worker for reliable browser loading.
    const pdfjs = await import("pdfjs-dist");
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default as string;
    type PdfMod = {
      GlobalWorkerOptions: { workerSrc: string };
      getDocument: (s: { data: ArrayBuffer }) => {
        promise: Promise<{ numPages: number; getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: Array<{ str?: string }> }> }> }>;
      };
    };
    const lib = pdfjs as unknown as PdfMod;
    lib.GlobalWorkerOptions.workerSrc = workerUrl;
    const buf = await file.arrayBuffer();
    const doc = await lib.getDocument({ data: buf }).promise;
    let text = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it) => it.str ?? "").join(" ") + "\n";
    }
    return text;
  }
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth") as unknown as { extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> };
    const buf = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
    return value;
  }
  throw new Error("Unsupported file type. Use .txt, .md, .pdf, or .docx");
}

function ProtocolsPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [result, setResult] = useState<ProtocolSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const summarizeFn = useServerFn(summarizeProtocol);
  const listFn = useServerFn(listProtocols);
  const saveFn = useServerFn(saveProtocol);
  const deleteFn = useServerFn(deleteProtocol);
  const qc = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
  }, []);

  const saved = useQuery({ queryKey: ["protocols"], queryFn: () => listFn({}), enabled: authed === true });

  async function handleUpload(file: File) {
    setUploading(true);
    setFileName(file.name);
    try {
      const t = await readFile(file);
      if (!t.trim()) throw new Error("No readable text found in file.");
      setText(t);
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
      toast.success(`Loaded ${file.name}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to read file.";
      console.error("file upload failed:", e);
      toast.error(msg);
      setFileName(null);
    }
    finally { setUploading(false); }
  }

  async function handleSummarize() {
    if (text.trim().length < 20) { toast.error("Provide more protocol text."); return; }
    setBusy(true);
    try {
      const r = await summarizeFn({ data: { text } });
      setResult(r);
      if (!title) setTitle(r.title);
      toast.success("Summary ready.");
    } catch (e) {
      console.error("summarizeProtocol failed:", e);
      const msg = e instanceof Error ? e.message : "";
      toast.error(msg.includes("AI") ? "The AI service is temporarily unavailable. Please try again in a few seconds." : msg || "Something went wrong. Please try again.");
    }
    finally { setBusy(false); }
  }

  async function handleSave() {
    if (!result) return;
    await saveFn({ data: { title: title || result.title, source_text: text, summary: result } });
    qc.invalidateQueries({ queryKey: ["protocols"] });
    toast.success("Saved.");
  }

  if (authed === false) return <NeedAuth title="Protocol Summarizer" />;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Badge variant="secondary">AI tool</Badge>
          <h1 className="text-3xl font-display font-bold mt-2">Protocol Summarizer</h1>
          <p className="text-muted-foreground mt-2">Paste a protocol or upload a file. Get a structured summary in seconds.</p>
        </motion.div>

        <div className="mt-8 grid lg:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <div>
              <Label htmlFor="title">Title (optional)</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Gibson Assembly v1" />
            </div>
            <div>
              <Label htmlFor="prot">Protocol text</Label>
              <Textarea id="prot" rows={14} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your protocol here, or upload a file below…" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className={cn("inline-flex items-center gap-2 cursor-pointer text-sm px-3 py-2 rounded-md border hover:bg-muted", uploading && "opacity-60 pointer-events-none")}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Reading file…" : "Upload .txt / .md / .pdf / .docx"}
                <input
                  type="file"
                  accept=".txt,.md,.markdown,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
                />
              </label>
              {fileName && !uploading && (
                <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={fileName}>{fileName}</span>
              )}
              <Button className="bg-gradient-primary text-primary-foreground ml-auto" onClick={handleSummarize} disabled={busy || uploading}>
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />} Summarize
              </Button>
            </div>
          </Card>

          <Card className="p-6 min-h-[400px]">
            {!result ? (
              <p className="text-sm text-muted-foreground italic">Your structured summary will appear here.</p>
            ) : (
              <div className="space-y-4 text-sm">
                <div>
                  <h2 className="font-display text-xl font-bold">{result.title}</h2>
                  <p className="text-muted-foreground mt-1">{result.summary}</p>
                </div>
                <Section title="Materials" items={result.materials} />
                <Section title="Reagents" items={result.reagents} />
                <Section title="Steps" items={result.steps} ordered />
                <Section title="Safety notes" items={result.safety_notes} />
                <Section title="Common mistakes" items={result.common_mistakes} />
                <p className="text-xs"><strong>Time estimate:</strong> {result.time_estimate}</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => exportProtocolPdf(title || result.title, result as unknown as Record<string, unknown>)}><FileDown className="h-4 w-4 mr-1" /> PDF</Button>
                  <Button size="sm" variant="outline" onClick={() => downloadText(`${title || result.title}.md`, toMarkdown(title || result.title, result), "text/markdown")}>Markdown</Button>
                  <Button size="sm" variant="outline" onClick={() => downloadText(`${title || result.title}.txt`, JSON.stringify(result, null, 2))}>TXT</Button>
                  <Button size="sm" onClick={handleSave} className="bg-gradient-primary text-primary-foreground ml-auto"><Save className="h-4 w-4 mr-1" /> Save</Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        <h2 className="mt-12 font-display font-bold text-xl">Saved protocols</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {(saved.data ?? []).map((p) => (
            <Card key={p.id} className="p-4">
              <div className="font-display font-semibold truncate">{p.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{new Date(p.created_at).toLocaleString()}</div>
              <div className="flex gap-1 mt-3">
                <Button size="sm" variant="outline" onClick={() => { setText(p.source_text); setTitle(p.title); setResult(p.summary as ProtocolSummary); }}>Open</Button>
                <Button size="sm" variant="ghost" onClick={() => exportProtocolPdf(p.title, p.summary as Record<string, unknown>)}><FileDown className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={async () => { await deleteFn({ data: { id: p.id } }); qc.invalidateQueries({ queryKey: ["protocols"] }); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
          {saved.data?.length === 0 && <p className="text-sm text-muted-foreground">No saved protocols yet.</p>}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({ title, items, ordered }: { title: string; items: string[]; ordered?: boolean }) {
  if (items.length === 0) return null;
  const Tag = ordered ? "ol" : "ul";
  return (
    <div>
      <div className="font-display font-semibold mb-1">{title}</div>
      <Tag className={ordered ? "list-decimal pl-5 space-y-1 text-muted-foreground" : "list-disc pl-5 space-y-1 text-muted-foreground"}>
        {items.map((i, n) => <li key={n}>{i}</li>)}
      </Tag>
    </div>
  );
}

function toMarkdown(title: string, r: ProtocolSummary) {
  return [`# ${title}`, "", r.summary, "",
    "## Materials", ...r.materials.map((m) => `- ${m}`), "",
    "## Reagents", ...r.reagents.map((m) => `- ${m}`), "",
    "## Steps", ...r.steps.map((s, i) => `${i + 1}. ${s}`), "",
    "## Safety notes", ...r.safety_notes.map((s) => `- ${s}`), "",
    "## Common mistakes", ...r.common_mistakes.map((s) => `- ${s}`), "",
    `**Time estimate:** ${r.time_estimate}`,
  ].join("\n");
}

export function NeedAuth({ title }: { title: string }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="p-8 max-w-md text-center shadow-elegant">
          <h1 className="text-2xl font-display font-bold">Sign in to use {title}</h1>
          <p className="text-muted-foreground mt-2">Your work is saved privately to your account.</p>
          <div className="mt-6"><Link to="/auth"><Button className="bg-gradient-primary text-primary-foreground">Sign in</Button></Link></div>
        </Card>
      </div>
      <SiteFooter />
    </div>
  );
}
