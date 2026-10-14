import 'package:flutter/material.dart';
import '../../../theme/design_tokens.dart';
import '../data/demo_properties.dart';
import '../widgets/buyer_components.dart';

class BuyerSearchScreen extends StatelessWidget {
  const BuyerSearchScreen({
    super.key,
    required this.controller,
    required this.focusNode,
    required this.onQuery,
    required this.location,
    required this.onLocation,
    required this.category,
    required this.onCategory,
    required this.favorites,
    required this.onFavorite,
    this.onOpen,
  });
  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onQuery, onFavorite;
  final String location;
  final VoidCallback onLocation;
  final PropertyCategory? category;
  final ValueChanged<PropertyCategory?> onCategory;
  final Set<String> favorites;
  final ValueChanged<DemoProperty>? onOpen;
  @override
  Widget build(BuildContext context) {
    final results = filterDemoProperties(
      query: controller.text,
      location: location,
      category: category,
    );
    return BuyerPage(
      children: [
        Text(
          'Discover a place',
          style: Theme.of(context).textTheme.headlineLarge,
        ),
        const SizedBox(height: Space.md),
        TextField(
          key: const ValueKey('property-search'),
          controller: controller,
          focusNode: focusNode,
          textInputAction: TextInputAction.search,
          onChanged: onQuery,
          onSubmitted: (_) => focusNode.unfocus(),
          decoration: InputDecoration(
            labelText: 'Search demo properties',
            prefixIcon: const Icon(Icons.search),
            suffixIcon: controller.text.isEmpty
                ? null
                : IconButton(
                    tooltip: 'Clear search',
                    onPressed: () {
                      controller.clear();
                      onQuery('');
                    },
                    icon: const Icon(Icons.close),
                  ),
          ),
        ),
        const SizedBox(height: Space.md),
        TextButton.icon(
          onPressed: onLocation,
          icon: const Icon(Icons.location_on_outlined),
          label: Text('$location · Preview'),
        ),
        CategoryFilter(category: category, onChanged: onCategory),
        const SizedBox(height: Space.lg),
        Text(
          '${results.length} demo results',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: Space.md),
        if (results.isEmpty)
          const EmptySection(
            title: 'No demo matches',
            message: 'Try a different search, location or category.',
            icon: Icons.search_off,
          )
        else
          PropertyResults(
            properties: results,
            favorites: favorites,
            onFavorite: onFavorite,
            onOpen: onOpen,
          ),
      ],
    );
  }
}
