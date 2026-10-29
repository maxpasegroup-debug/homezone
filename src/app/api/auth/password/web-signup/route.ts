import { webRegistration } from "@/lib/auth/web-registration";

export async function POST(request: Request) {
  return webRegistration(request);
}
