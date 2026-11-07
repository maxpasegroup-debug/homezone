import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";

// Keep public discovery separate from Builder's owned-project include: that
// include contains team members, bookings, activities and other private data.
export const mobileProjectSelect = {
  id: true, name: true, city: true, locality: true, address: true,
  description: true, amenities: true, constructionStatus: true,
  completionDate: true, unitsCount: true, availableUnits: true, mediaUrls: true,
  status: true, createdAt: true, updatedAt: true
} satisfies Prisma.BuilderProjectSelect;

export const mobileProjectUnitSelect = {
  id: true, unitType: true, areaValue: true, areaUnit: true, bedrooms: true,
  bathrooms: true, price: true, imageUrls: true, status: true
} satisfies Prisma.BuilderUnitSelect;

export const mobileProjectCatalogSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(24).default(12),
  keyword: z.string().trim().min(1).max(120).optional(),
  city: z.string().trim().min(1).max(120).optional()
}).strict();

export const mobileProjectDetailSchema = z.object({
  unitsPage: z.coerce.number().int().min(1).max(1000).default(1)
}).strict();

// Orphaned projects and projects belonging to suspended/non-Builder accounts
// are not public, even if an old project row still carries PUBLISHED status.
export const publicProjectWhere = {
  status: "PUBLISHED",
  builder: { is: { role: "BUILDER", verificationStatus: { not: "SUSPENDED" } } }
} satisfies Prisma.BuilderProjectWhereInput;

// These fields originate in public image storage. Do not turn legacy/private
// document paths, signed URLs or brochure PDFs into public project assets.
export function publicProjectImage(value: string | null | undefined): string | null {
  if (!value || value.length > 20_000) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.hash || url.search ||
        (url.port && url.port !== "443") || /\/api\/private-files(?:\/|$)/i.test(url.pathname)) return null;
    if (!/\.(?:jpe?g|png|webp)$/i.test(url.pathname) && !url.pathname.includes("/image/upload/")) return null;
    return value;
  } catch { return null; }
}

function images(values: string[]) {
  return values.slice(0, 100).flatMap(value => publicProjectImage(value) ?? []);
}

function publicAmenities(values: string[]) {
  return values.slice(0, 100).map(value => value.trim().slice(0, 20_000)).filter(Boolean);
}

export async function mobileProjectCatalog(filters: z.infer<typeof mobileProjectCatalogSchema>) {
  const where: Prisma.BuilderProjectWhereInput = { ...publicProjectWhere };
  if (filters.city) where.city = { equals: filters.city, mode: "insensitive" };
  if (filters.keyword) where.OR = ["name", "city", "locality", "description"].map(field => ({
    [field]: { contains: filters.keyword, mode: "insensitive" }
  }));
  const rows = await db.builderProject.findMany({
    where, select: mobileProjectSelect,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize + 1
  });
  return {
    projects: rows.slice(0, filters.pageSize).map(row => ({
      ...row, amenities: publicAmenities(row.amenities), mediaUrls: images(row.mediaUrls)
    })),
    page: filters.page, hasMore: rows.length > filters.pageSize, source: "database" as const
  };
}

export async function mobileProjectDetail(id: string, unitsPage: number) {
  const project = await db.builderProject.findFirst({
    where: { ...publicProjectWhere, id },
    select: {
      ...mobileProjectSelect, floorPlanUrls: true, masterPlanUrl: true,
      units: {
        where: { status: "AVAILABLE" }, select: mobileProjectUnitSelect,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        skip: (unitsPage - 1) * 24, take: 25
      }
    }
  });
  if (!project) return null;
  return {
    ...project, amenities: publicAmenities(project.amenities), mediaUrls: images(project.mediaUrls),
    floorPlanUrls: images(project.floorPlanUrls), masterPlanUrl: publicProjectImage(project.masterPlanUrl),
    units: project.units.slice(0, 24).map(unit => ({ ...unit, imageUrls: images(unit.imageUrls) })),
    unitsPage, unitsHasMore: project.units.length > 24
  };
}
