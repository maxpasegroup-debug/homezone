import 'package:flutter/material.dart';
import '../../../theme/design_tokens.dart';
import '../data/demo_properties.dart';
import '../widgets/buyer_components.dart';
import 'buyer_gallery_screen.dart';

class BuyerPropertyDetailScreen extends StatelessWidget {
  const BuyerPropertyDetailScreen({
    super.key,
    required this.property,
    required this.saved,
    required this.onFavorite,
  });
  final DemoProperty property;
  final bool saved;
  final VoidCallback onFavorite;
  String value(String? text, String fallback) =>
      text == null || text.trim().isEmpty ? fallback : text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final overviewKey = GlobalKey();
    void gallery(PropertyMedia media) => Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => BuyerGalleryScreen(property: property, initial: media),
      ),
    );
    void preview(String action) => showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('$action preview'),
        content: const Text(
          'No enquiry was sent and no call was placed. This offline preview cannot contact a seller.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
    final facts = <String>[
      property.category.label,
      value(property.type, 'Property type unavailable'),
      if (property.bedrooms != null) '${property.bedrooms} bedrooms',
      if (property.bathrooms != null) '${property.bathrooms} bathrooms',
      if (property.area.trim().isNotEmpty) property.area,
      if (property.furnishing?.trim().isNotEmpty ?? false) property.furnishing!,
    ];
    Widget fallback() => Container(
      color: theme.colorScheme.surfaceContainerHighest,
      child: const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.home_outlined, size: 48),
            Text('Photo unavailable'),
          ],
        ),
      ),
    );
    return Scaffold(
      appBar: AppBar(title: const Text('Property details')),
      body: SafeArea(
        child: BuyerPage(
          children: [
            InkWell(
              key: const ValueKey('detail-photo'),
              onTap: () => gallery(PropertyMedia.photos),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(AppShape.radius),
                child: AspectRatio(
                  aspectRatio: 16 / 10,
                  child: property.image.trim().isEmpty
                      ? fallback()
                      : Image.asset(
                          property.image,
                          fit: BoxFit.cover,
                          semanticLabel: 'Representative demo property photo',
                          errorBuilder: (_, _, _) => fallback(),
                        ),
                ),
              ),
            ),
            const SizedBox(height: Space.lg),
            Text(
              value(property.price, 'Price unavailable'),
              style: theme.textTheme.headlineMedium?.copyWith(
                color: theme.colorScheme.primary,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: Space.sm),
            Text(
              value(property.title, 'Untitled demo property'),
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: Space.sm),
            Text(
              value(property.location, 'Location unavailable'),
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: Space.lg),
            Wrap(
              spacing: Space.sm,
              runSpacing: Space.sm,
              children: [
                TextButton(
                  onPressed: () {
                    final target = overviewKey.currentContext;
                    if (target != null) Scrollable.ensureVisible(target);
                  },
                  child: const Text('Overview'),
                ),
                TextButton(
                  onPressed: () => gallery(PropertyMedia.photos),
                  child: const Text('Photos'),
                ),
                TextButton(
                  onPressed: () => gallery(PropertyMedia.videos),
                  child: const Text('Videos'),
                ),
                TextButton(
                  onPressed: () => gallery(PropertyMedia.floorPlan),
                  child: const Text('Floor Plan'),
                ),
              ],
            ),
            const SizedBox(height: Space.md),
            Wrap(
              key: overviewKey,
              spacing: Space.sm,
              runSpacing: Space.sm,
              children: [for (final fact in facts) Chip(label: Text(fact))],
            ),
            const SizedBox(height: Space.lg),
            FilledButton.icon(
              key: const ValueKey('detail-favorite'),
              onPressed: onFavorite,
              icon: Icon(saved ? Icons.favorite : Icons.favorite_border),
              label: Text(saved ? 'Remove from saved' : 'Save demo property'),
            ),
            const SizedBox(height: Space.lg),
            Text('About this property', style: theme.textTheme.titleLarge),
            const SizedBox(height: Space.sm),
            Text(
              value(
                property.description,
                'No description is available for this demo listing.',
              ),
            ),
            const SizedBox(height: Space.lg),
            Wrap(
              spacing: Space.sm,
              runSpacing: Space.sm,
              children: [
                OutlinedButton.icon(
                  onPressed: () => preview('Contact'),
                  icon: const Icon(Icons.phone_outlined),
                  label: const Text('Contact preview'),
                ),
                FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: BrandColors.gold,
                    foregroundColor: BrandColors.forest,
                  ),
                  onPressed: () => preview('Enquiry'),
                  icon: const Icon(Icons.chat_bubble_outline),
                  label: const Text('Enquiry preview'),
                ),
              ],
            ),
            const SizedBox(height: Space.lg),
            const EmptySection(
              title: 'Fictional demo listing',
              message:
                  'Representative photography and fictional sample details. This is not live inventory. Favorites stay in memory only and reset when you leave the preview or restart the app.',
            ),
          ],
        ),
      ),
    );
  }
}
