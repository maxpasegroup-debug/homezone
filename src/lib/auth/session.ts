import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user;
}

export async function requireSessionUser() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth?next=/dashboard");
  }

  return user;
}
