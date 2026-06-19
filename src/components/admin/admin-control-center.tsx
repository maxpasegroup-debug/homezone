import {
  AlertTriangle,
  BadgeCheck,
<<<<<<< HEAD
  Bot,
=======
  BarChart3,
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
  Building2,
  FileCheck,
  Flag,
  Home,
  Rocket,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { ModerationActions } from "@/components/admin/moderation-actions";
import { VerificationActions } from "@/components/admin/verification-actions";
import { VerificationBadge } from "@/components/trust/verification-badge";

export function AdminControlCenter({
  analytics,
<<<<<<< HEAD
  pendingBrokerProfiles = [],
  pendingBuilderProfiles = [],
=======
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
  pendingProperties = [],
  pendingVerificationProperties = [],
  pendingReels = [],
  reports = [],
  counts
}: {
  analytics?: {
    leads: number;
<<<<<<< HEAD
    leadSources: {
      source: string;
      _count: {
        _all: number;
      };
    }[];
    publishedProperties: number;
    reels: number;
    reportedReels: number;
    topProperties: {
      callClicks: number;
      city: string;
      id: string;
      inquirySubmissions: number;
      title: string;
      whatsappClicks: number;
    }[];
    topReels: {
      id: string;
      leadsCount: number;
      likesCount: number;
      sharesCount: number;
      title: string;
      viewsCount: number;
    }[];
    aiUsage: {
      areaQueries: number;
      comparisons: number;
      failures: number;
      leadAssistant: number;
      recommendations: number;
      searches: number;
    };
    launchReadiness: {
      brokenMedia: number;
      expiredFeatured: number;
      expiredPremium: number;
      incompleteListings: number;
      missingImages: number;
      ready: boolean;
      totalIssues: number;
    };
    verifiedBrokers: number;
    verifiedBuilders: number;
    verifiedProperties: number;
=======
    publishedProperties: number;
    reels: number;
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
  };
  counts?: {
    brokers: number;
    builders: number;
    properties: number;
    reports: number;
    users: number;
    verificationQueue: number;
  };
  pendingProperties?: {
    city: string;
    id: string;
    locality: string | null;
    status: string;
    title: string;
<<<<<<< HEAD
  }[];
  pendingVerificationProperties?: {
    city: string;
    id: string;
    locality: string | null;
    status: string;
    title: string;
    verificationStatus: string;
  }[];
  pendingBrokerProfiles?: {
    city: string | null;
    fullName: string | null;
    id: string;
    role: string;
    verificationStatus: string;
    whatsappVerified: boolean;
    user: {
      email: string | null;
    };
  }[];
  pendingBuilderProfiles?: {
    city: string | null;
    fullName: string | null;
    id: string;
    role: string;
    verificationStatus: string;
    whatsappVerified: boolean;
    user: {
      email: string | null;
    };
=======
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
  }[];
  pendingReels?: {
    id: string;
    status: string;
    title: string;
  }[];
  reports?: {
    action: string;
    createdAt: Date;
    entityType: string | null;
    id: string;
    metadata: unknown;
  }[];
}) {
  const overview = [
    {
      count: counts?.users ?? 0,
      icon: UsersRound,
      text: "Registered profiles across all marketplace roles.",
      title: "Users"
    },
    {
      count: counts?.brokers ?? 0,
      icon: UsersRound,
      text: "Broker profiles available for role and verification review.",
      title: "Brokers"
    },
    {
      count: counts?.builders ?? 0,
      icon: Building2,
      text: "Builder profiles and project owners in the marketplace.",
      title: "Builders"
    },
    {
      count: counts?.properties ?? 0,
      icon: Home,
      text: "Total marketplace listings across all statuses.",
      title: "Properties"
    },
    {
      count: counts?.verificationQueue ?? 0,
      icon: BadgeCheck,
      text: "Broker and builder profiles pending phone verification.",
      title: "Verification Queue"
    },
    {
      count: counts?.reports ?? 0,
      icon: Flag,
      text: "User reports awaiting trust and safety review.",
      title: "Reports"
    }
  ];

  const analyticsCards = [
    {
<<<<<<< HEAD
      count: counts?.verificationQueue ?? 0,
      icon: BadgeCheck,
      label: "Pending verifications"
    },
    {
      count: analytics?.verifiedProperties ?? 0,
      icon: Home,
      label: "Verified properties"
    },
    {
      count: analytics?.verifiedBrokers ?? 0,
      icon: UsersRound,
      label: "Verified brokers"
    },
    {
      count: analytics?.verifiedBuilders ?? 0,
      icon: Building2,
      label: "Verified builders"
    },
    {
      count: analytics?.reportedReels ?? 0,
      icon: Flag,
      label: "Reported reels"
    },
    {
      count: analytics?.aiUsage.searches ?? 0,
      icon: Bot,
      label: "AI searches"
=======
      count: analytics?.publishedProperties ?? 0,
      icon: Home,
      label: "Published properties"
    },
    {
      count: analytics?.leads ?? 0,
      icon: BarChart3,
      label: "Lead records"
    },
    {
      count: analytics?.reels ?? 0,
      icon: Video,
      label: "Property reels"
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
    }
  ];

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden shadow-soft">
        <div className="grid gap-0 lg:grid-cols-[1fr_0.82fr]">
          <div className="p-7 sm:p-10">
            <p className="text-sm font-semibold text-violet-700">
              Admin Dashboard
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
              Trust, users, and marketplace operations
            </h1>
            <p className="mt-5 max-w-2xl leading-8 text-muted-foreground">
              Admins review users, brokers, builders, properties, verification
              queues, reports, and marketplace activity with database-backed
              counts.
            </p>
          </div>
          <div className="bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-800 p-7 text-white sm:p-10">
            <ShieldCheck className="h-12 w-12" />
            <h2 className="mt-6 text-3xl font-bold">Production rule</h2>
            <p className="mt-4 leading-7 text-white/72">
              User-generated listings, reels, projects, and reports stay
              operationally visible until moderation and verification workflows
              clear them.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {overview.map((item) => {
          const ItemIcon = item.icon;
          return (
            <Card className="p-6 shadow-sm" key={item.title}>
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                  <ItemIcon className="h-6 w-6" />
                </span>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">
                  {item.count}
                </span>
              </div>
              <h2 className="mt-6 text-2xl font-bold">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {item.text}
              </p>
            </Card>
          );
        })}
      </div>

<<<<<<< HEAD
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
=======
      <section className="grid gap-5 md:grid-cols-3">
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
        {analyticsCards.map((item) => {
          const ItemIcon = item.icon;
          return (
            <Card className="p-6 shadow-sm" key={item.label}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                <ItemIcon className="h-6 w-6" />
              </span>
              <h2 className="mt-6 text-3xl font-bold">{item.count}</h2>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                {item.label}
              </p>
            </Card>
          );
        })}
      </section>

<<<<<<< HEAD
      <section className="grid gap-8 xl:grid-cols-2">
        <Card className="p-6 shadow-soft sm:p-8">
          <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
            <Bot className="h-4 w-4" />
            AI Observability
          </p>
          <h2 className="mt-2 text-3xl font-bold">Companion usage</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <p className="rounded-2xl bg-muted p-4 text-sm font-bold">
              Searches: {analytics?.aiUsage.searches ?? 0}
            </p>
            <p className="rounded-2xl bg-muted p-4 text-sm font-bold">
              Recommendations: {analytics?.aiUsage.recommendations ?? 0}
            </p>
            <p className="rounded-2xl bg-muted p-4 text-sm font-bold">
              Comparisons: {analytics?.aiUsage.comparisons ?? 0}
            </p>
            <p className="rounded-2xl bg-muted p-4 text-sm font-bold">
              Area queries: {analytics?.aiUsage.areaQueries ?? 0}
            </p>
            <p className="rounded-2xl bg-muted p-4 text-sm font-bold">
              Lead drafts: {analytics?.aiUsage.leadAssistant ?? 0}
            </p>
            <p className="rounded-2xl bg-muted p-4 text-sm font-bold">
              Failures: {analytics?.aiUsage.failures ?? 0}
            </p>
          </div>
        </Card>

        <Card className="p-6 shadow-soft sm:p-8">
          <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
            <Rocket className="h-4 w-4" />
            Launch Readiness
          </p>
          <h2 className="mt-2 text-3xl font-bold">
            {analytics?.launchReadiness.ready ? "Ready for wider rollout" : "Launch issues to review"}
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <p className="rounded-2xl bg-muted p-4 text-sm font-bold">
              Missing images: {analytics?.launchReadiness.missingImages ?? 0}
            </p>
            <p className="rounded-2xl bg-muted p-4 text-sm font-bold">
              Incomplete listings: {analytics?.launchReadiness.incompleteListings ?? 0}
            </p>
            <p className="rounded-2xl bg-muted p-4 text-sm font-bold">
              Expired featured: {analytics?.launchReadiness.expiredFeatured ?? 0}
            </p>
            <p className="rounded-2xl bg-muted p-4 text-sm font-bold">
              Expired premium: {analytics?.launchReadiness.expiredPremium ?? 0}
            </p>
            <p className="rounded-2xl bg-muted p-4 text-sm font-bold">
              Broken media refs: {analytics?.launchReadiness.brokenMedia ?? 0}
            </p>
            <p className="rounded-2xl bg-muted p-4 text-sm font-bold">
              Total issues: {analytics?.launchReadiness.totalIssues ?? 0}
            </p>
          </div>
        </Card>
      </section>

      <section className="grid gap-8 xl:grid-cols-3">
        <Card className="p-6 shadow-soft sm:p-8">
          <p className="text-sm font-semibold text-violet-700">
            Lead Sources
          </p>
          <h2 className="mt-2 text-3xl font-bold">Lead generation mix</h2>
          <div className="mt-6 space-y-3">
            {analytics?.leadSources.map((item) => (
              <div className="flex items-center justify-between rounded-2xl bg-muted p-4" key={item.source}>
                <span className="text-sm font-bold">{item.source}</span>
                <span className="text-sm font-bold text-violet-700">
                  {item._count._all}
                </span>
              </div>
            ))}
            {!analytics?.leadSources.length ? (
              <p className="rounded-2xl bg-muted p-4 text-sm font-bold text-muted-foreground">
                No lead source data yet.
              </p>
            ) : null}
          </div>
        </Card>

        <Card className="p-6 shadow-soft sm:p-8">
          <p className="text-sm font-semibold text-violet-700">
            Top Reels
          </p>
          <h2 className="mt-2 text-3xl font-bold">Reel performance</h2>
          <div className="mt-6 space-y-3">
            {analytics?.topReels.map((reel) => (
              <div className="rounded-2xl bg-muted p-4" key={reel.id}>
                <h3 className="font-bold">{reel.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {reel.viewsCount} views, {reel.likesCount} likes, {reel.sharesCount} shares, {reel.leadsCount} leads
                </p>
              </div>
            ))}
            {!analytics?.topReels.length ? (
              <p className="rounded-2xl bg-muted p-4 text-sm font-bold text-muted-foreground">
                No reel performance yet.
              </p>
            ) : null}
          </div>
        </Card>

        <Card className="p-6 shadow-soft sm:p-8">
          <p className="text-sm font-semibold text-violet-700">
            Top Properties
          </p>
          <h2 className="mt-2 text-3xl font-bold">CTA performance</h2>
          <div className="mt-6 space-y-3">
            {analytics?.topProperties.map((property) => (
              <div className="rounded-2xl bg-muted p-4" key={property.id}>
                <h3 className="font-bold">{property.title}</h3>
                <p className="mt-1 text-xs font-bold text-muted-foreground">
                  {property.city}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {property.callClicks} calls, {property.whatsappClicks} WhatsApp, {property.inquirySubmissions} inquiries
                </p>
              </div>
            ))}
            {!analytics?.topProperties.length ? (
              <p className="rounded-2xl bg-muted p-4 text-sm font-bold text-muted-foreground">
                No property CTA data yet.
              </p>
            ) : null}
          </div>
        </Card>
      </section>

      <section className="grid gap-8 xl:grid-cols-2">
        <Card className="p-6 shadow-soft sm:p-8">
          <p className="text-sm font-semibold text-violet-700">
            Property Verification Queue
          </p>
          <h2 className="mt-2 text-3xl font-bold">Pending trust review</h2>
          <div className="mt-6 space-y-4">
            {pendingVerificationProperties.map((property) => (
              <div className="rounded-[1.5rem] bg-muted p-5" key={property.id}>
                <VerificationBadge
                  entity="property"
                  status={property.verificationStatus}
                />
                <h3 className="mt-3 text-xl font-bold">{property.title}</h3>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  {[property.locality, property.city].filter(Boolean).join(", ")}
                </p>
                <p className="mt-2 text-xs font-bold text-muted-foreground">
                  Listing status: {property.status.replace("_", " ")}
                </p>
                <VerificationActions id={property.id} target="property" />
              </div>
            ))}
            {!pendingVerificationProperties.length ? (
              <p className="rounded-[1.5rem] bg-muted p-5 text-sm font-bold text-muted-foreground">
                No pending property verifications.
              </p>
            ) : null}
          </div>
        </Card>

        <Card className="p-6 shadow-soft sm:p-8">
          <p className="text-sm font-semibold text-violet-700">
            Broker Verification Queue
          </p>
          <h2 className="mt-2 text-3xl font-bold">Pending brokers</h2>
          <div className="mt-6 space-y-4">
            {pendingBrokerProfiles.map((profile) => (
              <div className="rounded-[1.5rem] bg-muted p-5" key={profile.id}>
                <VerificationBadge
                  entity="broker"
                  status={profile.verificationStatus}
                />
                <h3 className="mt-3 text-xl font-bold">
                  {profile.fullName ?? profile.user.email ?? "Broker profile"}
                </h3>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  {[profile.city, profile.user.email].filter(Boolean).join(" / ")}
                </p>
                <p className="mt-2 text-xs font-bold text-muted-foreground">
                  Phone: {profile.whatsappVerified ? "Verified" : "Not verified"}
                </p>
                <VerificationActions id={profile.id} target="broker" />
              </div>
            ))}
            {!pendingBrokerProfiles.length ? (
              <p className="rounded-[1.5rem] bg-muted p-5 text-sm font-bold text-muted-foreground">
                No pending broker verifications.
              </p>
            ) : null}
          </div>
        </Card>

        <Card className="p-6 shadow-soft sm:p-8">
          <p className="text-sm font-semibold text-violet-700">
            Builder Verification Queue
          </p>
          <h2 className="mt-2 text-3xl font-bold">Pending builders</h2>
          <div className="mt-6 space-y-4">
            {pendingBuilderProfiles.map((profile) => (
              <div className="rounded-[1.5rem] bg-muted p-5" key={profile.id}>
                <VerificationBadge
                  entity="builder"
                  status={profile.verificationStatus}
                />
                <h3 className="mt-3 text-xl font-bold">
                  {profile.fullName ?? profile.user.email ?? "Builder profile"}
                </h3>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  {[profile.city, profile.user.email].filter(Boolean).join(" / ")}
                </p>
                <p className="mt-2 text-xs font-bold text-muted-foreground">
                  Phone: {profile.whatsappVerified ? "Verified" : "Not verified"}
                </p>
                <VerificationActions id={profile.id} target="builder" />
              </div>
            ))}
            {!pendingBuilderProfiles.length ? (
              <p className="rounded-[1.5rem] bg-muted p-5 text-sm font-bold text-muted-foreground">
                No pending builder verifications.
              </p>
            ) : null}
          </div>
        </Card>

        <Card className="p-6 shadow-soft sm:p-8">
          <p className="text-sm font-semibold text-violet-700">
            Listing Moderation Queue
=======
      <section className="grid gap-8 xl:grid-cols-2">
        <Card className="p-6 shadow-soft sm:p-8">
          <p className="text-sm font-semibold text-violet-700">
            Verification Queue
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
          </p>
          <h2 className="mt-2 text-3xl font-bold">Pending properties</h2>
          <div className="mt-6 space-y-4">
            {pendingProperties.map((property) => (
              <div className="rounded-[1.5rem] bg-muted p-5" key={property.id}>
                <p className="text-xs font-bold text-violet-700">
                  {property.status.replace("_", " ")}
                </p>
                <h3 className="mt-2 text-xl font-bold">{property.title}</h3>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  {[property.locality, property.city].filter(Boolean).join(", ")}
                </p>
                <ModerationActions id={property.id} type="properties" />
              </div>
            ))}
            {!pendingProperties.length ? (
              <p className="rounded-[1.5rem] bg-muted p-5 text-sm font-bold text-muted-foreground">
                No pending property approvals.
              </p>
            ) : null}
          </div>
        </Card>

        <Card className="p-6 shadow-soft sm:p-8">
          <p className="text-sm font-semibold text-violet-700">
            Media Moderation
          </p>
          <h2 className="mt-2 text-3xl font-bold">Pending reels</h2>
          <div className="mt-6 space-y-4">
            {pendingReels.map((reel) => (
              <div className="rounded-[1.5rem] bg-muted p-5" key={reel.id}>
                <p className="text-xs font-bold text-violet-700">
                  {reel.status.replace("_", " ")}
                </p>
                <h3 className="mt-2 text-xl font-bold">{reel.title}</h3>
                <ModerationActions id={reel.id} type="reels" />
              </div>
            ))}
            {!pendingReels.length ? (
              <p className="rounded-[1.5rem] bg-muted p-5 text-sm font-bold text-muted-foreground">
                No pending reel approvals.
              </p>
            ) : null}
          </div>
        </Card>
      </section>

      <Card className="p-6 shadow-soft sm:p-8">
        <p className="text-sm font-semibold text-violet-700">Reports</p>
        <h2 className="mt-2 text-3xl font-bold">Trust and safety inbox</h2>
        <div className="mt-6 grid gap-4">
          {reports.map((report) => (
            <div className="rounded-[1.5rem] bg-muted p-5" key={report.id}>
              <p className="text-xs font-bold text-violet-700">
                {report.entityType ?? "unknown"} /{" "}
                {report.createdAt.toLocaleDateString()}
<<<<<<< HEAD
              </p>
              <p className="mt-2 font-bold">
                {report.entityType === "reel" ? "Reel report" : report.action}
=======
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
              </p>
              <pre className="mt-3 overflow-auto rounded-2xl bg-white p-3 text-xs text-muted-foreground">
                {JSON.stringify(report.metadata, null, 2)}
              </pre>
            </div>
          ))}
          {!reports.length ? (
            <p className="rounded-[1.5rem] bg-muted p-5 text-sm font-bold text-muted-foreground">
              No user reports yet.
            </p>
          ) : null}
        </div>
      </Card>

      <Card className="p-6 shadow-soft sm:p-8">
        <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
          <AlertTriangle className="h-4 w-4" />
          Operational readiness
        </p>
        <h2 className="mt-2 text-3xl font-bold">
          Keep controls ready before wider marketplace rollout.
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            "Create admin users",
            "Configure storage moderation",
            "Review broker verification",
            "Review builder verification",
            "Test report abuse workflow",
            "Monitor audit logs"
          ].map((item) => (
            <p
              className="flex items-center gap-2 rounded-2xl bg-muted p-4 text-sm font-bold"
              key={item}
            >
              <FileCheck className="h-4 w-4 text-emerald-500" />
              {item}
            </p>
          ))}
        </div>
      </Card>
    </div>
  );
}
