import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Camera,
  Compass,
  Home,
  LineChart,
  MapPin,
  Mic,
  FileSearch,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
  UsersRound,
  UserRoundCheck,
  WalletCards
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const propertyActions = [
  {
    title: "Buy",
    text: "Find homes that match your budget, family, and lifestyle.",
    icon: Home
  },
  {
    title: "Sell",
    text: "Create a premium listing with AI description and lead capture.",
    icon: BadgeCheck
  },
  {
    title: "Rent",
    text: "Discover verified rentals with simple AI-guided shortlists.",
    icon: Building2
  },
  {
    title: "Invest",
    text: "Compare growth, rental yield, and location potential.",
    icon: LineChart
  }
];

const reels = [
  "Sea-view apartment, Kochi",
  "Family villa under 80L",
  "Prime land near highway"
];

const studioItems = [
  "Photography",
  "Drone Shoot",
  "Walkthrough Video",
  "AI Brochure",
  "Reels Creation",
  "Ad Creatives"
];

const companionMetrics = [
  {
    label: "Risk",
    icon: ShieldCheck
  },
  {
    label: "Budget",
    icon: WalletCards
  },
  {
    label: "Family fit",
    icon: UserRoundCheck
  }
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.16),_transparent_34%),linear-gradient(180deg,#ffffff_0%,#faf7ff_48%,#ffffff_100%)]">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/76 backdrop-blur-2xl">
        <nav className="container flex h-20 items-center justify-between">
          <a className="flex items-center gap-3" href="#">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-glow">
              <Home className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-lg font-bold tracking-tight">
                HomeZone
              </span>
              <span className="block text-xs font-medium text-muted-foreground">
                Your AI Property Companion
              </span>
            </span>
          </a>

          <div className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <a className="hover:text-foreground" href="/properties">
              Properties
            </a>
            <a className="hover:text-foreground" href="#reels">
              Reels
            </a>
            <a className="hover:text-foreground" href="#studio">
              Studio
            </a>
            <a className="hover:text-foreground" href="/studio">
              Book Studio
            </a>
            <a className="hover:text-foreground" href="/analyzer">
              Analyzer
            </a>
            <a className="hover:text-foreground" href="/pro">
              Pro
            </a>
            <a className="hover:text-foreground" href="/builder">
              Builders
            </a>
            <a className="hover:text-foreground" href="/services">
              Services
            </a>
            <a className="hover:text-foreground" href="/invest">
              Invest
            </a>
            <a className="hover:text-foreground" href="/life-map">
              Life Map
            </a>
            <a className="hover:text-foreground" href="/ecosystem">
              Ecosystem
            </a>
            <a className="hover:text-foreground" href="#assistant">
              AI Companion
            </a>
            <a className="hover:text-foreground" href="/search">
              AI Search
            </a>
          </div>

          <div className="flex items-center gap-2">
            <Button className="hidden sm:inline-flex" variant="outline">
              Login
            </Button>
            <Button asChild>
              <a href="/search">
                AI Search
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </nav>
      </header>

      <section className="container pb-20 pt-12 sm:pt-20">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm">
            <Sparkles className="h-4 w-4" />
            India first. Global ready.
          </div>

          <h1 className="text-balance text-5xl font-bold tracking-tight text-foreground sm:text-7xl lg:text-8xl">
            Your AI Property Companion
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-8 text-muted-foreground sm:text-xl">
            Buy. Sell. Rent. Invest. Market. Talk to HomeZone and let AI guide
            every property decision in simple language.
          </p>

          <div className="mx-auto mt-10 max-w-4xl rounded-[2rem] border border-violet-200 bg-white p-3 shadow-soft">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="flex min-h-16 flex-1 items-center gap-3 rounded-[1.35rem] bg-muted px-5 text-left">
                <Search className="h-6 w-6 shrink-0 text-violet-600" />
                <span className="text-base text-muted-foreground sm:text-lg">
                  Tell me what property you need...
                </span>
              </div>
              <Button asChild className="min-h-16 px-6" size="lg">
                <a href="/search">
                  <Mic className="h-5 w-5" />
                  Speak
                </a>
              </Button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {["Buy Property", "Sell Property", "Rent Home", "Invest"].map(
              (item) => (
                <a
                  className="rounded-full border border-violet-100 bg-white px-5 py-3 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  href="/search"
                  key={item}
                >
                  {item}
                </a>
              )
            )}
          </div>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-4">
          {propertyActions.map((action) => (
            <Card
              className="group p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-soft"
              key={action.title}
            >
              <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                <action.icon className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold">{action.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {action.text}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section className="container grid gap-8 pb-24 lg:grid-cols-[1.05fr_0.95fr]">
        <div
          className="rounded-[2.5rem] bg-gradient-to-br from-violet-700 via-purple-600 to-fuchsia-500 p-6 text-white shadow-glow sm:p-8"
          id="reels"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white/75">
                Property Reels
              </p>
              <h2 className="mt-2 text-3xl font-bold sm:text-5xl">
                Watch homes before you visit.
              </h2>
            </div>
            <Button className="bg-white text-violet-700 hover:bg-white/90">
              <Play className="h-4 w-4" />
              Preview
            </Button>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {reels.map((reel, index) => (
              <div
                className="relative flex aspect-[9/14] flex-col justify-end overflow-hidden rounded-[1.75rem] bg-white/12 p-5 ring-1 ring-white/20"
                key={reel}
              >
                <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.18),rgba(255,255,255,0.02)),radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.34),transparent_30%)]" />
                <div className="relative">
                  <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/20">
                    <Play className="h-5 w-5 fill-white" />
                  </span>
                  <p className="text-lg font-bold">{reel}</p>
                  <p className="mt-2 text-sm text-white/72">
                    Reel {index + 1} · Ask AI
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-8">
          <Card className="p-7 shadow-sm" id="studio">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
              <Camera className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-violet-700">
              HomeZone Studio
            </p>
            <h2 className="mt-2 text-3xl font-bold">
              Turn any property into premium marketing.
            </h2>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {studioItems.map((item) => (
                <span
                  className="rounded-2xl bg-muted px-4 py-3 text-sm font-semibold"
                  key={item}
                >
                  {item}
                </span>
              ))}
            </div>
            <Button asChild className="mt-6 w-full" size="lg">
              <a href="/studio">
                Open Studio
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </Card>

          <Card className="p-7 shadow-sm">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-violet-700" />
              <span className="font-semibold">Location not set</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Users can explore freely. Contact, save, list, and dashboard
              actions will ask for WhatsApp-verified account creation.
            </p>
          </Card>
        </div>
      </section>

      <section className="container pb-24" id="assistant">
        <div className="grid items-center gap-10 rounded-[2.5rem] border border-violet-100 bg-white p-7 shadow-soft md:grid-cols-2 md:p-12">
          <div>
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              AI that explains property like a trusted guide.
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              HomeZone answers questions, compares options, summarizes listings,
              estimates fit, and helps first-time users move with confidence.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg">
                Ask HomeZone AI
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline">
                Verify with WhatsApp
              </Button>
            </div>
          </div>

          <div className="rounded-[2rem] bg-slate-950 p-4 text-white shadow-soft">
            <div className="rounded-[1.5rem] bg-white/8 p-5">
              <p className="text-sm text-white/55">HomeZone AI</p>
              <p className="mt-3 text-xl font-semibold leading-8">
                “This villa fits your family budget, has strong school access,
                and looks better for long-term living than short-term rental.”
              </p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {companionMetrics.map((metric) => {
                const MetricIcon = metric.icon;
                return (
                  <div
                    className="rounded-2xl bg-white/8 p-4 text-sm font-semibold"
                    key={metric.label}
                  >
                    <MetricIcon className="mb-3 h-5 w-5 text-cyan-300" />
                    {metric.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="container pb-24">
        <div className="rounded-[2.5rem] bg-gradient-to-br from-violet-50 to-cyan-50 p-7 sm:p-10">
          <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
            <div>
              <p className="text-sm font-semibold text-violet-700">
                Phase 2 Ready
              </p>
              <h2 className="mt-2 text-4xl font-bold tracking-tight">
                Search by talking, not filtering.
              </h2>
              <p className="mt-4 leading-7 text-muted-foreground">
                HomeZone understands budget, location, property type, language,
                and lifestyle goals from natural sentences in English,
                Malayalam, and Hindi-ready flows.
              </p>
            </div>
            <div className="rounded-[2rem] border border-white bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-muted-foreground">
                Example
              </p>
              <p className="mt-3 text-2xl font-bold">
                “I need a villa under 80 lakh in Kochi”
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {["Intent: Buy", "Budget: ₹80L", "City: Kochi"].map((item) => (
                  <span
                    className="rounded-2xl bg-muted px-4 py-3 text-sm font-bold"
                    key={item}
                  >
                    {item}
                  </span>
                ))}
              </div>
              <Button asChild className="mt-6 w-full" size="lg">
                <a href="/search">
                  Open AI Search Engine
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container pb-24">
        <div className="grid items-center gap-8 rounded-[2.5rem] border border-violet-100 bg-white p-7 shadow-soft md:grid-cols-[0.9fr_1.1fr] sm:p-10">
          <div>
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <FileSearch className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-violet-700">
              Phase 4 Ready
            </p>
            <h2 className="mt-2 text-4xl font-bold tracking-tight">
              Analyze before you decide.
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Upload brochures, sale deeds, images, and location context.
              HomeZone creates a simple property health report with score,
              value range, risk notes, rental potential, and legal checklist.
            </p>
            <Button asChild className="mt-6" size="lg">
              <a href="/analyzer">
                Open Property Analyzer
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>

          <div className="rounded-[2rem] bg-slate-950 p-5 text-white">
            <p className="text-sm font-semibold text-white/55">
              HomeZone Score
            </p>
            <div className="mt-5 flex items-end justify-between gap-5">
              <div>
                <p className="text-7xl font-bold">84</p>
                <p className="font-semibold text-white/62">out of 100</p>
              </div>
              <div className="grid gap-2 text-sm font-semibold text-white/72">
                <span>Value: ₹72L - ₹78L</span>
                <span>Risk: Low</span>
                <span>Rental: High</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container pb-24">
        <div className="rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-800 p-7 text-white shadow-glow sm:p-10">
          <div className="grid gap-8 md:grid-cols-[0.95fr_1.05fr] md:items-center">
            <div>
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white">
                <UsersRound className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-white/65">
                Phase 5 Ready
              </p>
              <h2 className="mt-2 text-4xl font-bold tracking-tight">
                HomeZone Pro for brokers.
              </h2>
              <p className="mt-4 leading-7 text-white/72">
                Manage leads, pipeline, follow-ups, notes, WhatsApp automation,
                and AI lead scoring inside a simple CRM built for property work.
              </p>
              <Button asChild className="mt-6 bg-white text-violet-700 hover:bg-white/90" size="lg">
                <a href="/pro">
                  Open Pro Dashboard
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Hot Leads", "18"],
                ["Pipeline Value", "₹19.3Cr"],
                ["Follow-ups Due", "7"],
                ["AI Score", "94"]
              ].map(([label, value]) => (
                <div className="rounded-[1.5rem] bg-white/10 p-5" key={label}>
                  <p className="text-sm font-semibold text-white/58">{label}</p>
                  <p className="mt-2 text-3xl font-bold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container pb-24">
        <div className="grid items-center gap-8 rounded-[2.5rem] border border-violet-100 bg-white p-7 shadow-soft md:grid-cols-[0.9fr_1.1fr] sm:p-10">
          <div>
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <Building2 className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-violet-700">
              Phase 6 Ready
            </p>
            <h2 className="mt-2 text-4xl font-bold tracking-tight">
              Builder Hub for project launches.
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Verified builders can showcase projects, generate leads, manage
              campaigns, request media, create landing pages, and read AI
              performance reports from one simple dashboard.
            </p>
            <Button asChild className="mt-6" size="lg">
              <a href="/builder">
                Open Builder Hub
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Active Leads", "413"],
              ["Project Views", "18.6K"],
              ["Campaign ROI", "4.8x"],
              ["Pipeline", "₹42Cr"]
            ].map(([label, value]) => (
              <div className="rounded-[1.5rem] bg-muted p-5" key={label}>
                <p className="text-sm font-semibold text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 text-3xl font-bold">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container pb-24">
        <div className="rounded-[2.5rem] bg-gradient-to-br from-violet-50 to-white p-7 shadow-soft sm:p-10">
          <div className="grid items-center gap-8 md:grid-cols-[0.95fr_1.05fr]">
            <div>
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <Wrench className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-violet-700">
                Phase 7 Ready
              </p>
              <h2 className="mt-2 text-4xl font-bold tracking-tight">
                Services after property discovery.
              </h2>
              <p className="mt-4 leading-7 text-muted-foreground">
                HomeZone connects users with verified interiors, legal, loans,
                movers, cleaning, solar, insurance, architects, construction,
                and smart home providers.
              </p>
              <Button asChild className="mt-6" size="lg">
                <a href="/services">
                  Open Services Marketplace
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Interior Design",
                "Legal",
                "Loans",
                "Movers",
                "Solar",
                "Home Automation"
              ].map((item) => (
                <div className="rounded-[1.5rem] bg-white p-5 shadow-sm" key={item}>
                  <p className="font-bold">{item}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Verified providers
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container pb-24">
        <div className="grid items-center gap-8 rounded-[2.5rem] border border-violet-100 bg-white p-7 shadow-soft md:grid-cols-[0.92fr_1.08fr] sm:p-10">
          <div>
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <LineChart className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-violet-700">
              Phase 8 Ready
            </p>
            <h2 className="mt-2 text-4xl font-bold tracking-tight">
              Investment intelligence for property decisions.
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Compare areas with investment score, rental yield, future growth,
              hotspot detection, price trends, and infrastructure impact before
              buying.
            </p>
            <Button asChild className="mt-6" size="lg">
              <a href="/invest">
                Open Investment Engine
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>

          <div className="rounded-[2rem] bg-slate-950 p-5 text-white">
            <p className="text-sm font-semibold text-white/55">
              Investment Score
            </p>
            <div className="mt-5 flex items-end justify-between gap-5">
              <div>
                <p className="text-7xl font-bold">91</p>
                <p className="font-semibold text-white/62">Kakkanad, Kochi</p>
              </div>
              <div className="grid gap-2 text-sm font-semibold text-white/72">
                <span>Growth: +12.4%</span>
                <span>Yield: 4.1%</span>
                <span>Demand: Very High</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container pb-24">
        <div className="rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-800 p-7 text-white shadow-glow sm:p-10">
          <div className="grid items-center gap-8 md:grid-cols-[0.92fr_1.08fr]">
            <div>
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white">
                <Compass className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-white/65">
                Phase 9 Ready
              </p>
              <h2 className="mt-2 text-4xl font-bold tracking-tight">
                HomeZone Life Map.
              </h2>
              <p className="mt-4 leading-7 text-white/72">
                HomeZone asks about family, kids, work, investment, retirement,
                and lifestyle, then recommends areas and property types that fit
                the user’s life.
              </p>
              <Button asChild className="mt-6 bg-white text-violet-700 hover:bg-white/90" size="lg">
                <a href="/life-map">
                  Open Life Map
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Life Stage", "Family with kids"],
                ["Work", "Office commute"],
                ["Priority", "Schools nearby"],
                ["Best Area", "Kakkanad"]
              ].map(([label, value]) => (
                <div className="rounded-[1.5rem] bg-white/10 p-5" key={label}>
                  <p className="text-sm font-semibold text-white/58">{label}</p>
                  <p className="mt-2 text-2xl font-bold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container pb-24">
        <div className="grid items-center gap-8 rounded-[2.5rem] border border-violet-100 bg-white p-7 shadow-soft md:grid-cols-[0.92fr_1.08fr] sm:p-10">
          <div>
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-violet-700">
              Phase 10 Ready
            </p>
            <h2 className="mt-2 text-4xl font-bold tracking-tight">
              The full HomeZone ecosystem.
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Marketplace, AI companion, reels, studio, broker CRM, builder
              hub, services, investment intelligence, analyzer, and Life Map are
              now mapped into one super app experience.
            </p>
            <Button asChild className="mt-6" size="lg">
              <a href="/ecosystem">
                Open Ecosystem Hub
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["AI layers", "7"],
              ["Revenue engines", "5"],
              ["Dashboards", "3"],
              ["User journeys", "6"]
            ].map(([label, value]) => (
              <div className="rounded-[1.5rem] bg-muted p-5" key={label}>
                <p className="text-sm font-semibold text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 text-3xl font-bold">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container pb-24">
        <div className="rounded-[2.5rem] bg-gradient-to-br from-violet-50 to-white p-7 shadow-soft sm:p-10">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              ["Marketplace", "/properties"],
              ["Login / Verify", "/auth"],
              ["Dashboard", "/dashboard"],
              ["Admin", "/admin"]
            ].map(([label, href]) => (
              <a
                className="rounded-[1.5rem] bg-white p-5 text-center font-bold shadow-sm transition hover:-translate-y-1 hover:shadow-soft"
                href={href}
                key={label}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-violet-100 bg-white">
        <div className="container flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-bold">HomeZone</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your AI Property Companion
            </p>
          </div>
          <div className="flex flex-wrap gap-5 text-sm font-medium text-muted-foreground">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
