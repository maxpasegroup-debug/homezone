import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

export function StatusChip({
  tone = "neutral",
  children
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    danger: "bg-rose-50 text-rose-700",
    info: "bg-sky-50 text-sky-700",
    neutral: "bg-muted text-muted-foreground",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700"
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function DashboardTable({
  columns,
  rows
}: {
  columns: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto rounded-3xl border bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-muted text-xs font-bold uppercase text-muted-foreground">
          <tr>
            {columns.map((column) => (
              <th className="px-4 py-3" key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td className="px-4 py-4 align-top" key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-3xl border bg-white p-3">
      {children}
    </div>
  );
}

export function ActivityTimeline({
  items
}: {
  items: { description: string; id: string; time?: string; title: string }[];
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div className="rounded-2xl bg-muted p-4" key={item.id}>
          <p className="font-bold">{item.title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
          {item.time ? <p className="mt-2 text-xs font-bold text-violet-700">{item.time}</p> : null}
        </div>
      ))}
      {!items.length ? <EmptyState text="Activity will appear here when users take action." title="No activity yet" /> : null}
    </div>
  );
}

export function LoadingState({ label = "Loading workspace" }: { label?: string }) {
  return (
    <div className="rounded-3xl border bg-white p-8 text-center shadow-sm">
      <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-violet-100" />
      <p className="mt-4 text-sm font-bold text-muted-foreground">{label}</p>
    </div>
  );
}

export function PaginationControls({
  hasNextPage,
  hasPreviousPage,
  nextHref,
  previousHref
}: {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextHref: string;
  previousHref: string;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      {hasPreviousPage ? (
        <Button asChild size="sm" variant="outline">
          <Link href={previousHref as Route}>Previous</Link>
        </Button>
      ) : (
        <Button disabled size="sm" variant="outline">Previous</Button>
      )}
      {hasNextPage ? (
        <Button asChild size="sm" variant="outline">
          <Link href={nextHref as Route}>Next</Link>
        </Button>
      ) : (
        <Button disabled size="sm" variant="outline">Next</Button>
      )}
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
