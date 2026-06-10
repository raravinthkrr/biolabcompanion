import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { CALCULATOR_COMPONENTS } from "@/components/calculators-ui";
import { getCalculator } from "@/lib/calculators/registry";

export const Route = createFileRoute("/calculators/$slug")({
  head: ({ params }) => {
    const meta = getCalculator(params.slug);
    if (!meta) return { meta: [{ title: "Calculator – BioCalc AI" }] };
    return {
      meta: [
        { title: `${meta.label} – BioCalc AI` },
        { name: "description", content: meta.description },
        { property: "og:title", content: `${meta.label} – BioCalc AI` },
        { property: "og:description", content: meta.description },
      ],
    };
  },
  loader: ({ params }) => {
    if (!getCalculator(params.slug)) throw notFound();
    return { slug: params.slug };
  },
  component: CalcRoute,
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="flex-1 container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-display font-bold">Calculator not found</h1>
      </div>
      <SiteFooter />
    </div>
  ),
});

function CalcRoute() {
  const { slug } = Route.useLoaderData();
  const Comp = CALCULATOR_COMPONENTS[slug];
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{Comp ? <Comp /> : null}</main>
      <SiteFooter />
    </div>
  );
}
