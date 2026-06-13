import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";

export async function AuthNavActions() {
  const session = await auth();

  if (!session?.user) {
    return (
      <Button asChild className="hidden sm:inline-flex" variant="outline">
        <a href="/auth">Login</a>
      </Button>
    );
  }

  return (
    <div className="hidden items-center gap-2 sm:flex">
      <Button asChild variant="outline">
        <a href="/dashboard">Dashboard</a>
      </Button>
      <LogoutButton />
    </div>
  );
}
