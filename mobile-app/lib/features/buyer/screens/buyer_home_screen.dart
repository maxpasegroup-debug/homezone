import 'package:flutter/material.dart';
import '../../../shared/ui/auth_components.dart';
import '../../../theme/design_tokens.dart';
import '../data/demo_properties.dart';
import '../widgets/buyer_components.dart';
import '../data/buyer_filters.dart';

class BuyerHomeScreen extends StatelessWidget {
  const BuyerHomeScreen({
    super.key,
    required this.location,
    required this.onLocation,
    required this.onSearch,
    required this.category,
    required this.onCategory,
    required this.favorites,
    required this.onFavorite,
    this.onOpen,
    this.recentlyViewed = const [],
    this.refinements = const BuyerFilters(),
    this.onLocality,
  });
  final String location;
  final VoidCallback onLocation, onSearch;
  final PropertyCategory? category;
  final ValueChanged<PropertyCategory?> onCategory;
  final Set<String> favorites;
  final List<DemoProperty> recentlyViewed;
  final ValueChanged<DemoProperty>? onOpen;
  final BuyerFilters refinements;
  final ValueChanged<String>? onLocality;
  final ValueChanged<String> onFavorite;
  @override
  Widget build(BuildContext context) {
    final properties = filterDemoProperties(
      location: location,
      category: category,
    ).where(refinements.accepts).toList();
    final featured = properties.where((p) => p.featured).toList();
    final recommended = properties.where((p) => !p.featured).toList();
    return BuyerPage(
      padding: const EdgeInsets.fromLTRB(
        Space.md,
        Space.sm,
        Space.md,
        Space.lg,
      ),
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            key: const ValueKey('location-selector'),
            onPressed: onLocation,
            icon: const Icon(Icons.location_on_outlined),
            label: Text('$location · Preview'),
          ),
        ),
        const SizedBox(height: Space.xs),
        Text(
          'Find your next chapter.',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: Space.sm),
        TextField(
          key: const ValueKey('home-search'),
          readOnly: true,
          onTap: onSearch,
          decoration: const InputDecoration(
            hintText: 'Search homes, areas or property types',
            prefixIcon: Icon(Icons.search),
          ),
        ),
        const SizedBox(height: Space.sm),
        CategoryFilter(
          category: category,
          onChanged: onCategory,
          compact: true,
        ),
        const SizedBox(height: Space.md),
        Text(
          'Popular localities',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: Space.xs),
        Wrap(
          spacing: Space.sm,
          runSpacing: Space.sm,
          children: [
            for (final entry in [
              ('Kakkanad', 'assets/images/residence-day.jpg'),
              ('Aluva', 'assets/images/residence-evening.jpg'),
              ('Vyttila', 'assets/images/residence-day.jpg'),
            ])
              SizedBox(
                width: 86,
                child: InkWell(
                  onTap: onLocality == null
                      ? null
                      : () => onLocality!(entry.$1),
                  child: Column(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.asset(
                          entry.$2,
                          height: 52,
                          width: 86,
                          fit: BoxFit.cover,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(entry.$1, textAlign: TextAlign.center),
                    ],
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: Space.md),
        Text(
          'Fictional demo listings · Offline preview',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: Space.xs),
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text(
              'Featured properties',
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
            TextButton(
              onPressed: onSearch,
              child: const Text('Browse all properties'),
            ),
          ],
        ),
        const SizedBox(height: Space.sm),
        if (featured.isEmpty)
          const EmptySection(
            title: 'No featured demos',
            message: 'Try a different location or category.',
          )
        else
          PropertyResults(
            properties: featured,
            grid: true,
            favorites: favorites,
            onFavorite: onFavorite,
            onOpen: onOpen,
          ),
        const SizedBox(height: Space.md),
        const PreviewNotice(
          message:
              'Demo properties only. Search, location and favorites stay in this buyer preview. No live inventory.',
        ),
        const SizedBox(height: Space.md),
        Text(
          'Recommended properties',
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: Space.sm),
        const Text(
          'A curated demo selection, not personalised recommendations.',
        ),
        const SizedBox(height: Space.md),
        if (recommended.isEmpty)
          const EmptySection(
            title: 'No recommendations here yet',
            message: 'Explore all demo properties in Search.',
          )
        else
          PropertyResults(
            properties: recommended,
            grid: true,
            favorites: favorites,
            onFavorite: onFavorite,
            onOpen: onOpen,
          ),
        const SizedBox(height: Space.lg),
        Text(
          'Recently viewed',
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: Space.md),
        if (recentlyViewed.isEmpty)
          const EmptySection(
            title: 'Your story starts here',
            message:
                'Open a demo property to see it here. History stays in memory and resets when you leave the preview or restart the app.',
            icon: Icons.history,
          )
        else ...[
          const Text(
            'Your recently opened demo listings. History is kept only for this buyer preview.',
          ),
          const SizedBox(height: Space.md),
          PropertyResults(
            key: const ValueKey('recent-properties'),
            properties: recentlyViewed,
            favorites: favorites,
            onFavorite: onFavorite,
            onOpen: onOpen,
          ),
        ],
      ],
    );
  }
}
