import {
  FlaskConical, Beaker, Droplets, Dna, Microscope, TestTubes,
  Atom, Activity, Layers, Calculator, Gauge, Thermometer,
  PieChart, Sigma, Scissors,
} from "lucide-react";
import type { ComponentType } from "react";

export type CalculatorCategory = "Solutions" | "Molecular Biology" | "Microbiology" | "Tools";

export interface CalculatorMeta {
  slug: string;
  label: string;
  short: string;
  description: string;
  category: CalculatorCategory;
  icon: ComponentType<{ className?: string }>;
}

export const CALCULATORS: CalculatorMeta[] = [
  { slug: "molarity", label: "Molarity", short: "Mass ↔ Concentration", description: "Calculate the mass of solute needed for a target molarity and volume.", category: "Solutions", icon: FlaskConical },
  { slug: "dilution", label: "Dilution (C₁V₁ = C₂V₂)", short: "Stock dilutions", description: "Solve any variable in C₁V₁ = C₂V₂ for stock and working solutions.", category: "Solutions", icon: Droplets },
  { slug: "serial-dilution", label: "Serial Dilution", short: "Dilution series table", description: "Generate a complete serial dilution table with concentrations and volumes.", category: "Solutions", icon: Layers },
  { slug: "buffer", label: "Buffer Preparation", short: "PBS, TAE, TBE, Tris", description: "Recipes and quantities for common laboratory buffers.", category: "Solutions", icon: Beaker },
  { slug: "ph", label: "pH Calculator", short: "Strong acid/base & H-H", description: "Compute pH for strong acids/bases and buffer pH via Henderson–Hasselbalch.", category: "Solutions", icon: Thermometer },
  { slug: "primer-tm", label: "PCR Primer Tm", short: "GC%, length, Tm", description: "Analyze primer sequences for length, GC content, and melting temperature.", category: "Molecular Biology", icon: Dna },
  { slug: "agarose-gel", label: "Agarose Gel", short: "Agarose & buffer", description: "Calculate agarose mass and buffer volume for a target gel.", category: "Molecular Biology", icon: Activity },
  { slug: "nucleic-acid", label: "DNA/RNA Concentration", short: "A260 → ng/µL", description: "Convert spectrophotometric A260 readings to concentration for dsDNA, ssDNA, RNA.", category: "Molecular Biology", icon: Atom },
  { slug: "loading-dye", label: "Loading Dye Mix", short: "Sample + dye", description: "Compute loading dye and sample volumes for gel loading.", category: "Molecular Biology", icon: TestTubes },
  { slug: "restriction-digest", label: "Restriction Digest", short: "Enzyme reaction setup", description: "Set up a restriction enzyme reaction with DNA, buffer, enzyme, and water.", category: "Molecular Biology", icon: Scissors },
  { slug: "media-prep", label: "Media Preparation", short: "LB, TSB, agar", description: "Prepare LB broth/agar, nutrient broth/agar, TSB, or custom media.", category: "Microbiology", icon: FlaskConical },
  { slug: "od600", label: "OD₆₀₀ Dilution", short: "Culture to target OD", description: "Dilute a bacterial culture from current OD₆₀₀ to a target OD₆₀₀.", category: "Microbiology", icon: Microscope },
  { slug: "cfu", label: "CFU Counter", short: "Colony forming units", description: "Compute CFU/mL from plate counts, dilution factor, and plated volume.", category: "Microbiology", icon: PieChart },
  { slug: "rpm-rcf", label: "RPM ↔ RCF", short: "Centrifuge conversion", description: "Convert between RPM and RCF (g-force) using rotor radius.", category: "Tools", icon: Gauge },
  { slug: "unit-converter", label: "Unit Converter", short: "Volume, mass, length…", description: "Convert volume, mass, length, temperature, and nucleic acid size units.", category: "Tools", icon: Sigma },
];

export const CALCULATOR_MAP = new Map(CALCULATORS.map((c) => [c.slug, c]));

export function getCalculator(slug: string): CalculatorMeta | undefined {
  return CALCULATOR_MAP.get(slug);
}

export { Calculator as CalculatorIcon };
