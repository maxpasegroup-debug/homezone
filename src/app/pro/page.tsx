import { ProDashboard } from "@/components/pro-dashboard";

export default function ProPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <a className="text-sm font-bold text-violet-700" href="/">
          HomeZone
        </a>
        <div className="mt-8 max-w-4xl">
          <p className="text-sm font-semibold text-violet-700">Phase 5</p>
          <h1 className="mt-3 text-balance text-5xl font-bold tracking-tight sm:text-7xl">
            HomeZone Pro
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            A simple broker platform for leads, pipeline, follow-ups, WhatsApp
            automation, AI lead scoring, and subscription-ready growth tools.
          </p>
        </div>

        <div className="mt-10">
          <ProDashboard />
        </div>
      </section>
    </main>
  );
}
