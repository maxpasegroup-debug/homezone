export const MIN_PROPERTY_PHOTOS = 4;

type PropertyPhotos = {
  coverImageUrl?: string | null;
  mediaUrls?: readonly string[] | null;
};

type PhotoPublicationState = PropertyPhotos & { status: string };

/** Count photo references, not video/tour fields or repeated cover/gallery URLs. */
export function countPropertyPhotos(property: PropertyPhotos): number {
  const distinct = new Set<string>();
  for (const value of [property.coverImageUrl, ...(property.mediaUrls ?? [])]) {
    if (!value) continue;
    try {
      const url = new URL(value.trim());
      const path = decodeURIComponent(url.pathname).toLowerCase();
      if (url.protocol !== "https:" || url.username || url.password ||
          (url.port && url.port !== "443") ||
          ["/api/private-files", "/api/mobile/documents"].some(prefix => path === prefix || path.startsWith(`${prefix}/`))) {
        continue;
      }
      // A fragment does not identify a different image resource. URL also
      // normalizes host casing and default ports without changing stored URLs.
      url.hash = "";
      distinct.add(url.href);
    } catch {
      // Request schemas reject malformed URLs. Do not count malformed legacy
      // values as photographs if they exist in a stored record.
    }
  }
  return distinct.size;
}

/** Validate the final state while the caller holds the property's write lock. */
export function propertyPhotoTransitionError(
  current: PhotoPublicationState | null,
  next: PhotoPublicationState
): string | null {
  if (next.status !== "PUBLISHED") return null;
  const nextCount = countPropertyPhotos(next);
  if (nextCount >= MIN_PROPERTY_PHOTOS) return null;

  // Leave older published listings visible. Their photos can be added or
  // replaced, but an edit cannot reduce an already incomplete gallery.
  if (current?.status === "PUBLISHED" && nextCount >= countPropertyPhotos(current)) return null;
  return `Add at least ${MIN_PROPERTY_PHOTOS} different property photos before publishing. A cover photo repeated in the gallery counts once.`;
}
