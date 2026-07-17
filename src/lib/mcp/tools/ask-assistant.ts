import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider, AI_MODELS } from "@/lib/ai-gateway.server";

export default defineTool({
  name: "ask_lab_assistant",
  title: "Ask the AI Lab Assistant",
  description:
    "One-shot question to the BioCalc AI lab assistant (molecular biology, microbiology, biochemistry, cloning, CRISPR, cell culture, enzyme kinetics). Returns a markdown answer.",
  inputSchema: {
    question: z.string().min(3).max(4000).describe("The lab question to answer."),
  },
  annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: false },
  handler: async ({ question }, _ctx: ToolContext) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return { content: [{ type: "text", text: "AI service not configured" }], isError: true };
    }
    const provider = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: provider(AI_MODELS.chat),
      system:
        "You are an expert biotechnology laboratory mentor. Give concise, scientifically accurate, markdown-formatted answers. Include exact reagent concentrations, times, and temperatures. Do not use raw LaTeX.",
      prompt: question,
    });
    return { content: [{ type: "text", text }], structuredContent: { answer: text } };
  },
});
