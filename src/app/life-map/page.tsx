import { LifeMap } from "@/components/life-map";

export default function LifeMapPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <a className="text-sm font-bold text-violet-700" href="/">
          HomeZone
        </a>
        <div className="mt-8 max-w-4xl">
          <p className="text-sm font-semibold text-violet-700">Phase 9</p>
          <h1 className="mt-3 text-balance text-5xl font-bold tracking-tight sm:text-7xl">
            HomeZone Life Map
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            A life-oriented recommendation engine that asks about family, kids,
            work, investment, retirement, and lifestyle before suggesting areas,
            property types, and opportunities.
          </p>
        </div>

        <div className="mt-10">
          <LifeMap />
        </div>
      </section>
    </main>
  );
}
