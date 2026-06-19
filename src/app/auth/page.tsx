import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { env } from "@/lib/env";

type AuthPageProps = {
  searchParams?: Promise<{
    error?: string;
    flow?: string;
  }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  const initialFlow = params?.flow === "signup" ? "signup" : "signin";
  const authError = params?.error
    ? "Login is not configured correctly yet. Please check Google OAuth and Auth.js environment variables."
    : undefined;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/">
          HomeZone
        </Link>
        <div className="mt-10">
          <AuthForm authError={authError} googleEnabled={googleEnabled} initialFlow={initialFlow} />
        </div>
      </section>
    </main>
  );
}
