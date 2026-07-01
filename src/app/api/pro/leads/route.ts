import { auth } from "@/auth";
import { handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { leadSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorized();
  }

  const profile = await getOrCreateProfile(session.user);
  const leads = await db.lead.findMany({
    where:
      isAdminRole(profile.role)
        ? {}
        : {
            OR: [{ assignedTo: profile.id }, { userId: profile.id }]
          },
    include: {
      property: true,
      notes: {
        orderBy: {
          createdAt: "desc"
        },
        take: 3
      },
      tasks: {
        orderBy: {
          createdAt: "desc"
        },
        take: 3
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return ok({ leads });
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const parsed = await parseJson(request, leadSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const profile = await getOrCreateProfile(session.user);
    const lead = await db.lead.create({
      data: {
        assignedTo: profile.id,
        propertyId: parsed.data.propertyId,
        name: parsed.data.name,
        phone: parsed.data.phone,
        message: parsed.data.message,
        source: parsed.data.source,
        aiScore: 55,
        nextAction: "Call and qualify requirement"
      }
    });

    return ok({ lead });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/pro/leads"
    });
  }
}
