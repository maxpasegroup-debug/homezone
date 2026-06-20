import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { env, isEmailLoginEnabled } from "@/lib/env";

type AuthPageProps = {
  searchParams?: Promise<{
    code?: string;
    error?: string;
    flow?: string;
  }>;
};

function getAuthErrorMessage(error?: string, code?: string) {
  if (!error) return undefined;

  if (error === "Configuration") {
    return "Auth configuration error. Check Railway AUTH_SECRET, NEXTAUTH_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and database migrations.";
  }

  if (error === "OAuthCallback" || error === "OAuthCallbackError") {
    return "Google sign-in callback failed. Check the Google redirect URI and OAuth client credentials.";
  }

  if (error === "AccessDenied") {
    return "Access was denied by the sign-in provider.";
  }

  if (error === "Verification") {
    return "The sign-in link is invalid or expired. Please request a new link.";
  }

  return code ? `Sign-in failed: ${error} (${code}).` : `Sign-in failed: ${error}.`;
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  const emailEnabled = isEmailLoginEnabled();
  const initialFlow = params?.flow === "signup" ? "signup" : "signin";
  const authError = getAuthErrorMessage(params?.error, params?.code);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/">
          HomeZone
        </Link>
        <div className="mt-10">
          <AuthForm
            authError={authError}
            emailEnabled={emailEnabled}
            googleEnabled={googleEnabled}
            initialFlow={initialFlow}
          />
        </div>
      </section>
    </main>
  );
}
