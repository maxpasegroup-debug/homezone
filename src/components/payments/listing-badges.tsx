import { Crown, Star } from "lucide-react";

export function ListingBadges({
  featured,
  featuredUntil,
  premium,
  premiumUntil
}: {
  featured?: boolean;
  featuredUntil?: Date | null;
  premium?: boolean;
  premiumUntil?: Date | null;
}) {
  const now = Date.now();
  const isFeatured =
    Boolean(featured) && (!featuredUntil || featuredUntil.getTime() > now);
  const isPremium =
    Boolean(premium) && (!premiumUntil || premiumUntil.getTime() > now);

  if (!isFeatured && !isPremium) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {isFeatured ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
          <Star className="h-4 w-4" />
          Featured
        </span>
      ) : null}
      {isPremium ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
          <Crown className="h-4 w-4" />
          Premium
        </span>
      ) : null}
    </div>
  );
}
