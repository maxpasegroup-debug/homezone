import 'package:flutter/material.dart';
import '../../../theme/design_tokens.dart';
import '../data/demo_properties.dart';

class PropertyCard extends StatelessWidget {
  const PropertyCard({
    super.key,
    required this.property,
    required this.saved,
    required this.onFavorite,
  });
  final DemoProperty property;
  final bool saved;
  final VoidCallback onFavorite;
  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.only(bottom: Space.lg),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: colors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(AppShape.radius),
        border: Border.all(color: colors.outlineVariant),
        boxShadow: const [AppShape.shadow],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Stack(
            children: [
              AspectRatio(
                aspectRatio: 16 / 9,
                child: Image.asset(
                  property.image,
                  fit: BoxFit.cover,
                  excludeFromSemantics: true,
                ),
              ),
              Positioned(
                top: 12,
                left: 12,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: BrandColors.forest,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'DEMO',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                    ),
                  ),
                ),
              ),
              Positioned(
                top: 8,
                right: 8,
                child: IconButton.filled(
                  key: ValueKey('favorite-${property.id}'),
                  tooltip: '${saved ? "Unsave" : "Save"} ${property.title}',
                  style: IconButton.styleFrom(
                    backgroundColor: colors.surface,
                    foregroundColor: colors.primary,
                  ),
                  onPressed: onFavorite,
                  isSelected: saved,
                  icon: const Icon(Icons.favorite_border_rounded),
                  selectedIcon: const Icon(Icons.favorite_rounded),
                ),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.all(Space.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  property.price,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: colors.primary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: Space.sm),
                Text(
                  property.title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: Space.xs),
                Text(
                  property.location,
                  style: TextStyle(color: colors.onSurfaceVariant),
                ),
                const SizedBox(height: Space.md),
                Wrap(
                  spacing: 14,
                  runSpacing: 8,
                  children: [
                    _Fact(icon: Icons.home_outlined, text: property.type),
                    if (property.bedrooms != null)
                      _Fact(
                        icon: Icons.bed_outlined,
                        text: '${property.bedrooms} beds',
                      ),
                    if (property.bathrooms != null)
                      _Fact(
                        icon: Icons.bathtub_outlined,
                        text: '${property.bathrooms} baths',
                      ),
                    _Fact(icon: Icons.square_foot, text: property.area),
                  ],
                ),
                const SizedBox(height: Space.sm),
                Text(
                  'Representative photo · fictional listing',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: colors.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Fact extends StatelessWidget {
  const _Fact({required this.icon, required this.text});
  final IconData icon;
  final String text;
  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(icon, size: 16, color: Theme.of(context).colorScheme.primary),
      const SizedBox(width: 4),
      Flexible(child: Text(text, style: Theme.of(context).textTheme.bodySmall)),
    ],
  );
}
