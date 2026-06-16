// Cleans common LaTeX/markdown artifacts from raw LLM output so the UI
// renders human-readable text instead of raw TeX tokens.
export function cleanAIResponse(input: string): string {
  if (!input) return "";
  let s = input;

  // Strip display math wrappers $$...$$ and \[...\] -> keep inner content as code block.
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_m, inner) => "\n```\n" + inner.trim() + "\n```\n");
  s = s.replace(/\\\[([\s\S]+?)\\\]/g, (_m, inner) => "\n```\n" + inner.trim() + "\n```\n");

  // Inline math \( ... \) and single $...$ -> inline code.
  s = s.replace(/\\\(([\s\S]+?)\\\)/g, (_m, inner) => "`" + inner.trim() + "`");
  s = s.replace(/(?<!\\)\$([^\n$]{1,200}?)(?<!\\)\$/g, (_m, inner) => "`" + inner.trim() + "`");

  // Greek letters & common symbols.
  const map: Record<string, string> = {
    "\\mu": "μ", "\\alpha": "α", "\\beta": "β", "\\gamma": "γ", "\\delta": "δ",
    "\\epsilon": "ε", "\\zeta": "ζ", "\\eta": "η", "\\theta": "θ", "\\lambda": "λ",
    "\\pi": "π", "\\rho": "ρ", "\\sigma": "σ", "\\tau": "τ", "\\phi": "φ", "\\omega": "ω",
    "\\Delta": "Δ", "\\Sigma": "Σ", "\\Omega": "Ω",
    "\\times": "×", "\\cdot": "·", "\\div": "÷", "\\pm": "±", "\\mp": "∓",
    "\\circ": "°", "\\degree": "°", "\\ge": "≥", "\\geq": "≥", "\\le": "≤", "\\leq": "≤",
    "\\ne": "≠", "\\neq": "≠", "\\approx": "≈", "\\to": "→", "\\rightarrow": "→",
    "\\leftarrow": "←", "\\infty": "∞", "\\rightarrow ": "→ ",
  };
  for (const [k, v] of Object.entries(map)) {
    s = s.split(k).join(v);
  }

  // \text{...} -> just the text.
  s = s.replace(/\\text\{([^}]*)\}/g, "$1");
  s = s.replace(/\\mathrm\{([^}]*)\}/g, "$1");
  s = s.replace(/\\mathbf\{([^}]*)\}/g, "**$1**");
  s = s.replace(/\\textit\{([^}]*)\}/g, "*$1*");

  // \frac{a}{b} -> (a) / (b)
  s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1) / ($2)");
  // \sqrt{a} -> sqrt(a)
  s = s.replace(/\\sqrt\{([^{}]+)\}/g, "sqrt($1)");
  // ^{n} / _{n} -> ^n / _n
  s = s.replace(/\^\{([^{}]+)\}/g, "^$1");
  s = s.replace(/_\{([^{}]+)\}/g, "_$1");

  // Drop \left \right.
  s = s.replace(/\\left|\\right/g, "");

  // Drop stray backslashes before single letters/words (after replacements above).
  s = s.replace(/\\([a-zA-Z]+)/g, "$1");

  // Normalize whitespace.
  s = s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  return s.trim();
}
