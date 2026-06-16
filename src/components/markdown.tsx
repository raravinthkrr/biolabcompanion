import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cleanAIResponse } from "@/lib/clean-ai-response";

export function Markdown({ children, clean = true }: { children: string; clean?: boolean }) {
  const content = clean ? cleanAIResponse(children) : children;
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-muted prose-pre:text-foreground prose-code:before:hidden prose-code:after:hidden prose-headings:font-display">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
