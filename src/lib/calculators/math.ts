// Pure calculation engines for all BioCalc AI calculators.
// All functions are deterministic, validated, and unit-aware.

export const VOLUME_TO_L: Record<string, number> = {
  µL: 1e-6, uL: 1e-6, mL: 1e-3, L: 1,
};
export const MASS_TO_G: Record<string, number> = {
  ng: 1e-9, µg: 1e-6, ug: 1e-6, mg: 1e-3, g: 1,
};
export const CONC_TO_M: Record<string, number> = {
  nM: 1e-9, µM: 1e-6, uM: 1e-6, mM: 1e-3, M: 1,
};

export function fmt(value: number, digits = 4): string {
  if (!isFinite(value)) return "—";
  if (value === 0) return "0";
  const abs = Math.abs(value);
  if (abs < 1e-4 || abs >= 1e6) return value.toExponential(digits);
  return Number(value.toPrecision(digits)).toString();
}

// ---------- Molarity ----------
export interface MolarityInput { mw: number; molarity: number; molarityUnit: keyof typeof CONC_TO_M; volume: number; volumeUnit: keyof typeof VOLUME_TO_L; }
export function molarityCalc({ mw, molarity, molarityUnit, volume, volumeUnit }: MolarityInput) {
  if (mw <= 0 || molarity <= 0 || volume <= 0) throw new Error("All values must be positive.");
  const M = molarity * CONC_TO_M[molarityUnit];
  const V = volume * VOLUME_TO_L[volumeUnit];
  const grams = mw * M * V;
  return {
    grams, mg: grams * 1000, mcg: grams * 1e6,
    formula: "mass (g) = MW × Molarity (M) × Volume (L)",
    steps: [
      `Molarity = ${molarity} ${molarityUnit} = ${M.toExponential(3)} M`,
      `Volume = ${volume} ${volumeUnit} = ${V.toExponential(3)} L`,
      `mass = ${mw} × ${M.toExponential(3)} × ${V.toExponential(3)} = ${grams.toExponential(4)} g`,
    ],
  };
}

// ---------- Dilution C1V1 = C2V2 (solve for one missing) ----------
export type DilutionVar = "C1" | "V1" | "C2" | "V2";
export interface DilutionInput { C1?: number; V1?: number; C2?: number; V2?: number; solveFor: DilutionVar; }
export function dilutionCalc({ C1, V1, C2, V2, solveFor }: DilutionInput) {
  const v = { C1, V1, C2, V2 };
  delete v[solveFor];
  for (const [k, val] of Object.entries(v)) if (val == null || val <= 0) throw new Error(`${k} must be > 0`);
  let result = 0;
  switch (solveFor) {
    case "C1": result = (C2! * V2!) / V1!; break;
    case "V1": result = (C2! * V2!) / C1!; break;
    case "C2": result = (C1! * V1!) / V2!; break;
    case "V2": result = (C1! * V1!) / C2!; break;
  }
  return { value: result, formula: "C₁ × V₁ = C₂ × V₂" };
}

// ---------- Serial Dilution ----------
export interface SerialDilutionInput { stock: number; foldChange: number; steps: number; volumePerTube: number; }
export function serialDilutionCalc({ stock, foldChange, steps, volumePerTube }: SerialDilutionInput) {
  if (stock <= 0 || foldChange <= 1 || steps < 1 || volumePerTube <= 0) throw new Error("Invalid inputs.");
  const transferVol = volumePerTube / (foldChange - 1);
  const diluentVol = volumePerTube - transferVol;
  const rows = [];
  let conc = stock;
  for (let i = 0; i < steps; i++) {
    rows.push({
      tube: i + 1, concentration: conc, transferFromPrev: i === 0 ? null : transferVol,
      diluentAdded: i === 0 ? volumePerTube : diluentVol, finalVolume: volumePerTube,
    });
    conc = conc / foldChange;
  }
  return { rows, transferVol, diluentVol };
}

// ---------- Buffer recipes ----------
export interface BufferRecipe { name: string; ingredients: { name: string; amount: string; notes?: string }[]; steps: string[]; storage: string; safety: string[]; }
export const BUFFER_RECIPES: Record<string, (volMl: number) => BufferRecipe> = {
  "PBS 1X": (v) => ({
    name: "Phosphate Buffered Saline (PBS), 1X, pH 7.4",
    ingredients: [
      { name: "NaCl", amount: `${(8 * v / 1000).toFixed(3)} g` },
      { name: "KCl", amount: `${(0.2 * v / 1000).toFixed(3)} g` },
      { name: "Na₂HPO₄", amount: `${(1.44 * v / 1000).toFixed(3)} g` },
      { name: "KH₂PO₄", amount: `${(0.24 * v / 1000).toFixed(3)} g` },
      { name: "Distilled water", amount: `to ${v} mL` },
    ],
    steps: [
      "Dissolve salts in ~80% of final volume of distilled water.",
      "Adjust pH to 7.4 with HCl.",
      "Bring to final volume with distilled water.",
      "Sterilize by autoclaving (121 °C, 20 min) or filter (0.22 µm).",
    ],
    storage: "Store at room temperature; refrigerate after opening.",
    safety: ["Wear gloves and goggles when handling concentrated acids."],
  }),
  "TAE 50X": (v) => ({
    name: "TAE Buffer, 50X (stock)",
    ingredients: [
      { name: "Tris base", amount: `${(242 * v / 1000).toFixed(2)} g` },
      { name: "Glacial acetic acid", amount: `${(57.1 * v / 1000).toFixed(2)} mL` },
      { name: "0.5 M EDTA (pH 8.0)", amount: `${(100 * v / 1000).toFixed(1)} mL` },
      { name: "Distilled water", amount: `to ${v} mL` },
    ],
    steps: [
      "Dissolve Tris base in ~700 mL of distilled water (for 1 L stock).",
      "Add acetic acid and 0.5 M EDTA stock.",
      "Bring to final volume with distilled water.",
      "Dilute 50× for working 1X TAE before use.",
    ],
    storage: "Store at room temperature, indefinite.",
    safety: ["Glacial acetic acid is corrosive — use fume hood and PPE."],
  }),
  "TBE 10X": (v) => ({
    name: "TBE Buffer, 10X (stock)",
    ingredients: [
      { name: "Tris base", amount: `${(108 * v / 1000).toFixed(2)} g` },
      { name: "Boric acid", amount: `${(55 * v / 1000).toFixed(2)} g` },
      { name: "0.5 M EDTA (pH 8.0)", amount: `${(40 * v / 1000).toFixed(1)} mL` },
      { name: "Distilled water", amount: `to ${v} mL` },
    ],
    steps: [
      "Dissolve Tris and boric acid in ~700 mL distilled water.",
      "Add EDTA stock; bring to final volume.",
      "Dilute 10× for working 1X TBE.",
    ],
    storage: "Room temperature; discard if precipitate forms.",
    safety: ["Boric acid is a reproductive toxin — handle with care."],
  }),
  "Tris-HCl 1 M": (v) => ({
    name: "1 M Tris-HCl buffer",
    ingredients: [
      { name: "Tris base", amount: `${(121.1 * v / 1000).toFixed(2)} g` },
      { name: "HCl", amount: "adjust to desired pH (typically 7.4 or 8.0)" },
      { name: "Distilled water", amount: `to ${v} mL` },
    ],
    steps: [
      "Dissolve Tris in ~80% of final volume.",
      "Adjust to target pH with concentrated HCl.",
      "Bring to final volume; autoclave to sterilize.",
    ],
    storage: "Room temperature; long-term at 4 °C.",
    safety: ["Concentrated HCl is corrosive — fume hood + PPE."],
  }),
};

// ---------- pH ----------
export function phStrongAcid(molarity: number) {
  if (molarity <= 0) throw new Error("Concentration must be > 0");
  return -Math.log10(molarity);
}
export function phStrongBase(molarity: number) {
  if (molarity <= 0) throw new Error("Concentration must be > 0");
  return 14 - -Math.log10(molarity);
}
export function phHendersonHasselbalch(pKa: number, base: number, acid: number) {
  if (base <= 0 || acid <= 0) throw new Error("Concentrations must be > 0");
  return pKa + Math.log10(base / acid);
}

// ---------- Primer Tm ----------
export function analyzePrimer(seq: string) {
  const s = seq.toUpperCase().replace(/\s+/g, "");
  if (!/^[ATGCU]+$/.test(s)) throw new Error("Sequence must contain only A, T, G, C, (U).");
  const a = (s.match(/A/g) || []).length;
  const t = (s.match(/[TU]/g) || []).length;
  const g = (s.match(/G/g) || []).length;
  const c = (s.match(/C/g) || []).length;
  const length = s.length;
  const gc = ((g + c) / length) * 100;
  // Wallace rule (suitable for short primers, <14 nt)
  const tmWallace = 2 * (a + t) + 4 * (g + c);
  // Salt-adjusted, basic
  const tmSalt = length < 14
    ? tmWallace
    : 64.9 + 41 * (g + c - 16.4) / length;
  return { length, a, t, g, c, gc, tmWallace, tmSalt };
}

// ---------- Agarose gel ----------
export function agaroseGel(percent: number, volumeMl: number) {
  if (percent <= 0 || percent > 5) throw new Error("Percent must be between 0 and 5.");
  if (volumeMl <= 0) throw new Error("Volume must be > 0.");
  const grams = (percent / 100) * volumeMl;
  return {
    grams, bufferVol: volumeMl,
    steps: [
      `Weigh ${grams.toFixed(3)} g of agarose.`,
      `Add to ${volumeMl} mL of 1X TAE or TBE buffer in a flask.`,
      "Microwave in 30 s bursts, swirling between, until fully dissolved.",
      "Cool to ~55 °C; add ethidium bromide or SYBR Safe per protocol.",
      "Pour into casting tray with comb; let solidify 20–30 min.",
    ],
  };
}

// ---------- Nucleic acid concentration ----------
export const NUCLEIC_FACTORS = { dsDNA: 50, ssDNA: 33, RNA: 40 } as const;
export function nucleicAcidConc(a260: number, type: keyof typeof NUCLEIC_FACTORS, dilution = 1, pathCm = 1) {
  if (a260 < 0) throw new Error("A260 must be ≥ 0");
  const factor = NUCLEIC_FACTORS[type];
  const ngPerUl = a260 * factor * dilution / pathCm;
  return { ngPerUl, ugPerMl: ngPerUl, factor };
}

// ---------- Loading dye ----------
export function loadingDyeMix(sampleVol: number, dyeStock: number) {
  // dyeStock e.g. 6 means "6X loading dye"
  if (sampleVol <= 0 || dyeStock < 2) throw new Error("Sample volume > 0 and dye stock ≥ 2X.");
  const dyeVol = sampleVol / (dyeStock - 1);
  return { dyeVol, totalVol: sampleVol + dyeVol };
}

// ---------- Restriction digest ----------
export interface DigestInput { dnaNg: number; dnaConcNgUl: number; enzymeUnits: number; enzymeConcU: number; bufferStock: number; reactionVol: number; }
export function restrictionDigest({ dnaNg, dnaConcNgUl, enzymeUnits, enzymeConcU, bufferStock, reactionVol }: DigestInput) {
  if (dnaNg <= 0 || dnaConcNgUl <= 0 || enzymeUnits <= 0 || enzymeConcU <= 0 || bufferStock < 2 || reactionVol <= 0)
    throw new Error("All values must be positive; buffer stock ≥ 2X.");
  const dnaVol = dnaNg / dnaConcNgUl;
  const enzymeVol = enzymeUnits / enzymeConcU;
  const bufferVol = reactionVol / bufferStock;
  const waterVol = reactionVol - dnaVol - enzymeVol - bufferVol;
  if (waterVol < 0) throw new Error("Components exceed reaction volume.");
  return { dnaVol, enzymeVol, bufferVol, waterVol, reactionVol };
}

// ---------- Media prep ----------
export const MEDIA_RECIPES: Record<string, { perLiter: { name: string; grams: number }[]; instructions: string[] }> = {
  "LB Broth": {
    perLiter: [
      { name: "Tryptone", grams: 10 },
      { name: "Yeast extract", grams: 5 },
      { name: "NaCl", grams: 10 },
    ],
    instructions: [
      "Dissolve components in 950 mL of distilled water.",
      "Adjust pH to 7.0 with NaOH if needed.",
      "Bring to 1 L final volume.",
      "Autoclave at 121 °C for 20 minutes.",
    ],
  },
  "LB Agar": {
    perLiter: [
      { name: "Tryptone", grams: 10 },
      { name: "Yeast extract", grams: 5 },
      { name: "NaCl", grams: 10 },
      { name: "Agar", grams: 15 },
    ],
    instructions: [
      "Combine ingredients in 950 mL water.",
      "Bring to 1 L; autoclave at 121 °C, 20 min.",
      "Cool to ~55 °C before adding antibiotics; pour plates.",
    ],
  },
  "Nutrient Broth": {
    perLiter: [
      { name: "Peptone", grams: 5 },
      { name: "Beef extract", grams: 3 },
      { name: "NaCl", grams: 5 },
    ],
    instructions: ["Dissolve, adjust pH to 7.0, autoclave 121 °C × 20 min."],
  },
  "Nutrient Agar": {
    perLiter: [
      { name: "Peptone", grams: 5 },
      { name: "Beef extract", grams: 3 },
      { name: "NaCl", grams: 5 },
      { name: "Agar", grams: 15 },
    ],
    instructions: ["Dissolve, adjust pH 7.0, autoclave, pour at 55 °C."],
  },
  "TSB": {
    perLiter: [
      { name: "Tryptone", grams: 17 },
      { name: "Soytone", grams: 3 },
      { name: "Dextrose", grams: 2.5 },
      { name: "NaCl", grams: 5 },
      { name: "K₂HPO₄", grams: 2.5 },
    ],
    instructions: ["Dissolve in water; adjust pH 7.3 ± 0.2; autoclave 121 °C × 15 min."],
  },
};

export function mediaPrep(mediaKey: string, volumeMl: number) {
  const r = MEDIA_RECIPES[mediaKey];
  if (!r) throw new Error("Unknown medium.");
  if (volumeMl <= 0) throw new Error("Volume must be > 0.");
  const scale = volumeMl / 1000;
  return {
    ingredients: r.perLiter.map((i) => ({ name: i.name, grams: i.grams * scale })),
    instructions: r.instructions,
    volumeMl,
  };
}

// ---------- OD600 ----------
export function od600Dilute(currentOD: number, targetOD: number, finalVol: number) {
  if (currentOD <= 0 || targetOD <= 0 || finalVol <= 0) throw new Error("All values must be positive.");
  if (targetOD >= currentOD) throw new Error("Target OD must be less than current OD for dilution.");
  const cultureVol = (targetOD * finalVol) / currentOD;
  const mediumVol = finalVol - cultureVol;
  return { cultureVol, mediumVol };
}

// ---------- CFU ----------
export function cfuCalc(colonies: number, dilutionFactor: number, platedMl: number) {
  if (colonies < 0 || dilutionFactor <= 0 || platedMl <= 0) throw new Error("Invalid values.");
  const cfuPerMl = colonies / (dilutionFactor * platedMl);
  return { cfuPerMl };
}

// ---------- RPM ↔ RCF ----------
export function rpmToRcf(rpm: number, radiusCm: number) {
  if (rpm <= 0 || radiusCm <= 0) throw new Error("Values must be > 0.");
  return 1.118e-5 * radiusCm * rpm * rpm;
}
export function rcfToRpm(rcf: number, radiusCm: number) {
  if (rcf <= 0 || radiusCm <= 0) throw new Error("Values must be > 0.");
  return Math.sqrt(rcf / (1.118e-5 * radiusCm));
}

// ---------- Unit converter ----------
export const UNIT_GROUPS = {
  volume: { µL: 1e-6, mL: 1e-3, L: 1 },
  mass: { ng: 1e-9, µg: 1e-6, mg: 1e-3, g: 1, kg: 1000 },
  length: { mm: 1e-3, cm: 1e-2, m: 1, km: 1000 },
  nucleicSize: { bp: 1, kb: 1000, Mb: 1e6 },
} as const;

export function convertUnit(value: number, group: keyof typeof UNIT_GROUPS, from: string, to: string): number {
  const g = UNIT_GROUPS[group] as Record<string, number>;
  if (!(from in g) || !(to in g)) throw new Error("Unsupported unit.");
  return (value * g[from]) / g[to];
}

export function convertTemperature(value: number, from: "C" | "F" | "K", to: "C" | "F" | "K"): number {
  let c: number;
  if (from === "C") c = value;
  else if (from === "F") c = (value - 32) * 5 / 9;
  else c = value - 273.15;
  if (to === "C") return c;
  if (to === "F") return c * 9 / 5 + 32;
  return c + 273.15;
}
