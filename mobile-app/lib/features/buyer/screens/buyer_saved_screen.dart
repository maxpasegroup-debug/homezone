import 'package:flutter/material.dart';
import '../../../theme/design_tokens.dart';
import '../data/demo_properties.dart';
import '../widgets/buyer_components.dart';

class BuyerSavedScreen extends StatelessWidget {
  const BuyerSavedScreen({
    super.key,
    required this.favorites,
    required this.onFavorite,
    this.onOpen,
    required this.onSearch,
    this.onShortlists,
    this.onCompare,
  });
  final Set<String> favorites;
  final ValueChanged<DemoProperty>? onOpen;
  final ValueChanged<String> onFavorite;
  final VoidCallback onSearch;
  final VoidCallback? onShortlists, onCompare;
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
        Wrap(
          spacing: Space.sm,
          runSpacing: Space.sm,
          children: [
            OutlinedButton.icon(
              onPressed: onShortlists,
              icon: const Icon(Icons.folder_outlined),
              label: const Text('Shortlists'),
            ),
            OutlinedButton.icon(
              onPressed: onCompare,
              icon: const Icon(Icons.compare_arrows),
              label: const Text('Compare Properties'),
            ),
          ],
        ),
        const SizedBox(height: Space.md),
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
            onOpen: onOpen,
          ),
      ],
    );
  }
}
