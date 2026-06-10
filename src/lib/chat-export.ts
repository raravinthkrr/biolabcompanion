import type { UIMessage } from "ai";
import { downloadText } from "./export";

export function exportChatMarkdown(messages: UIMessage[]) {
  const md = ["# BioCalc AI conversation", `_Exported ${new Date().toLocaleString()}_`, ""];
  for (const m of messages) {
    const text = m.parts.map((p) => p.type === "text" ? p.text : "").join("");
    md.push(`## ${m.role === "user" ? "You" : "BioCalc AI"}`, "", text, "");
  }
  downloadText(`biocalc-chat-${Date.now()}.md`, md.join("\n"), "text/markdown");
}
