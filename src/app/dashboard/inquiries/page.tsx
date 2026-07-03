import { redirect } from "next/navigation";
import type { Route } from "next";

export default function InquiriesPage() {
  redirect("/dashboard/leads" as Route);
}
