import 'package:flutter/material.dart';
import '../../../theme/design_tokens.dart';
import '../data/demo_properties.dart';
import '../widgets/buyer_components.dart';

class BuyerSavedScreen extends StatelessWidget {
  const BuyerSavedScreen({
    super.key,
    required this.favorites,
    required this.onFavorite,
    required this.onSearch,
  });
  final Set<String> favorites;
  final ValueChanged<String> onFavorite;
  final VoidCallback onSearch;
  @override
  Widget build(BuildContext context) {
    final saved = demoProperties
        .where((property) => favorites.contains(property.id))
        .toList();
    return BuyerPage(
      children: [
        Text(
          'Your saved places',
          style: Theme.of(context).textTheme.headlineLarge,
        ),
        const SizedBox(height: Space.sm),
        const Text(
          'Local favorites only. They reset when you leave the buyer preview or restart the app.',
        ),
        const SizedBox(height: Space.lg),
        if (saved.isEmpty) ...[
          const EmptySection(
            title: 'A little inspiration, saved',
            message: 'Tap a heart on a demo property to keep it here.',
            icon: Icons.favorite_border,
          ),
          const SizedBox(height: Space.md),
          FilledButton(
            onPressed: onSearch,
            child: const Text('Explore demo properties'),
          ),
        ] else
          PropertyResults(
            properties: saved,
            favorites: favorites,
            onFavorite: onFavorite,
          ),
      ],
    );
  }
}
