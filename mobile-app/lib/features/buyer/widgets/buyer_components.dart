import 'package:flutter/material.dart';
import '../../../theme/design_tokens.dart';
import '../data/demo_properties.dart';
import 'property_card.dart';

class BuyerPage extends StatelessWidget {
  const BuyerPage({super.key, required this.children});
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
    padding: const EdgeInsets.all(Space.lg),
    child: Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 640),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: children,
        ),
      ),
    ),
  );
}

class EmptySection extends StatelessWidget {
  const EmptySection({
    super.key,
    required this.title,
    required this.message,
    this.icon = Icons.home_outlined,
  });
  final String title, message;
  final IconData icon;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(Space.lg),
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.surfaceContainerLowest,
      borderRadius: BorderRadius.circular(AppShape.radius),
      border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
    ),
    child: Column(
      children: [
        Icon(icon, size: 36, color: Theme.of(context).colorScheme.primary),
        const SizedBox(height: Space.md),
        Text(
          title,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: Space.sm),
        Text(message, textAlign: TextAlign.center),
      ],
    ),
  );
}

class CategoryFilter extends StatelessWidget {
  const CategoryFilter({
    super.key,
    required this.category,
    required this.onChanged,
  });
  final PropertyCategory? category;
  final ValueChanged<PropertyCategory?> onChanged;
  @override
  Widget build(BuildContext context) => Wrap(
    spacing: Space.sm,
    runSpacing: Space.sm,
    children: [
      ChoiceChip(
        label: const Text('All'),
        selected: category == null,
        onSelected: (_) => onChanged(null),
      ),
      for (final value in PropertyCategory.values)
        ChoiceChip(
          label: Text(value.label),
          selected: category == value,
          onSelected: (selected) => onChanged(selected ? value : null),
        ),
    ],
  );
}

class PropertyResults extends StatelessWidget {
  const PropertyResults({
    super.key,
    required this.properties,
    required this.favorites,
    required this.onFavorite,
    this.onOpen,
  });
  final List<DemoProperty> properties;
  final Set<String> favorites;
  final ValueChanged<String> onFavorite;
  final ValueChanged<DemoProperty>? onOpen;
  @override
  Widget build(BuildContext context) => Column(
    children: [
      for (final property in properties)
        PropertyCard(
          property: property,
          saved: favorites.contains(property.id),
          onFavorite: () => onFavorite(property.id),
          onOpen: onOpen == null ? null : () => onOpen!(property),
        ),
    ],
  );
}
