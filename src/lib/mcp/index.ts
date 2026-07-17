import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCalculators from "./tools/list-calculators";
import listHistory from "./tools/list-history";
import listChatThreads from "./tools/list-chat-threads";
import readChatThread from "./tools/read-chat-thread";
import askAssistant from "./tools/ask-assistant";

// OAuth issuer must be the direct Supabase host (not the .lovable.cloud proxy).
// Vite inlines VITE_SUPABASE_PROJECT_ID as a literal at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "biocalc-ai-mcp",
  title: "BioCalc AI",
  version: "0.1.0",
  instructions:
    "Tools for BioCalc AI — a lab toolkit for molecular biology, microbiology, and biochemistry. `list_calculators` browses the 15 built-in calculators. `list_calculation_history` and `list_chat_threads`/`read_chat_thread` read the signed-in user's saved work. `ask_lab_assistant` asks a one-shot lab question.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCalculators, listHistory, listChatThreads, readChatThread, askAssistant],
});
