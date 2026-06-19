import { BadgeCheck, Clock3, ShieldAlert, XCircle } from "lucide-react";

const statusStyle: Record<string, string> = {
  EXPIRED: "bg-amber-50 text-amber-700",
  PENDING: "bg-muted text-muted-foreground",
  REJECTED: "bg-red-50 text-red-700",
  SUSPENDED: "bg-red-50 text-red-700",
  VERIFIED: "bg-emerald-50 text-emerald-700"
};

function StatusIcon({ status }: { status: string }) {
  if (status === "VERIFIED") return <BadgeCheck className="h-4 w-4" />;
  if (status === "REJECTED" || status === "SUSPENDED") {
    return <XCircle className="h-4 w-4" />;
  }
  if (status === "EXPIRED") return <ShieldAlert className="h-4 w-4" />;
  return <Clock3 className="h-4 w-4" />;
}

function labelFor({
  entity,
  status
}: {
  entity: "property" | "broker" | "builder";
  status: string;
}) {
  if (entity === "broker" && status === "VERIFIED") return "Verified Broker";
  if (entity === "builder" && status === "VERIFIED") return "Verified Builder";
  if (status === "VERIFIED") return "Verified";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

export function VerificationBadge({
  entity,
  status
}: {
  entity: "property" | "broker" | "builder";
  status?: string | null;
}) {
  const normalized = status ?? "PENDING";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
        statusStyle[normalized] ?? statusStyle.PENDING
      }`}
    >
      <StatusIcon status={normalized} />
      {labelFor({ entity, status: normalized })}
    </span>
  );
}
