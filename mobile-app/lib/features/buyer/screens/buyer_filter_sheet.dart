import 'package:flutter/material.dart';
import '../data/buyer_filters.dart';
import '../data/demo_properties.dart';

class BuyerFilterSheet extends StatefulWidget {
  const BuyerFilterSheet({super.key, required this.initial});
  final BuyerFilters initial;
  @override
  State<BuyerFilterSheet> createState() => _BuyerFilterSheetState();
}

class _BuyerFilterSheetState extends State<BuyerFilterSheet> {
  PropertyCategory? category;
  late String location;
  int? bedrooms, maxAmount;
  Furnishing? furnishing;
  void selectCategory(PropertyCategory? next) => setState(() {
    maxAmount = budgetAfterCategoryChange(category, next, maxAmount);
    category = next;
  });
  double get budgetCeiling =>
      category == PropertyCategory.rent ||
          category == PropertyCategory.commercial
      ? 100000
      : 20000000;
  @override
  void initState() {
    super.initState();
    category = widget.initial.category;
    location = widget.initial.location;
    bedrooms = widget.initial.bedrooms;
    maxAmount = widget.initial.maxAmount;
    furnishing = widget.initial.furnishing;
  }

  @override
  Widget build(BuildContext context) => SafeArea(
    child: SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(
        24,
        16,
        24,
        24 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Filters',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Text('Property category'),
          Wrap(
            spacing: 8,
            children: [
              ChoiceChip(
                label: const Text('All'),
                selected: category == null,
                onSelected: (_) => selectCategory(null),
              ),
              for (final value in PropertyCategory.values)
                ChoiceChip(
                  label: Text(value.label),
                  selected: category == value,
                  onSelected: (_) => selectCategory(value),
                ),
            ],
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            isExpanded: true,
            initialValue: location,
            decoration: const InputDecoration(labelText: 'Location'),
            items: [
              for (final city in ['All locations', 'Kochi', 'Dubai'])
                DropdownMenuItem(value: city, child: Text(city)),
            ],
            onChanged: (v) => setState(() => location = v!),
          ),
          const SizedBox(height: 16),
          Text(
            maxAmount == null
                ? 'Budget: any listed amount'
                : 'Maximum listed amount: ₹$maxAmount',
          ),
          const Text(
            'Sale prices are totals; rental prices are per month. Select a category for meaningful comparisons.',
          ),
          Slider(
            value: (maxAmount?.toDouble() ?? budgetCeiling).clamp(
              0,
              budgetCeiling,
            ),
            min: 0,
            max: budgetCeiling,
            divisions: 100,
            onChanged: (v) => setState(() => maxAmount = v.round()),
          ),
          const Text('Bedrooms'),
          Wrap(
            spacing: 8,
            children: [
              ChoiceChip(
                label: const Text('Any'),
                selected: bedrooms == null,
                onSelected: (_) => setState(() => bedrooms = null),
              ),
              for (final count in [1, 2, 3, 4])
                ChoiceChip(
                  label: Text('$count'),
                  selected: bedrooms == count,
                  onSelected: (_) => setState(() => bedrooms = count),
                ),
            ],
          ),
          DropdownButtonFormField<Furnishing>(
            key: ValueKey(furnishing),
            isExpanded: true,
            initialValue: furnishing,
            decoration: const InputDecoration(labelText: 'Furnishing'),
            items: [
              const DropdownMenuItem(
                value: null,
                child: Text('Any furnishing'),
              ),
              for (final value in Furnishing.values)
                DropdownMenuItem(value: value, child: Text(value.label)),
            ],
            onChanged: (value) => setState(() => furnishing = value),
          ),
          const Text(
            'Specific furnishing selections exclude missing or unknown information.',
          ),
          const Text(
            'Demo filters only. No live listing status or map data is available.',
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 16,
            runSpacing: 8,
            children: [
              TextButton(
                onPressed: () => setState(() {
                  category = null;
                  location = 'All locations';
                  bedrooms = null;
                  maxAmount = null;
                  furnishing = null;
                }),
                child: const Text('Reset'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(
                  context,
                  BuyerFilters(
                    category: category,
                    location: location,
                    maxAmount: maxAmount,
                    bedrooms: bedrooms,
                    furnishing: furnishing,
                  ),
                ),
                child: const Text('Apply Filters'),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}
