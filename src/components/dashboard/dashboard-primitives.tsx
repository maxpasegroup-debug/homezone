import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function DashboardHeader({
  eyebrow,
  title,
  subtitle
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="max-w-4xl">
      <p className="text-sm font-semibold text-violet-700">{eyebrow}</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-6xl">
        {title}
      </h1>
      <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">
        {subtitle}
      </p>
    </div>
  );
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  note
}: {
  icon: LucideIcon;
  label: string;
  note?: string;
  value: number | string;
}) {
  return (
    <Card className="p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
          <Icon className="h-5 w-5" />
        </span>
        {note ? (
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
            {note}
          </span>
        ) : null}
      </div>
      <p className="mt-5 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm font-semibold text-muted-foreground">
        {label}
      </p>
    </Card>
  );
}

export function DashboardSection({
  children,
  title,
  eyebrow
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <Card className="p-5 shadow-sm sm:p-7">
      <p className="text-sm font-semibold text-violet-700">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold">{title}</h2>
      <div className="mt-5">{children}</div>
    </Card>
  );
}

export function EmptyState({
  title,
  text
}: {
  text: string;
  title: string;
}) {
  return (
    <div className="rounded-2xl bg-muted p-5 text-sm">
      <p className="font-bold">{title}</p>
      <p className="mt-2 leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

export function DetailRow({
  label,
  value
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-muted p-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-semibold text-muted-foreground">
        {label}
      </span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
