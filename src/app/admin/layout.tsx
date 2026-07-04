import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { requireAdminProfile } from "@/lib/auth/admin";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireAdminProfile();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <header className="sticky top-0 z-40 border-b border-violet-100/80 bg-white/85 backdrop-blur-xl">
        <div className="container flex min-h-16 items-center justify-between gap-4 py-3">
          <Link className="flex items-center gap-3" href="/admin">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-bold text-violet-700">HomeZone Admin</span>
              <span className="block text-xs font-semibold text-muted-foreground">Protected operations dashboard</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-muted-foreground">Signed in</p>
              <p className="text-sm font-bold">{profile.fullName ?? "Admin"}</p>
            </div>
            <LogoutButton callbackUrl="/auth" label="Logout" variant="outline" />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
