import 'package:flutter/material.dart';
import '../../../shared/ui/auth_components.dart';
import '../../../theme/design_tokens.dart';
import '../data/demo_properties.dart';
import '../widgets/buyer_components.dart';

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
  });
  final String location;
  final VoidCallback onLocation, onSearch;
  final PropertyCategory? category;
  final ValueChanged<PropertyCategory?> onCategory;
  final Set<String> favorites;
  final ValueChanged<String> onFavorite;
  @override
  Widget build(BuildContext context) {
    final properties = filterDemoProperties(
      location: location,
      category: category,
    );
    final featured = properties.where((p) => p.featured).toList();
    final recommended = properties.where((p) => !p.featured).toList();
    return BuyerPage(
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
        const SizedBox(height: Space.md),
        const SectionHeader(
          eyebrow: 'WELCOME TO HOMEZONE',
          title: 'Find your next chapter.',
          subtitle: 'A home that feels like you.',
        ),
        const SizedBox(height: Space.lg),
        TextField(
          key: const ValueKey('home-search'),
          readOnly: true,
          onTap: onSearch,
          decoration: const InputDecoration(
            hintText: 'Search homes, areas or property types',
            prefixIcon: Icon(Icons.search),
          ),
        ),
        const SizedBox(height: Space.md),
        CategoryFilter(category: category, onChanged: onCategory),
        const SizedBox(height: Space.lg),
        const PreviewNotice(
          message:
              'Demo properties only. Search, location and favorites stay on this screen session. No live inventory.',
        ),
        const SizedBox(height: Space.lg),
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
        const SizedBox(height: Space.md),
        if (featured.isEmpty)
          const EmptySection(
            title: 'No featured demos',
            message: 'Try a different location or category.',
          )
        else
          PropertyResults(
            properties: featured,
            favorites: favorites,
            onFavorite: onFavorite,
          ),
        const SizedBox(height: Space.lg),
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
            favorites: favorites,
            onFavorite: onFavorite,
          ),
        const SizedBox(height: Space.lg),
        Text(
          'Recently viewed',
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: Space.md),
        const EmptySection(
          title: 'Your story starts here',
          message:
              'No recently viewed properties. Property details are coming in a later phase.',
          icon: Icons.history,
        ),
      ],
    );
  }
}
