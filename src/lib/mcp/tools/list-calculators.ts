import { defineTool } from "@lovable.dev/mcp-js";
import { CALCULATORS } from "@/lib/calculators/registry";

export default defineTool({
  name: "list_calculators",
  title: "List calculators",
  description:
    "List all 15 available BioCalc AI laboratory calculators, grouped by category, with slug and description.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const items = CALCULATORS.map((c) => ({
      slug: c.slug,
      label: c.label,
      category: c.category,
      description: c.description,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(items, null, 2) }],
      structuredContent: { calculators: items },
    };
  },
});
