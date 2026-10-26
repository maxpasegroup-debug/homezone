import { matchesPrivateReference } from "@/lib/documents/private-files";
import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import {
  apiError,
  forbidden,
  handleApiError,
  notFound,
  ok,
  parseJson,
  rateLimited,
  unauthorized
} from "@/lib/api/response";
import { propertyDocumentSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function canManageDocuments(propertyId: string, user: {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}) {
  const profile = await getOrCreateProfile(user);
  const property = await db.property.findUnique({
    where: {
      id: propertyId
    }
  });

  if (!property) {
    return {
      error: notFound("Property not found")
    } as const;
  }

  if (property.ownerId !== profile.id && !isAdminRole(profile.role)) {
    return {
      error: forbidden()
    } as const;
  }

  return {
    profile,
    property
  } as const;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const { id } = await context.params;
    const access = await canManageDocuments(id, session.user);

    if ("error" in access) {
      return access.error;
    }

    const documents = await db.propertyDocument.findMany({
      orderBy: {
        createdAt: "desc"
      },
      where: {
        propertyId: id
      }
    });

    return ok({ documents });
  } catch (error) {
    return handleApiError(new Error("Private document operation failed"), {
      route: "GET /api/properties/[id]/documents"
    });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const limit = checkRateLimit({
      key: rateLimitKey(request, "properties:documents", session.user.id),
      limit: 20,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const { id } = await context.params;
    const access = await canManageDocuments(id, session.user);

    if ("error" in access) {
      return access.error;
    }

    const parsed = await parseJson(request, propertyDocumentSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    if(!await matchesPrivateReference(parsed.data.fileUrl,"property",id)) return apiError("Use an authenticated document uploaded for this record.",400);

    const document = await db.propertyDocument.create({
      data: {
        ...parsed.data,
        propertyId: id,
        uploadedById: access.profile.id
      }
    });

    await auditLog({
      action: "property_document_uploaded",
      actorId: access.profile.id,
      entityId: document.id,
      entityType: "property_document",
      metadata: {
        documentType: document.documentType,
        propertyId: id
      }
    });

    return ok({ document });
  } catch (error) {
    return handleApiError(new Error("Private document operation failed"), {
      route: "POST /api/properties/[id]/documents"
    });
  }
}
