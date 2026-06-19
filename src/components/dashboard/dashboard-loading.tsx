import { Card } from "@/components/ui/card";

export function DashboardLoading({ title = "Loading dashboard" }: { title?: string }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <p className="text-sm font-bold text-violet-700">HomeZone</p>
        <div className="mt-10 space-y-6">
          <div>
            <p className="text-sm font-semibold text-violet-700">{title}</p>
            <div className="mt-3 h-12 max-w-xl rounded-2xl bg-muted" />
            <div className="mt-4 h-5 max-w-2xl rounded-2xl bg-muted" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {["a", "b", "c", "d", "e"].map((item) => (
              <Card className="h-36 animate-pulse bg-muted/70 p-6" key={item} />
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="h-72 animate-pulse bg-muted/70" />
            <Card className="h-72 animate-pulse bg-muted/70" />
          </div>
        </div>
      </section>
    </main>
  );
}
