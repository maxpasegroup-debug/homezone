import { registrationRequest } from "@/lib/auth/email-registration";
export async function POST(request: Request) { return registrationRequest(request, "resend"); }
