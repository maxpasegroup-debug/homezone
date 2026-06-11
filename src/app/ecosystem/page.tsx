import Link from "next/link";
import { EcosystemHub } from "@/components/ecosystem-hub";

export default function EcosystemPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/">
          HomeZone
        </Link>
        <div className="mt-8 max-w-4xl">
          <p className="text-sm font-semibold text-violet-700">Phase 10</p>
          <h1 className="mt-3 text-balance text-5xl font-bold tracking-tight sm:text-7xl">
            Super App Ecosystem
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            The final HomeZone vision: property marketplace, AI companion,
            reels, studio, CRM, builder hub, services, investment intelligence,
            and Life Map inside one simple ecosystem.
          </p>
        </div>

        <div className="mt-10">
          <EcosystemHub />
        </div>
      </section>
    </main>
  );
}
