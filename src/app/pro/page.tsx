import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PaymentButton } from "@/components/payments/payment-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ProPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/">
          HomeZone
        </Link>
        <div className="mt-8 max-w-4xl">
          <p className="text-sm font-semibold text-violet-700">Broker Pro CRM</p>
          <h1 className="mt-3 text-balance text-5xl font-bold tracking-tight sm:text-7xl">
            HomeZone Pro
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            A simple broker platform for leads, pipeline, follow-ups, WhatsApp
            automation, AI lead scoring, and subscription-ready growth tools.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {[
            {
              features: ["Lead inbox", "Pipeline", "Calendar"],
              name: "Free",
              price: "Start free"
            },
            {
              features: ["Team CRM", "Automation rules", "Commission tracking"],
              name: "Pro",
              price: "Rs 1,999/month",
              product: "BROKER_MONTHLY" as const
            },
            {
              features: ["Large team limits", "Enterprise automation", "Advanced reporting"],
              name: "Enterprise",
              price: "Rs 49,999/year",
              product: "BROKER_ENTERPRISE" as const
            }
          ].map((plan) => (
            <Card className="p-6 shadow-sm" key={plan.name}>
              <h2 className="text-3xl font-bold">{plan.name}</h2>
              <p className="mt-3 text-2xl font-bold text-violet-700">{plan.price}</p>
              <div className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground" key={feature}>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    {feature}
                  </p>
                ))}
              </div>
              <div className="mt-6">
                {plan.product ? (
                  <PaymentButton label={`Upgrade to ${plan.name}`} product={plan.product} />
                ) : (
                  <Button asChild>
                    <Link href="/dashboard/pro">
                      Open Broker CRM
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
