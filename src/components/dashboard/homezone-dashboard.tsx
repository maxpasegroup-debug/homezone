import {
  BellRing,
  Bookmark,
  Building2,
  Camera,
  ChartNoAxesCombined,
  FileCheck,
  Home,
  MessageSquareText,
  Plus,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Wrench
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const dashboardCards = [
  {
    title: "My Listings",
    value: "0",
    text: "Add property, submit for review, and track leads.",
    href: "/dashboard/listings",
    icon: Home
  },
  {
    title: "Saved Properties",
    value: "0",
    text: "Shortlist homes, land, rentals, and investments.",
    href: "/dashboard/saved",
    icon: Bookmark
  },
  {
    title: "Inquiries",
    value: "0",
    text: "Contact requests, site visits, and service replies.",
    href: "/dashboard/inquiries",
    icon: MessageSquareText
  },
  {
    title: "Studio Requests",
    value: "0",
    text: "Photography, reels, brochure, and campaign orders.",
    href: "/studio",
    icon: Camera
  },
  {
    title: "Broker Pro",
    value: "CRM",
    text: "Leads, pipeline, WhatsApp automation, and AI scoring.",
    href: "/pro",
    icon: UsersRound
  },
  {
    title: "Builder Hub",
    value: "B2B",
    text: "Projects, campaigns, landing pages, and AI reports.",
    href: "/builder",
    icon: Building2
  },
  {
    title: "Services",
    value: "Book",
    text: "Legal, loans, interiors, movers, solar, and more.",
    href: "/services",
    icon: Wrench
  },
  {
    title: "Investment",
    value: "AI",
    text: "Area score, growth, rental yield, and infrastructure impact.",
    href: "/invest",
    icon: ChartNoAxesCombined
  }
];

export function HomeZoneDashboard({ email }: { email?: string | null }) {
  return (
    <div className="space-y-8">
      <Card className="overflow-hidden shadow-soft">
        <div className="grid gap-0 lg:grid-cols-[1fr_0.85fr]">
          <div className="p-7 sm:p-10">
            <p className="text-sm font-semibold text-violet-700">
              HomeZone Dashboard
            </p>
            <h1 className="mt-2 text-5xl font-bold tracking-tight">
              Your property command center
            </h1>
            <p className="mt-5 max-w-2xl leading-8 text-muted-foreground">
              Manage saved properties, listings, inquiries, Studio work, Pro
              CRM, builder projects, services, and AI reports from one place.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <a href="/dashboard/listings/new">
                  <Plus className="h-4 w-4" />
                  Add Property
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="/search">
                  <Sparkles className="h-4 w-4" />
                  Ask HomeZone AI
                </a>
              </Button>
            </div>
          </div>
          <div className="bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-800 p-7 text-white sm:p-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <p className="mt-7 text-sm font-semibold text-white/62">
              Signed in as
            </p>
            <p className="mt-2 break-all text-2xl font-bold">
              {email ?? "HomeZone user"}
            </p>
            <div className="mt-6 rounded-[1.5rem] bg-white/10 p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-white/76">
                <BellRing className="h-4 w-4" />
                WhatsApp verification status syncs here after provider setup.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {dashboardCards.map((card) => {
          const CardIcon = card.icon;
          return (
            <a
              className="rounded-[1.5rem] border border-border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-soft"
              href={card.href}
              key={card.title}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                  <CardIcon className="h-6 w-6" />
                </span>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">
                  {card.value}
                </span>
              </div>
              <h2 className="mt-6 text-2xl font-bold">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {card.text}
              </p>
            </a>
          );
        })}
      </div>

      <Card className="p-6 shadow-soft sm:p-8">
        <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
          <FileCheck className="h-4 w-4" />
          Launch readiness
        </p>
        <h2 className="mt-2 text-3xl font-bold">
          Connect Supabase, WhatsApp, OpenAI, media, and payments to go live.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          The UI and schema are ready. Production launch requires credentials,
          payment webhook setup, WhatsApp template approval, storage policies,
          and admin moderation workflows.
        </p>
      </Card>
    </div>
  );
}
