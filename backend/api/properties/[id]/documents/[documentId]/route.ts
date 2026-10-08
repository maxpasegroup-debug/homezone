import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import {
  forbidden,
  handleApiError,
  notFound,
  ok,
  parseJson,
  unauthorized
} from "@/lib/api/response";
import { propertyDocumentUpdateSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    documentId: string;
    id: string;
  }>;
};

async function requireOwnedDocument(propertyId: string, documentId: string, user: {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}) {
  const profile = await getOrCreateProfile(user);
  const document = await db.propertyDocument.findUnique({
    include: {
      property: true
    },
    where: {
      id: documentId
    }
  });

  if (!document || document.propertyId !== propertyId) {
    return {
      error: notFound("Document not found")
    } as const;
  }

  if (document.property.ownerId !== profile.id && !isAdminRole(profile.role)) {
    return {
      error: forbidden()
    } as const;
  }

  return {
    document,
    profile
  } as const;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const { documentId, id } = await context.params;
    const access = await requireOwnedDocument(id, documentId, session.user);

    if ("error" in access) {
      return access.error;
    }

    const parsed = await parseJson(request, propertyDocumentUpdateSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const document = await db.propertyDocument.update({
      data: parsed.data,
      where: {
        id: documentId
      }
    });

    return ok({ document });
  } catch (error) {
    return handleApiError(error, {
      route: "PATCH /api/properties/[id]/documents/[documentId]"
    });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const { documentId, id } = await context.params;
    const access = await requireOwnedDocument(id, documentId, session.user);

    if ("error" in access) {
      return access.error;
    }

    await db.propertyDocument.delete({
      where: {
        id: documentId
      }
    });

    await auditLog({
      action: "property_document_deleted",
      actorId: access.profile.id,
      entityId: documentId,
      entityType: "property_document",
      metadata: {
        propertyId: id
      }
    });

    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error, {
      route: "DELETE /api/properties/[id]/documents/[documentId]"
    });
  }
}
