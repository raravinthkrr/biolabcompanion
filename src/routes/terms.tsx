import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service – BioCalc AI" },
      { name: "description", content: "The terms that govern your use of BioCalc AI calculators, AI tools, and lab workspaces." },
      { property: "og:title", content: "Terms of Service – BioCalc AI" },
      { property: "og:description", content: "Acceptable use, accuracy limits, and account responsibilities for BioCalc AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-14 max-w-3xl">
        <h1 className="text-4xl font-display font-bold">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mt-2">Last updated {new Date().getFullYear()}</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed">
          <Section title="Using BioCalc AI">
            <p className="text-muted-foreground">
              BioCalc AI provides laboratory calculators and AI-assisted tools for biotechnology work. You may use it for
              research, teaching, study, and professional laboratory practice. You are responsible for the accuracy and
              legality of the content you submit and for the decisions you make from the results.
            </p>
          </Section>

          <Section title="No warranty of scientific accuracy">
            <p className="text-muted-foreground">
              Calculator formulas are documented and deterministic, but AI-generated protocols, plans, reagent recipes,
              and assistant answers can be incomplete or wrong. Nothing in the app is a substitute for your lab's
              official SDS and SOP documents, manufacturer guidance, or your own scientific judgement. Verify reagent
              concentrations, hazard classifications, and safety procedures before any bench work. We provide the service
              "as is", without warranties of any kind.
            </p>
          </Section>

          <Section title="Your account">
            <p className="text-muted-foreground">
              You must provide an accurate email address and keep your credentials secure. You are responsible for
              activity under your account. We may suspend accounts used for abuse, unlawful activity, attempts to
              circumvent access controls, or automated overuse that degrades the service for others.
            </p>
          </Section>

          <Section title="Lab workspaces and shared content">
            <p className="text-muted-foreground">
              When you share an item with a lab workspace, every member of that lab can read it. Lab leads can invite and
              remove members. Only share content you are permitted to share, and do not upload confidential or
              export-controlled material without authorisation.
            </p>
          </Section>

          <Section title="Acceptable use">
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Do not use the AI tools to obtain guidance for creating weapons, hazardous agents, or otherwise causing harm.</li>
              <li>Do not upload malware, attempt to access other accounts, or probe the service for vulnerabilities without permission.</li>
              <li>Do not resell or redistribute AI output as an independent safety or regulatory certification.</li>
            </ul>
          </Section>

          <Section title="Content ownership">
            <p className="text-muted-foreground">
              You keep ownership of everything you submit. You grant us the limited permission needed to store your
              content, process it to deliver the features you request, and display it back to you and to labs you share
              it with. AI output is yours to use, subject to these terms.
            </p>
          </Section>

          <Section title="Availability and changes">
            <p className="text-muted-foreground">
              Features may change, and AI capacity can be limited or temporarily unavailable. We may update these terms;
              continued use after an update means you accept the revised terms.
            </p>
          </Section>

          <Section title="Limitation of liability">
            <p className="text-muted-foreground">
              To the fullest extent permitted by law, we are not liable for indirect, incidental, or consequential losses,
              including failed experiments, spoiled reagents, lost data, or safety incidents arising from reliance on the
              service.
            </p>
          </Section>
        </div>

        <Card className="mt-12 p-6 flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground flex-1">See also how we handle your data.</p>
          <Link to="/privacy"><Button variant="outline" size="sm">Privacy Policy</Button></Link>
          <Link to="/"><Button size="sm" className="bg-gradient-primary text-primary-foreground">Back home</Button></Link>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display font-semibold text-xl mb-2">{title}</h2>
      {children}
    </section>
  );
}
