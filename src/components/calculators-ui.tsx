import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalculatorShell } from "@/components/calculator-shell";
import { getCalculator } from "@/lib/calculators/registry";
import {
  molarityCalc, dilutionCalc, serialDilutionCalc, BUFFER_RECIPES,
  phStrongAcid, phStrongBase, phHendersonHasselbalch,
  analyzePrimer, agaroseGel, nucleicAcidConc, NUCLEIC_FACTORS,
  loadingDyeMix, restrictionDigest, mediaPrep, MEDIA_RECIPES,
  od600Dilute, cfuCalc, rpmToRcf, rcfToRpm, convertUnit, convertTemperature, UNIT_GROUPS,
  fmt, type DilutionVar,
} from "@/lib/calculators/math";

function FieldNum(props: { id: string; label: string; value: string; onChange: (v: string) => void; unit?: React.ReactNode; min?: number; step?: string; placeholder?: string; }) {
  return (
    <div>
      <Label htmlFor={props.id}>{props.label}</Label>
      <div className="flex gap-2 mt-1">
        <Input id={props.id} type="number" step={props.step ?? "any"} min={props.min} value={props.value} placeholder={props.placeholder}
          onChange={(e) => props.onChange(e.target.value)} />
        {props.unit}
      </div>
    </div>
  );
}

function useNum(initial = ""): [string, (v: string) => void, number] {
  const [s, set] = useState(initial);
  return [s, set, parseFloat(s)];
}

function Result({ rows, title }: { rows: { k: string; v: React.ReactNode }[]; title?: string }) {
  return (
    <div>
      {title && <div className="font-display font-semibold mb-2">{title}</div>}
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.k} className="flex justify-between border-b pb-2 last:border-0">
            <span className="text-sm text-muted-foreground">{r.k}</span>
            <span className="font-mono text-sm font-medium">{r.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShellWrap({ slug, children }: { slug: string; children: (m: ReturnType<typeof getCalculator>) => React.ReactNode }) {
  const meta = getCalculator(slug);
  if (!meta) return <div className="p-8">Calculator not found.</div>;
  return <>{children(meta)}</>;
}

// ---------- Calculator UIs ----------

export function MolarityCalc() {
  const [mw, setMw, mwN] = useNum("58.44");
  const [m, setM, mN] = useNum("100");
  const [mu, setMu] = useState("mM");
  const [v, setV, vN] = useNum("250");
  const [vu, setVu] = useState("mL");
  let out: ReturnType<typeof molarityCalc> | null = null;
  let err = "";
  try { if (mwN && mN && vN) out = molarityCalc({ mw: mwN, molarity: mN, molarityUnit: mu as never, volume: vN, volumeUnit: vu as never }); }
  catch (e) { err = (e as Error).message; }
  return (
    <ShellWrap slug="molarity">{(meta) => (
      <CalculatorShell slug={meta!.slug} label={meta!.label} category={meta!.category} description={meta!.description}
        formula="mass (g) = MW × Molarity (M) × Volume (L)"
        inputsRecord={out ? { mw: mwN, molarity: `${mN} ${mu}`, volume: `${vN} ${vu}` } : undefined}
        outputsRecord={out ? { grams: fmt(out.grams), mg: fmt(out.mg), µg: fmt(out.mcg) } : undefined}
        summary={out ? `Need ${fmt(out.mg)} mg of compound (MW ${mwN}) for ${mN} ${mu} × ${vN} ${vu}.` : undefined}
        onReset={() => { setMw("58.44"); setM("100"); setMu("mM"); setV("250"); setVu("mL"); }}
        inputs={
          <>
            <FieldNum id="mw" label="Molecular weight (g/mol)" value={mw} onChange={setMw} />
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2"><FieldNum id="m" label="Desired molarity" value={m} onChange={setM} /></div>
              <div><Label>Unit</Label><Select value={mu} onValueChange={setMu}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["nM","µM","mM","M"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2"><FieldNum id="v" label="Final volume" value={v} onChange={setV} /></div>
              <div><Label>Unit</Label><Select value={vu} onValueChange={setVu}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["µL","mL","L"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
            </div>
          </>
        }
        result={err ? <p className="text-destructive text-sm">{err}</p> : out ? (
          <>
            <Result rows={[
              { k: "Mass (g)", v: fmt(out.grams) },
              { k: "Mass (mg)", v: fmt(out.mg) },
              { k: "Mass (µg)", v: fmt(out.mcg) },
            ]} />
            <details className="mt-4 text-xs"><summary className="cursor-pointer text-muted-foreground">Show steps</summary>
              <ol className="mt-2 space-y-1 font-mono">{out.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            </details>
          </>
        ) : null}
        explanation={<p>Molarity (M) = moles of solute per liter of solution. Mass = MW × molarity × volume (in liters). Always dissolve in less than the final volume, then bring up to volume.</p>}
      />
    )}</ShellWrap>
  );
}

export function DilutionCalc() {
  const [solveFor, setSolveFor] = useState<DilutionVar>("V1");
  const [c1, setC1] = useState("10");
  const [v1, setV1] = useState("");
  const [c2, setC2] = useState("1");
  const [v2, setV2] = useState("100");
  let out: number | null = null; let err = "";
  try {
    const r = dilutionCalc({ C1: parseFloat(c1) || undefined, V1: parseFloat(v1) || undefined, C2: parseFloat(c2) || undefined, V2: parseFloat(v2) || undefined, solveFor });
    out = r.value;
  } catch (e) { err = (e as Error).message; }
  const labels: Record<DilutionVar, string> = { C1: "Stock concentration", V1: "Stock volume", C2: "Final concentration", V2: "Final volume" };
  return (
    <ShellWrap slug="dilution">{(meta) => (
      <CalculatorShell slug={meta!.slug} label={meta!.label} category={meta!.category} description={meta!.description}
        formula="C₁ × V₁ = C₂ × V₂"
        inputsRecord={out != null ? { C1: c1, V1: v1, C2: c2, V2: v2, solveFor } : undefined}
        outputsRecord={out != null ? { [solveFor]: fmt(out) } : undefined}
        summary={out != null ? `Solved ${solveFor} = ${fmt(out)} (units match inputs)` : undefined}
        onReset={() => { setC1("10"); setV1(""); setC2("1"); setV2("100"); setSolveFor("V1"); }}
        inputs={
          <>
            <div>
              <Label>Solve for</Label>
              <Select value={solveFor} onValueChange={(v) => setSolveFor(v as DilutionVar)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{(["C1","V1","C2","V2"] as DilutionVar[]).map((k) => <SelectItem key={k} value={k}>{k} — {labels[k]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {(["C1","V1","C2","V2"] as DilutionVar[]).map((k) => (
              <FieldNum key={k} id={k} label={`${k} — ${labels[k]}${k === solveFor ? " (to compute)" : ""}`}
                value={k === "C1" ? c1 : k === "V1" ? v1 : k === "C2" ? c2 : v2}
                onChange={k === "C1" ? setC1 : k === "V1" ? setV1 : k === "C2" ? setC2 : setV2}
                placeholder={k === solveFor ? "leave blank" : ""}
              />
            ))}
          </>
        }
        result={err ? <p className="text-destructive text-sm">{err}</p> : out != null ? (
          <Result rows={[{ k: `${solveFor} (${labels[solveFor]})`, v: fmt(out) }]} />
        ) : null}
        explanation={<p>Use any consistent set of units. Common: C in mM, V in µL; the units cancel.</p>}
      />
    )}</ShellWrap>
  );
}

export function SerialDilutionCalc() {
  const [stock, setStock] = useState("1000");
  const [fold, setFold] = useState("10");
  const [steps, setSteps] = useState("6");
  const [vol, setVol] = useState("100");
  let out: ReturnType<typeof serialDilutionCalc> | null = null; let err = "";
  try { out = serialDilutionCalc({ stock: +stock, foldChange: +fold, steps: +steps, volumePerTube: +vol }); } catch (e) { err = (e as Error).message; }
  return (
    <ShellWrap slug="serial-dilution">{(meta) => (
      <CalculatorShell slug={meta!.slug} label={meta!.label} category={meta!.category} description={meta!.description}
        formula="Cₙ = C₀ / fold ⁿ ; transfer = V / (fold − 1)"
        inputsRecord={out ? { stock, foldChange: fold, steps, volumePerTube: vol } : undefined}
        outputsRecord={out ? { transferVol: fmt(out.transferVol), diluentVol: fmt(out.diluentVol), tubes: out.rows.length } : undefined}
        summary={out ? `${steps}-step ${fold}-fold serial dilution from ${stock}` : undefined}
        onReset={() => { setStock("1000"); setFold("10"); setSteps("6"); setVol("100"); }}
        inputs={
          <>
            <FieldNum id="stock" label="Starting concentration" value={stock} onChange={setStock} />
            <FieldNum id="fold" label="Fold change (e.g. 10)" value={fold} onChange={setFold} />
            <FieldNum id="steps" label="Number of dilutions" value={steps} onChange={setSteps} />
            <FieldNum id="vol" label="Volume per tube (µL or mL)" value={vol} onChange={setVol} />
          </>
        }
        result={err ? <p className="text-destructive text-sm">{err}</p> : out ? (
          <>
            <Result rows={[
              { k: "Transfer volume", v: fmt(out.transferVol) },
              { k: "Diluent volume", v: fmt(out.diluentVol) },
            ]} />
            <div className="mt-4 max-h-72 overflow-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Tube</TableHead><TableHead>Concentration</TableHead><TableHead>Transfer</TableHead><TableHead>Diluent</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {out.rows.map((r) => (
                    <TableRow key={r.tube}>
                      <TableCell>{r.tube}</TableCell>
                      <TableCell className="font-mono">{fmt(r.concentration)}</TableCell>
                      <TableCell className="font-mono">{r.transferFromPrev ? fmt(r.transferFromPrev) : "—"}</TableCell>
                      <TableCell className="font-mono">{fmt(r.diluentAdded)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : null}
        explanation={<p>Transfer the same fixed volume from one tube into a tube containing the same volume of diluent at the correct ratio. Mix thoroughly between steps with a fresh tip.</p>}
      />
    )}</ShellWrap>
  );
}

export function BufferCalc() {
  const [name, setName] = useState<keyof typeof BUFFER_RECIPES>("PBS 1X");
  const [vol, setVol] = useState("500");
  const recipe = useMemo(() => BUFFER_RECIPES[name](parseFloat(vol) || 0), [name, vol]);
  return (
    <ShellWrap slug="buffer">{(meta) => (
      <CalculatorShell slug={meta!.slug} label={meta!.label} category={meta!.category} description={meta!.description}
        inputsRecord={{ buffer: name, volume: `${vol} mL` }}
        outputsRecord={{ ingredients: recipe.ingredients, steps: recipe.steps }}
        summary={`${name}, ${vol} mL`}
        onReset={() => { setName("PBS 1X"); setVol("500"); }}
        inputs={
          <>
            <div>
              <Label>Buffer</Label>
              <Select value={name} onValueChange={(v) => setName(v as keyof typeof BUFFER_RECIPES)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.keys(BUFFER_RECIPES).map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <FieldNum id="vol" label="Final volume (mL)" value={vol} onChange={setVol} />
          </>
        }
        result={
          <div className="space-y-4 text-sm">
            <div>
              <div className="font-display font-semibold mb-2">{recipe.name}</div>
              <Table><TableHeader><TableRow><TableHead>Component</TableHead><TableHead>Amount</TableHead></TableRow></TableHeader>
                <TableBody>{recipe.ingredients.map((i) => <TableRow key={i.name}><TableCell>{i.name}</TableCell><TableCell className="font-mono">{i.amount}</TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
            <div>
              <div className="font-display font-semibold mb-2">Procedure</div>
              <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">{recipe.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            </div>
            <div className="text-xs text-muted-foreground"><strong>Storage:</strong> {recipe.storage}</div>
          </div>
        }
      />
    )}</ShellWrap>
  );
}

export function PhCalc() {
  const [mode, setMode] = useState<"acid"|"base"|"hh">("acid");
  const [conc, setConc] = useState("0.01");
  const [pKa, setPKa] = useState("4.76");
  const [base, setBase] = useState("0.1");
  const [acid, setAcid] = useState("0.1");
  let ph: number | null = null; let err = "";
  try {
    if (mode === "acid") ph = phStrongAcid(+conc);
    else if (mode === "base") ph = phStrongBase(+conc);
    else ph = phHendersonHasselbalch(+pKa, +base, +acid);
  } catch (e) { err = (e as Error).message; }
  return (
    <ShellWrap slug="ph">{(meta) => (
      <CalculatorShell slug={meta!.slug} label={meta!.label} category={meta!.category} description={meta!.description}
        formula={mode === "hh" ? "pH = pKa + log([A⁻] / [HA])" : mode === "acid" ? "pH = −log [H⁺]" : "pH = 14 − pOH"}
        inputsRecord={ph != null ? { mode, conc, pKa, base, acid } : undefined}
        outputsRecord={ph != null ? { pH: ph.toFixed(3) } : undefined}
        summary={ph != null ? `pH = ${ph.toFixed(3)}` : undefined}
        inputs={
          <>
            <div>
              <Label>Mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as never)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="acid">Strong acid (HCl, HNO₃…)</SelectItem>
                  <SelectItem value="base">Strong base (NaOH, KOH…)</SelectItem>
                  <SelectItem value="hh">Buffer (Henderson–Hasselbalch)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mode !== "hh" ? (
              <FieldNum id="conc" label="Concentration (M)" value={conc} onChange={setConc} />
            ) : (
              <>
                <FieldNum id="pka" label="pKa" value={pKa} onChange={setPKa} />
                <FieldNum id="base" label="[Conjugate base] (M)" value={base} onChange={setBase} />
                <FieldNum id="acid" label="[Acid] (M)" value={acid} onChange={setAcid} />
              </>
            )}
          </>
        }
        result={err ? <p className="text-destructive text-sm">{err}</p> : ph != null ? <Result rows={[{ k: "pH", v: ph.toFixed(3) }]} /> : null}
      />
    )}</ShellWrap>
  );
}

export function PrimerTmCalc() {
  const [seq, setSeq] = useState("ATGCGTACGTAGCTAGCTAGGC");
  let out: ReturnType<typeof analyzePrimer> | null = null; let err = "";
  try { out = analyzePrimer(seq); } catch (e) { err = (e as Error).message; }
  return (
    <ShellWrap slug="primer-tm">{(meta) => (
      <CalculatorShell slug={meta!.slug} label={meta!.label} category={meta!.category} description={meta!.description}
        formula="Tm (Wallace) = 2(A+T) + 4(G+C) ; Tm (salt-adj.) = 64.9 + 41(G+C−16.4)/n"
        inputsRecord={out ? { sequence: seq, length: out.length } : undefined}
        outputsRecord={out ? { GC: out.gc.toFixed(1), TmWallace: out.tmWallace.toFixed(1), TmSaltAdj: out.tmSalt.toFixed(1) } : undefined}
        summary={out ? `${out.length} nt, GC ${out.gc.toFixed(1)}%, Tm ≈ ${(out.length < 14 ? out.tmWallace : out.tmSalt).toFixed(1)}°C` : undefined}
        onReset={() => setSeq("")}
        inputs={
          <div>
            <Label htmlFor="seq">Primer sequence (A, T, G, C)</Label>
            <Textarea id="seq" rows={4} className="font-mono mt-1 uppercase" value={seq} onChange={(e) => setSeq(e.target.value)} />
          </div>
        }
        result={err ? <p className="text-destructive text-sm">{err}</p> : out ? (
          <Result rows={[
            { k: "Length", v: `${out.length} nt` },
            { k: "A / T / G / C", v: `${out.a} / ${out.t} / ${out.g} / ${out.c}` },
            { k: "GC content", v: `${out.gc.toFixed(1)} %` },
            { k: "Tm (Wallace)", v: `${out.tmWallace.toFixed(1)} °C` },
            { k: "Tm (salt-adj.)", v: `${out.tmSalt.toFixed(1)} °C` },
          ]} />
        ) : null}
        explanation={<p>Wallace rule is accurate for primers &lt; 14 nt. For longer primers prefer salt-adjusted or nearest-neighbor methods. Aim for a Tm of 55–65 °C and GC of 40–60 % for most PCR.</p>}
      />
    )}</ShellWrap>
  );
}

export function AgaroseCalc() {
  const [percent, setPercent] = useState("1");
  const [vol, setVol] = useState("100");
  let out: ReturnType<typeof agaroseGel> | null = null; let err = "";
  try { out = agaroseGel(+percent, +vol); } catch (e) { err = (e as Error).message; }
  return (
    <ShellWrap slug="agarose-gel">{(meta) => (
      <CalculatorShell slug={meta!.slug} label={meta!.label} category={meta!.category} description={meta!.description}
        formula="agarose (g) = (% / 100) × buffer (mL)"
        inputsRecord={out ? { percent, volume_mL: vol } : undefined}
        outputsRecord={out ? { agarose_g: fmt(out.grams) } : undefined}
        summary={out ? `${percent}% gel in ${vol} mL` : undefined}
        inputs={
          <>
            <FieldNum id="pct" label="Gel percentage (%)" value={percent} onChange={setPercent} />
            <FieldNum id="vol" label="Buffer volume (mL)" value={vol} onChange={setVol} />
          </>
        }
        result={err ? <p className="text-destructive text-sm">{err}</p> : out ? (
          <>
            <Result rows={[{ k: "Agarose", v: `${out.grams.toFixed(3)} g` }, { k: "Buffer (1X TAE/TBE)", v: `${vol} mL` }]} />
            <ol className="mt-4 list-decimal pl-5 text-sm text-muted-foreground space-y-1">{out.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          </>
        ) : null}
      />
    )}</ShellWrap>
  );
}

export function NucleicAcidCalc() {
  const [a260, setA260] = useState("0.5");
  const [type, setType] = useState<keyof typeof NUCLEIC_FACTORS>("dsDNA");
  const [dil, setDil] = useState("1");
  const [path, setPath] = useState("1");
  let out: ReturnType<typeof nucleicAcidConc> | null = null; let err = "";
  try { out = nucleicAcidConc(+a260, type, +dil, +path); } catch (e) { err = (e as Error).message; }
  return (
    <ShellWrap slug="nucleic-acid">{(meta) => (
      <CalculatorShell slug={meta!.slug} label={meta!.label} category={meta!.category} description={meta!.description}
        formula="conc (ng/µL) = A260 × ε × dilution / path"
        inputsRecord={out ? { a260, type, dilution: dil, path_cm: path } : undefined}
        outputsRecord={out ? { ng_per_uL: fmt(out.ngPerUl) } : undefined}
        summary={out ? `${type}: ${out.ngPerUl.toFixed(1)} ng/µL` : undefined}
        inputs={
          <>
            <FieldNum id="a260" label="A260" value={a260} onChange={setA260} />
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as never)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.keys(NUCLEIC_FACTORS).map((k) => <SelectItem key={k} value={k}>{k} (ε = {NUCLEIC_FACTORS[k as keyof typeof NUCLEIC_FACTORS]})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <FieldNum id="dil" label="Dilution factor" value={dil} onChange={setDil} />
            <FieldNum id="path" label="Path length (cm)" value={path} onChange={setPath} />
          </>
        }
        result={err ? <p className="text-destructive text-sm">{err}</p> : out ? (
          <Result rows={[
            { k: "Concentration", v: `${out.ngPerUl.toFixed(2)} ng/µL` },
            { k: "Equivalent", v: `${out.ngPerUl.toFixed(2)} µg/mL` },
            { k: "Extinction coefficient (ε)", v: `${out.factor}` },
          ]} />
        ) : null}
      />
    )}</ShellWrap>
  );
}

export function LoadingDyeCalc() {
  const [sample, setSample] = useState("10");
  const [stock, setStock] = useState("6");
  let out: ReturnType<typeof loadingDyeMix> | null = null; let err = "";
  try { out = loadingDyeMix(+sample, +stock); } catch (e) { err = (e as Error).message; }
  return (
    <ShellWrap slug="loading-dye">{(meta) => (
      <CalculatorShell slug={meta!.slug} label={meta!.label} category={meta!.category} description={meta!.description}
        formula="dye = sample / (stock − 1)"
        inputsRecord={out ? { sample_uL: sample, dye_stock_X: stock } : undefined}
        outputsRecord={out ? { dye_uL: fmt(out.dyeVol), total_uL: fmt(out.totalVol) } : undefined}
        summary={out ? `Add ${out.dyeVol.toFixed(2)} µL of ${stock}X dye to ${sample} µL of sample.` : undefined}
        inputs={
          <>
            <FieldNum id="sample" label="Sample volume (µL)" value={sample} onChange={setSample} />
            <FieldNum id="stock" label="Loading dye stock (X)" value={stock} onChange={setStock} />
          </>
        }
        result={err ? <p className="text-destructive text-sm">{err}</p> : out ? (
          <Result rows={[
            { k: "Dye to add", v: `${out.dyeVol.toFixed(2)} µL` },
            { k: "Total loaded volume", v: `${out.totalVol.toFixed(2)} µL` },
          ]} />
        ) : null}
      />
    )}</ShellWrap>
  );
}

export function RestrictionDigestCalc() {
  const [dnaNg, setDnaNg] = useState("1000");
  const [dnaConc, setDnaConc] = useState("100");
  const [units, setUnits] = useState("10");
  const [enzConc, setEnzConc] = useState("20");
  const [bufX, setBufX] = useState("10");
  const [vol, setVol] = useState("50");
  let out: ReturnType<typeof restrictionDigest> | null = null; let err = "";
  try { out = restrictionDigest({ dnaNg: +dnaNg, dnaConcNgUl: +dnaConc, enzymeUnits: +units, enzymeConcU: +enzConc, bufferStock: +bufX, reactionVol: +vol }); }
  catch (e) { err = (e as Error).message; }
  return (
    <ShellWrap slug="restriction-digest">{(meta) => (
      <CalculatorShell slug={meta!.slug} label={meta!.label} category={meta!.category} description={meta!.description}
        inputsRecord={out ? { dnaNg, dnaConc, units, enzConc, bufX, vol } : undefined}
        outputsRecord={out ? { dna_uL: fmt(out.dnaVol), buffer_uL: fmt(out.bufferVol), enzyme_uL: fmt(out.enzymeVol), water_uL: fmt(out.waterVol) } : undefined}
        summary={out ? `Reaction: ${vol} µL total, ${dnaNg} ng DNA, ${units} U enzyme.` : undefined}
        inputs={
          <>
            <FieldNum id="dnang" label="DNA mass to digest (ng)" value={dnaNg} onChange={setDnaNg} />
            <FieldNum id="dnaconc" label="DNA stock conc. (ng/µL)" value={dnaConc} onChange={setDnaConc} />
            <FieldNum id="u" label="Enzyme units (U)" value={units} onChange={setUnits} />
            <FieldNum id="ec" label="Enzyme stock (U/µL)" value={enzConc} onChange={setEnzConc} />
            <FieldNum id="bx" label="Buffer stock (X)" value={bufX} onChange={setBufX} />
            <FieldNum id="rv" label="Reaction volume (µL)" value={vol} onChange={setVol} />
          </>
        }
        result={err ? <p className="text-destructive text-sm">{err}</p> : out ? (
          <Result rows={[
            { k: "DNA", v: `${out.dnaVol.toFixed(2)} µL` },
            { k: "Buffer", v: `${out.bufferVol.toFixed(2)} µL` },
            { k: "Enzyme", v: `${out.enzymeVol.toFixed(2)} µL` },
            { k: "Water (nuclease-free)", v: `${out.waterVol.toFixed(2)} µL` },
            { k: "Total", v: `${out.reactionVol.toFixed(2)} µL` },
          ]} />
        ) : null}
        explanation={<p>Enzyme should typically be ≤ 10% of the reaction volume to limit glycerol carryover. Incubate at the enzyme's recommended temperature, then heat-inactivate per the manufacturer.</p>}
      />
    )}</ShellWrap>
  );
}

export function MediaPrepCalc() {
  const [media, setMedia] = useState<keyof typeof MEDIA_RECIPES>("LB Broth");
  const [vol, setVol] = useState("1000");
  let out: ReturnType<typeof mediaPrep> | null = null; let err = "";
  try { out = mediaPrep(media, +vol); } catch (e) { err = (e as Error).message; }
  return (
    <ShellWrap slug="media-prep">{(meta) => (
      <CalculatorShell slug={meta!.slug} label={meta!.label} category={meta!.category} description={meta!.description}
        inputsRecord={out ? { media, volume_mL: vol } : undefined}
        outputsRecord={out ? { ingredients: out.ingredients } : undefined}
        summary={out ? `${media}, ${vol} mL` : undefined}
        inputs={
          <>
            <div>
              <Label>Medium</Label>
              <Select value={media} onValueChange={(v) => setMedia(v as keyof typeof MEDIA_RECIPES)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.keys(MEDIA_RECIPES).map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <FieldNum id="mv" label="Volume (mL)" value={vol} onChange={setVol} />
          </>
        }
        result={err ? <p className="text-destructive text-sm">{err}</p> : out ? (
          <div className="text-sm space-y-3">
            <Table><TableHeader><TableRow><TableHead>Component</TableHead><TableHead>Amount</TableHead></TableRow></TableHeader>
              <TableBody>{out.ingredients.map((i) => <TableRow key={i.name}><TableCell>{i.name}</TableCell><TableCell className="font-mono">{i.grams.toFixed(3)} g</TableCell></TableRow>)}</TableBody>
            </Table>
            <ol className="list-decimal pl-5 text-muted-foreground space-y-1">{out.instructions.map((s, i) => <li key={i}>{s}</li>)}</ol>
          </div>
        ) : null}
      />
    )}</ShellWrap>
  );
}

export function Od600Calc() {
  const [cur, setCur] = useState("1.2");
  const [tgt, setTgt] = useState("0.05");
  const [vol, setVol] = useState("50");
  let out: ReturnType<typeof od600Dilute> | null = null; let err = "";
  try { out = od600Dilute(+cur, +tgt, +vol); } catch (e) { err = (e as Error).message; }
  return (
    <ShellWrap slug="od600">{(meta) => (
      <CalculatorShell slug={meta!.slug} label={meta!.label} category={meta!.category} description={meta!.description}
        formula="Vculture = (ODtarget × Vfinal) / ODcurrent"
        inputsRecord={out ? { currentOD: cur, targetOD: tgt, finalVol: vol } : undefined}
        outputsRecord={out ? { culture_mL: fmt(out.cultureVol), medium_mL: fmt(out.mediumVol) } : undefined}
        summary={out ? `Take ${out.cultureVol.toFixed(2)} mL + ${out.mediumVol.toFixed(2)} mL medium → ${vol} mL @ OD ${tgt}` : undefined}
        inputs={
          <>
            <FieldNum id="cur" label="Current OD₆₀₀" value={cur} onChange={setCur} />
            <FieldNum id="tgt" label="Target OD₆₀₀" value={tgt} onChange={setTgt} />
            <FieldNum id="vol" label="Final volume (mL)" value={vol} onChange={setVol} />
          </>
        }
        result={err ? <p className="text-destructive text-sm">{err}</p> : out ? (
          <Result rows={[
            { k: "Culture to take", v: `${out.cultureVol.toFixed(3)} mL` },
            { k: "Fresh medium to add", v: `${out.mediumVol.toFixed(3)} mL` },
            { k: "Final OD₆₀₀", v: tgt },
          ]} />
        ) : null}
      />
    )}</ShellWrap>
  );
}

export function CfuCalcUI() {
  const [col, setCol] = useState("120");
  const [df, setDf] = useState("0.0001");
  const [vol, setVol] = useState("0.1");
  let out: ReturnType<typeof cfuCalc> | null = null; let err = "";
  try { out = cfuCalc(+col, +df, +vol); } catch (e) { err = (e as Error).message; }
  return (
    <ShellWrap slug="cfu">{(meta) => (
      <CalculatorShell slug={meta!.slug} label={meta!.label} category={meta!.category} description={meta!.description}
        formula="CFU/mL = colonies / (dilution factor × plated volume in mL)"
        inputsRecord={out ? { colonies: col, dilutionFactor: df, plated_mL: vol } : undefined}
        outputsRecord={out ? { cfu_per_mL: fmt(out.cfuPerMl) } : undefined}
        summary={out ? `${fmt(out.cfuPerMl)} CFU/mL` : undefined}
        inputs={
          <>
            <FieldNum id="col" label="Colony count" value={col} onChange={setCol} />
            <FieldNum id="df" label="Dilution factor (e.g. 1e-4)" value={df} onChange={setDf} />
            <FieldNum id="pv" label="Plated volume (mL)" value={vol} onChange={setVol} />
          </>
        }
        result={err ? <p className="text-destructive text-sm">{err}</p> : out ? (
          <Result rows={[{ k: "CFU/mL", v: fmt(out.cfuPerMl) }]} />
        ) : null}
        explanation={<p>Aim for plates with 30–300 colonies for accuracy. The dilution factor is the fraction plated relative to the original culture (e.g. 1:10,000 = 1e-4).</p>}
      />
    )}</ShellWrap>
  );
}

export function RpmRcfCalc() {
  const [rpm, setRpm] = useState("13000");
  const [rcf, setRcf] = useState("");
  const [r, setR] = useState("8.5");
  const [mode, setMode] = useState<"to-rcf" | "to-rpm">("to-rcf");
  let outRcf = 0, outRpm = 0; let err = "";
  try {
    if (mode === "to-rcf") outRcf = rpmToRcf(+rpm, +r);
    else outRpm = rcfToRpm(+rcf, +r);
  } catch (e) { err = (e as Error).message; }
  return (
    <ShellWrap slug="rpm-rcf">{(meta) => (
      <CalculatorShell slug={meta!.slug} label={meta!.label} category={meta!.category} description={meta!.description}
        formula="RCF = 1.118 × 10⁻⁵ × r × RPM²"
        inputsRecord={{ mode, rpm, rcf, radius_cm: r }}
        outputsRecord={mode === "to-rcf" ? { rcf_g: fmt(outRcf) } : { rpm: fmt(outRpm) }}
        summary={mode === "to-rcf" ? `${rpm} RPM @ ${r} cm = ${fmt(outRcf)} × g` : `${rcf} × g @ ${r} cm = ${fmt(outRpm)} RPM`}
        inputs={
          <>
            <div>
              <Label>Convert</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as never)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="to-rcf">RPM → RCF</SelectItem><SelectItem value="to-rpm">RCF → RPM</SelectItem></SelectContent>
              </Select>
            </div>
            {mode === "to-rcf"
              ? <FieldNum id="rpm" label="RPM" value={rpm} onChange={setRpm} />
              : <FieldNum id="rcf" label="RCF (× g)" value={rcf} onChange={setRcf} />}
            <FieldNum id="r" label="Rotor radius (cm)" value={r} onChange={setR} />
          </>
        }
        result={err ? <p className="text-destructive text-sm">{err}</p> :
          mode === "to-rcf" ? <Result rows={[{ k: "RCF", v: `${fmt(outRcf)} × g` }]} /> :
          <Result rows={[{ k: "RPM", v: fmt(outRpm) }]} />
        }
      />
    )}</ShellWrap>
  );
}

export function UnitConverterCalc() {
  const [tab, setTab] = useState<"vol"|"mass"|"len"|"temp"|"na">("vol");
  const map: Record<string, { group: keyof typeof UNIT_GROUPS; units: string[] }> = {
    vol: { group: "volume", units: ["µL","mL","L"] },
    mass: { group: "mass", units: ["ng","µg","mg","g","kg"] },
    len: { group: "length", units: ["mm","cm","m","km"] },
    na: { group: "nucleicSize", units: ["bp","kb","Mb"] },
  };
  const [val, setVal] = useState("1");
  const [from, setFrom] = useState("mL");
  const [to, setTo] = useState("µL");
  const [tF, setTF] = useState<"C"|"F"|"K">("C");
  const [tT, setTT] = useState<"C"|"F"|"K">("F");
  let result: number | null = null; let err = "";
  try {
    if (tab === "temp") result = convertTemperature(+val, tF, tT);
    else result = convertUnit(+val, map[tab].group, from, to);
  } catch (e) { err = (e as Error).message; }
  return (
    <ShellWrap slug="unit-converter">{(meta) => (
      <CalculatorShell slug={meta!.slug} label={meta!.label} category={meta!.category} description={meta!.description}
        inputsRecord={{ tab, val, from: tab === "temp" ? tF : from, to: tab === "temp" ? tT : to }}
        outputsRecord={result != null ? { result: fmt(result) } : undefined}
        summary={result != null ? `${val} ${tab === "temp" ? tF : from} = ${fmt(result)} ${tab === "temp" ? tT : to}` : undefined}
        inputs={
          <>
            <Tabs value={tab} onValueChange={(v) => { setTab(v as never); if (v !== "temp") { setFrom(map[v as keyof typeof map].units[0]); setTo(map[v as keyof typeof map].units[1]); } }}>
              <TabsList className="grid grid-cols-5">
                <TabsTrigger value="vol">Volume</TabsTrigger>
                <TabsTrigger value="mass">Mass</TabsTrigger>
                <TabsTrigger value="len">Length</TabsTrigger>
                <TabsTrigger value="temp">Temp</TabsTrigger>
                <TabsTrigger value="na">DNA</TabsTrigger>
              </TabsList>
            </Tabs>
            <FieldNum id="v" label="Value" value={val} onChange={setVal} />
            {tab === "temp" ? (
              <div className="grid grid-cols-2 gap-2">
                <div><Label>From</Label><Select value={tF} onValueChange={(v) => setTF(v as never)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["C","F","K"].map(u => <SelectItem key={u} value={u}>°{u}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>To</Label><Select value={tT} onValueChange={(v) => setTT(v as never)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["C","F","K"].map(u => <SelectItem key={u} value={u}>°{u}</SelectItem>)}</SelectContent></Select></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div><Label>From</Label><Select value={from} onValueChange={setFrom}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{map[tab].units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>To</Label><Select value={to} onValueChange={setTo}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{map[tab].units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
              </div>
            )}
          </>
        }
        result={err ? <p className="text-destructive text-sm">{err}</p> : result != null ? (
          <Result rows={[{ k: "Result", v: `${fmt(result)} ${tab === "temp" ? "°" + tT : to}` }]} />
        ) : null}
      />
    )}</ShellWrap>
  );
}

export const CALCULATOR_COMPONENTS: Record<string, React.ComponentType> = {
  "molarity": MolarityCalc,
  "dilution": DilutionCalc,
  "serial-dilution": SerialDilutionCalc,
  "buffer": BufferCalc,
  "ph": PhCalc,
  "primer-tm": PrimerTmCalc,
  "agarose-gel": AgaroseCalc,
  "nucleic-acid": NucleicAcidCalc,
  "loading-dye": LoadingDyeCalc,
  "restriction-digest": RestrictionDigestCalc,
  "media-prep": MediaPrepCalc,
  "od600": Od600Calc,
  "cfu": CfuCalcUI,
  "rpm-rcf": RpmRcfCalc,
  "unit-converter": UnitConverterCalc,
};
