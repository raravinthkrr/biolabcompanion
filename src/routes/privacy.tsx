import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy – BioCalc AI" },
      { name: "description", content: "What BioCalc AI stores, how your lab data is isolated per account, how AI requests are handled, and how to delete your data." },
      { property: "og:title", content: "Privacy Policy – BioCalc AI" },
      { property: "og:description", content: "How BioCalc AI handles your account data, saved calculations, protocols, and AI conversations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-14 max-w-3xl">
        <h1 className="text-4xl font-display font-bold">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mt-2">Last updated {new Date().getFullYear()}</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed">
          <Section title="What we collect">
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Account details</strong> — your email address and authentication identifiers (including Google sign-in identifiers if you use it).</li>
              <li><strong className="text-foreground">Saved calculations</strong> — the inputs, results, and notes you choose to save to your history.</li>
              <li><strong className="text-foreground">AI conversations</strong> — the questions you send to the AI assistant and the replies it returns, stored so you can revisit a thread.</li>
              <li><strong className="text-foreground">Protocol content</strong> — text you paste and text extracted from documents you upload to the Protocol Summarizer, plus the generated summaries.</li>
              <li><strong className="text-foreground">Experiment plans and reagent recipes</strong> you save.</li>
              <li><strong className="text-foreground">Lab workspace data</strong> — labs you create or join, member roles, and any item you explicitly share with a lab.</li>
            </ul>
          </Section>

          <Section title="How your data is stored and isolated">
            <p className="text-muted-foreground">
              All records live in a managed Postgres database with row-level security. Every row is bound to your
              account identifier, and the database itself refuses reads and writes from any other account. The only
              exception is content you deliberately share with a lab workspace, which becomes readable by the members
              of that lab. Items without a lab remain private to you.
            </p>
          </Section>

          <Section title="AI processing">
            <p className="text-muted-foreground">
              AI features send the text of your request to a leading AI model through the Lovable AI Gateway. Requests
              are made from our server; your account credentials are never shared with the model provider. We do not use
              your content to train models. Uploaded documents are parsed in your browser — only the extracted text is
              sent for summarization.
            </p>
          </Section>

          <Section title="Deleting your data">
            <p className="text-muted-foreground">
              You can delete any individual record from the app: calculations from your history, conversations from the
              assistant sidebar, and saved protocols or plans from their pages. Deletion is immediate and permanent.
              To have your account and every record associated with it removed entirely, contact us from your registered
              email address and we will purge it.
            </p>
          </Section>

          <Section title="What we do not do">
            <p className="text-muted-foreground">
              We do not sell your data, share it with advertisers, or use it for profiling. We do not read your saved lab
              work except where you ask for support and explicitly permit it.
            </p>
          </Section>

          <Section title="Scientific disclaimer">
            <p className="text-muted-foreground">
              BioCalc AI is a productivity tool for laboratory work, not a safety authority. Always verify reagent
              concentrations, hazard classifications, and procedures against your lab's official SDS and SOP documents
              before use.
            </p>
          </Section>
        </div>

        <Card className="mt-12 p-6 flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground flex-1">See also our terms of use.</p>
          <Link to="/terms"><Button variant="outline" size="sm">Terms of Service</Button></Link>
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
