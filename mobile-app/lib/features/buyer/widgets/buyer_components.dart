import 'package:flutter/material.dart';
import '../../../theme/design_tokens.dart';
import '../data/demo_properties.dart';
import 'property_card.dart';

class BuyerPage extends StatelessWidget {
  const BuyerPage({
    super.key,
    required this.children,
    this.padding = const EdgeInsets.all(Space.lg),
  });
  final List<Widget> children;
  final EdgeInsetsGeometry padding;
  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
    padding: padding,
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
    this.compact = false,
  });
  final PropertyCategory? category;
  final ValueChanged<PropertyCategory?> onChanged;
  final bool compact;
  @override
  Widget build(BuildContext context) {
    final chips = [
      ChoiceChip(
        label: const Text('All'),
        selected: category == null,
        visualDensity: compact ? VisualDensity.compact : null,
        onSelected: (_) => onChanged(null),
      ),
      for (final value in PropertyCategory.values)
        ChoiceChip(
          label: Text(value.label),
          selected: category == value,
          visualDensity: compact ? VisualDensity.compact : null,
          onSelected: (selected) => onChanged(selected ? value : null),
        ),
    ];
    if (compact) {
      return SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            for (final chip in chips) ...[
              chip,
              const SizedBox(width: Space.sm),
            ],
          ],
        ),
      );
    }
    return Wrap(spacing: Space.sm, runSpacing: Space.sm, children: chips);
  }
}

class PropertyResults extends StatelessWidget {
  const PropertyResults({
    super.key,
    required this.properties,
    required this.favorites,
    required this.onFavorite,
    this.onOpen,
    this.grid = false,
  });
  final List<DemoProperty> properties;
  final Set<String> favorites;
  final ValueChanged<String> onFavorite;
  final ValueChanged<DemoProperty>? onOpen;
  final bool grid;
  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final columns =
          grid &&
          constraints.maxWidth >= 340 &&
          MediaQuery.textScalerOf(context).scale(14) <= 18;
      return Wrap(
        spacing: Space.md,
        children: [
          for (final property in properties)
            SizedBox(
              width: columns
                  ? (constraints.maxWidth - Space.md) / 2
                  : constraints.maxWidth,
              child: PropertyCard(
                property: property,
                saved: favorites.contains(property.id),
                onFavorite: () => onFavorite(property.id),
                onOpen: onOpen == null ? null : () => onOpen!(property),
              ),
            ),
        ],
      );
    },
  );
}
